// src/pages/paciente/PacienteCitas.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import "../../styles/pacienteCitas.css";

export default function PacienteCitas({ user }) {
  const online = useOnlineStatus();

  const [psicologos, setPsicologos] = useState([]);
  const [citas, setCitas] = useState([]);

  const [selectedPsicoId, setSelectedPsicoId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  // Helper para formatear fecha
  const formatFecha = (isoDate) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString("es-PE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return isoDate;
    }
  };

  const estadoLabel = {
    pendiente: "Pendiente",
    aceptada: "Aceptada",
    rechazada: "Rechazada",
    cancelada: "Cancelada",
    atendida: "Atendida",
  };

  const estadoClass = (estado) => {
    switch (estado) {
      case "aceptada":
        return "cita-status cita-status--aceptada";
      case "atendida":
        return "cita-status cita-status--atendida";
      case "rechazada":
      case "cancelada":
        return "cita-status cita-status--cancelada";
      default:
        return "cita-status cita-status--pendiente";
    }
  };

  const getPsicologo = (id) =>
    psicologos.find((p) => p.id === id) || null;

  // Construir slots de 1 hora entre [inicio, fin)
  const buildSlots = (start, end) => {
    // start/end en formato "HH:MM"
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    const slots = [];
    // cada cita dura 1h → último inicio debe terminar antes o justo en hora_fin
    for (let m = startMin; m + 60 <= endMin; m += 60) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  };

  // 1) Cargar citas y lista de psicólogos
  useEffect(() => {
    const loadFromLocal = () => {
      const localRaw = localStorage.getItem("pacienteCitasLocal");
      if (localRaw) {
        try {
          const localData = JSON.parse(localRaw);
          if (localData && localData.id === user.id && Array.isArray(localData.citas)) {
            setCitas(localData.citas);
          }
        } catch (e) {
          console.error("Error parseando pacienteCitasLocal:", e);
        }
      }
    };

    const fetchData = async () => {
      setLoading(true);
      setErrorMsg("");
      loadFromLocal(); // mostramos algo mientras pedimos al server

      if (!online) {
        setLoading(false);
        return;
      }

      try {
        // psicólogos disponibles
        const { data: psData, error: psError } = await supabase
          .from("psicologos")
          .select("id, nombre, especialidad");

        console.log("psData:", psData);
        console.log("psError:", psError);

        if (psError) {
          console.error("Error cargando psicólogos:", psError);
        }
        setPsicologos(psData || []);


        // citas del paciente
        const { data: citasData, error: citasError } = await supabase
          .from("citas")
          .select("id, psicologo_id, fecha, hora, motivo, estado")
          .eq("paciente_id", user.id)
          .order("fecha", { ascending: true })
          .order("hora", { ascending: true });

        if (citasError) {
          console.error("Error cargando citas:", citasError);
          setErrorMsg("No se pudieron cargar tus citas desde el servidor.");
        }

        if (citasData) {
          setCitas(citasData);
          const localPayload = {
            id: user.id,
            citas: citasData,
          };
          localStorage.setItem(
            "pacienteCitasLocal",
            JSON.stringify(localPayload)
          );
        }
      } catch (e) {
        console.error("Error general cargando citas:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [online, user.id]);

  // 2) Calcular horas disponibles según psicólogo + fecha + horarios + citas ocupadas
  useEffect(() => {
    const computeSlots = async () => {
      setAvailableSlots([]);
      setHora("");
      setErrorMsg("");
      if (!online) return;
      if (!selectedPsicoId || !fecha) return;

      // No permitir fechas pasadas
      const hoy = new Date();
      const hoySinHora = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate()
      );
      const fechaSel = new Date(fecha + "T00:00:00");

      if (fechaSel < hoySinHora) {
        setErrorMsg("No puedes agendar una cita en una fecha pasada.");
        return;
      }

      setLoadingSlots(true);

      try {
        // Día de la semana (0 = domingo)
        const diaSemana = fechaSel.getDay();

        // Horario del psicólogo para ese día
        const { data: horario, error: horarioError } = await supabase
          .from("horarios_psicologo")
          .select("hora_inicio, hora_fin, activo")
          .eq("psicologo_id", selectedPsicoId)
          .eq("dia_semana", diaSemana)
          .maybeSingle();

        if (horarioError) {
          console.error("Error cargando horario del psicólogo:", horarioError);
          setLoadingSlots(false);
          return;
        }

        if (!horario || !horario.activo) {
          setErrorMsg("Ese día el psicólogo no atiende.");
          setAvailableSlots([]);
          setLoadingSlots(false);
          return;
        }

        const inicio = (horario.hora_inicio || "09:00:00").slice(0, 5); // "HH:MM"
        const fin = (horario.hora_fin || "18:00:00").slice(0, 5);

        let slots = buildSlots(inicio, fin);
        if (slots.length === 0) {
          setErrorMsg("No se encontraron horas válidas para ese día.");
          setAvailableSlots([]);
          setLoadingSlots(false);
          return;
        }

        // Citas ya tomadas (pendientes o aceptadas)
        const { data: citasDia, error: citasError } = await supabase
          .from("citas")
          .select("hora, estado")
          .eq("psicologo_id", selectedPsicoId)
          .eq("fecha", fecha)
          .in("estado", ["pendiente", "aceptada"]);

        if (citasError) {
          console.error("Error consultando citas del día:", citasError);
        }

        const ocupadas = new Set(
          (citasDia || [])
            .map((c) =>
              typeof c.hora === "string" ? c.hora.slice(0, 5) : ""
            )
            .filter(Boolean)
        );

        const disponibles = slots.filter((h) => !ocupadas.has(h));

        setAvailableSlots(disponibles);

        if (disponibles.length === 0) {
          setErrorMsg("No quedan horas libres para ese día.");
        } else {
          setHora(disponibles[0]);
        }
      } catch (e) {
        console.error("Error calculando horas disponibles:", e);
      } finally {
        setLoadingSlots(false);
      }
    };

    computeSlots();
  }, [selectedPsicoId, fecha, online]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");

    if (!online) {
      setErrorMsg("No puedes agendar una cita estando offline.");
      return;
    }

    if (!selectedPsicoId) {
      setErrorMsg("Selecciona un psicólogo.");
      return;
    }

    if (!fecha) {
      setErrorMsg("Selecciona una fecha.");
      return;
    }

    if (!hora) {
      setErrorMsg("Selecciona una hora disponible.");
      return;
    }

    if (!motivo.trim()) {
      setErrorMsg("Describe brevemente el motivo de la consulta.");
      return;
    }

    // Validar que fecha + hora no estén en el pasado
    try {
      const ahora = new Date();
      const fechaHoraSel = new Date(`${fecha}T${hora}:00`);
      if (fechaHoraSel < ahora) {
        setErrorMsg(
          "No puedes agendar una cita en una fecha u hora que ya pasó."
        );
        return;
      }
    } catch {
      // si algo falla, no bloqueamos, pero idealmente no pasa
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("citas")
        .insert({
          paciente_id: user.id,
          psicologo_id: selectedPsicoId,
          fecha,
          hora: `${hora}:00`, // columna time en BD
          motivo: motivo.trim(),
          estado: "pendiente",
        })
        .select("*")
        .single();

      if (error) {
        console.error("Error creando cita:", error);
        if (error.code === "23505") {
          setErrorMsg(
            "Ese horario ya fue tomado. Actualiza la página y elige otra hora."
          );
        } else {
          setErrorMsg("No se pudo crear la cita. Intenta nuevamente.");
        }
        return;
      }

      const updatedCitas = [...citas, data].sort((a, b) => {
        if (a.fecha === b.fecha) {
          return a.hora.localeCompare(b.hora);
        }
        return a.fecha.localeCompare(b.fecha);
      });

      setCitas(updatedCitas);

      localStorage.setItem(
        "pacienteCitasLocal",
        JSON.stringify({ id: user.id, citas: updatedCitas })
      );

      setMotivo("");
      setMsg(
        "Cita creada correctamente. Quedará como pendiente hasta que el psicólogo la revise."
      );
    } catch (err) {
      console.error("Error en handleSubmit cita:", err);
      setErrorMsg("Ocurrió un problema al crear la cita.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="citas-container">
      <h3 className="citas-title">Citas</h3>

      {!online && (
        <p className="citas-offline">
          Estás en modo offline. Solo podrás ver tus citas guardadas en este
          dispositivo, no agendar nuevas.
        </p>
      )}

      <p className="citas-hint">
        Desde aquí puedes agendar una nueva cita con un psicólogo y revisar el
        estado de tus citas (pendientes, aceptadas, atendidas, etc.).
      </p>

      {msg && <p className="perfil-msg-success">{msg}</p>}
      {errorMsg && <p className="perfil-msg-error">{errorMsg}</p>}

      {/* FORMULARIO PARA AGENDAR CITA */}
      <form onSubmit={handleSubmit} className="citas-form">
        <div className="citas-row">
          <label className="citas-label">Psicólogo</label>
          <select
            value={selectedPsicoId}
            onChange={(e) => setSelectedPsicoId(e.target.value)}
            className="citas-select"
            disabled={!online || psicologos.length === 0}
          >
            <option value="">Selecciona un psicólogo...</option>
            {psicologos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {p.especialidad ? ` — ${p.especialidad}` : ""}
              </option>
            ))}
          </select>
          {online && psicologos.length === 0 && (
            <span className="citas-help">
              No hay psicólogos registrados aún.
            </span>
          )}
        </div>

        <div className="citas-row">
          <label className="citas-label">Fecha</label>
          <input
            type="date"
            min={todayStr}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="citas-input"
            disabled={!online}
          />
        </div>

        <div className="citas-row">
          <label className="citas-label">Hora</label>
          {loadingSlots ? (
            <p className="citas-help">Cargando horas disponibles...</p>
          ) : (
            <select
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="citas-select"
              disabled={!online || availableSlots.length === 0}
            >
              <option value="">
                {availableSlots.length === 0
                  ? "Selecciona psicólogo y fecha"
                  : "Selecciona una hora..."}
              </option>
              {availableSlots.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="citas-row">
          <label className="citas-label">Motivo de la consulta</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="citas-textarea"
            rows={3}
            placeholder="Ejemplo: ansiedad, problemas de sueño, estrés académico, etc."
            disabled={!online}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !online}
          className={`perfil-button ${saving || !online ? "perfil-button-disabled" : ""
            }`}
        >
          {saving ? "Creando cita..." : "Agendar cita"}
        </button>
      </form>

      <hr className="citas-divider" />

      {/* LISTADO DE CITAS */}
      <h4 className="citas-subtitle">Mis citas</h4>

      {loading ? (
        <p className="citas-help">Cargando tus citas...</p>
      ) : citas.length === 0 ? (
        <p className="citas-empty">
          Aún no tienes citas registradas. Usa el formulario de arriba para
          agendar tu primera cita.
        </p>
      ) : (
        <div className="citas-list">
          {citas.map((cita) => {
            const psi = getPsicologo(cita.psicologo_id);
            return (
              <div key={cita.id} className="cita-card">
                <div className="cita-header">
                  <div>
                    <div className="cita-psych-name">
                      {psi?.nombre || "Psicólogo"}
                    </div>
                    {psi?.especialidad && (
                      <div className="cita-psych-speciality">
                        {psi.especialidad}
                      </div>
                    )}
                  </div>
                  <span className={estadoClass(cita.estado)}>
                    {estadoLabel[cita.estado] || cita.estado}
                  </span>
                </div>

                <div className="cita-meta">
                  <span>{formatFecha(cita.fecha)}</span>
                  <span>{(cita.hora || "").slice(0, 5)}</span>
                </div>

                {cita.motivo && (
                  <p className="cita-motivo">{cita.motivo}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

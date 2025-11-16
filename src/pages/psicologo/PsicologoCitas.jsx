// src/pages/psicologo/PsicologoCitas.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import "../../styles/pacienteCitas.css"; // reutilizamos estilos de citas

const estadoLabel = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  cancelada: "Cancelada",
  atendida: "Atendida",
};

const estadoClass = (estado) => {
  switch (estado) {
    case "aceptada":
      return "cita-status cita-status--aceptada";
    case "atendida":
      return "cita-status cita-status--atendida";
    case "cancelada":
      return "cita-status cita-status--cancelada";
    default:
      return "cita-status cita-status--pendiente";
  }
};

const sortCitas = (arr) =>
  [...arr].sort((a, b) => {
    if (a.fecha === b.fecha) {
      return (a.hora || "").localeCompare(b.hora || "");
    }
    return (a.fecha || "").localeCompare(b.fecha || "");
  });

const formatFecha = (isoDate) => {
  if (!isoDate) return "";
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

export default function PsicologoCitas({ user }) {
  const online = useOnlineStatus();

  const [citas, setCitas] = useState([]);
  const [pacientesMap, setPacientesMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const getPaciente = (id) => pacientesMap[id] || null;

  const persistLocal = (newCitas, mapPacientes = pacientesMap) => {
    try {
      localStorage.setItem(
        "psicologoCitasLocal",
        JSON.stringify({
          id: user.id,
          citas: newCitas,
          pacientes: Object.values(mapPacientes),
        })
      );
    } catch (e) {
      console.error("Error guardando psicologoCitasLocal:", e);
    }
  };

  // 1) Cargar desde localStorage + luego refrescar desde Supabase
  useEffect(() => {
    const loadFromLocal = () => {
      const raw = localStorage.getItem("psicologoCitasLocal");
      if (!raw) return;
      try {
        const localData = JSON.parse(raw);
        if (!localData || localData.id !== user.id) return;

        if (Array.isArray(localData.citas)) {
          setCitas(sortCitas(localData.citas));
        }

        if (Array.isArray(localData.pacientes)) {
          const map = {};
          localData.pacientes.forEach((p) => {
            if (p && p.id) {
              map[p.id] = p;
            }
          });
          setPacientesMap(map);
        }
      } catch (e) {
        console.error("Error parseando psicologoCitasLocal:", e);
      }
    };

    const fetchData = async () => {
      setLoading(true);
      setErrorMsg("");
      loadFromLocal(); // mostrar algo mientras pedimos al servidor

      if (!online) {
        setLoading(false);
        return;
      }

      try {
        // 1) Citas del psicólogo
        const { data: citasData, error: citasError } = await supabase
          .from("citas")
          .select("id, paciente_id, fecha, hora, motivo, estado")
          .eq("psicologo_id", user.id)
          .order("fecha", { ascending: true })
          .order("hora", { ascending: true });

        if (citasError) {
          console.error("Error cargando citas del psicólogo:", citasError);
          setErrorMsg("No se pudieron cargar tus citas desde el servidor.");
        }

        const safeCitas = citasData || [];
        setCitas(sortCitas(safeCitas));

        // 2) Datos básicos de los pacientes de esas citas
        let newPacientesMap = {};
        const pacienteIds = [
          ...new Set(
            safeCitas
              .map((c) => c.paciente_id)
              .filter((id) => typeof id === "string" && id.length > 0)
          ),
        ];

        if (pacienteIds.length > 0) {
          const { data: pacData, error: pacError } = await supabase
            .from("pacientes")
            .select("id, nombre, apellidos, edad, telefono, sexo")
            .in("id", pacienteIds);

          if (pacError) {
            console.error("Error cargando pacientes:", pacError);
          } else if (pacData) {
            pacData.forEach((p) => {
              if (p && p.id) {
                newPacientesMap[p.id] = p;
              }
            });
          }
        }

        setPacientesMap(newPacientesMap);
        persistLocal(safeCitas, newPacientesMap);
      } catch (e) {
        console.error("Error general cargando citas del psicólogo:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [online, user.id]); // se recarga cuando cambia el estado online

  // 2) Cambiar estado de una cita (aceptar / atender / cancelar)
  const handleCambiarEstado = async (cita, nuevoEstado) => {
    setMsg("");
    setErrorMsg("");

    if (!online) {
      setErrorMsg("No puedes cambiar el estado de la cita estando offline.");
      return;
    }

    setSavingId(cita.id);
    try {
      const { data, error } = await supabase
        .from("citas")
        .update({ estado: nuevoEstado })
        .eq("id", cita.id)
        .eq("psicologo_id", user.id)
        .select("id, paciente_id, fecha, hora, motivo, estado")
        .single();

      if (error) {
        console.error("Error cambiando estado de la cita:", error);
        setErrorMsg("No se pudo actualizar la cita. Intenta nuevamente.");
        return;
      }

      const newCitas = sortCitas(
        citas.map((c) =>
          c.id === cita.id ? { ...c, estado: data.estado } : c
        )
      );

      setCitas(newCitas);
      persistLocal(newCitas);
      setMsg(
        `Cita actualizada a "${estadoLabel[data.estado] || data.estado}".`
      );
    } catch (err) {
      console.error("Error en handleCambiarEstado:", err);
      setErrorMsg("Ocurrió un problema al actualizar la cita.");
    } finally {
      setSavingId(null);
    }
  };

  // 3) Eliminar una cita
  const handleEliminar = async (citaId) => {
    setMsg("");
    setErrorMsg("");

    if (!online) {
      setErrorMsg("No puedes eliminar citas estando offline.");
      return;
    }

    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar esta cita? Esta acción no se puede deshacer."
    );
    if (!confirmar) return;

    setSavingId(citaId);
    try {
      const { error } = await supabase
        .from("citas")
        .delete()
        .eq("id", citaId)
        .eq("psicologo_id", user.id);

      if (error) {
        console.error("Error eliminando cita:", error);
        setErrorMsg("No se pudo eliminar la cita. Intenta nuevamente.");
        return;
      }

      const newCitas = citas.filter((c) => c.id !== citaId);
      setCitas(newCitas);
      persistLocal(newCitas);
      setMsg("Cita eliminada correctamente.");
    } catch (err) {
      console.error("Error en handleEliminar:", err);
      setErrorMsg("Ocurrió un problema al eliminar la cita.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="citas-container">
      <h3 className="citas-title">Citas con tus pacientes</h3>

      {!online && (
        <p className="citas-offline">
          Estás en modo offline. Solo podrás ver las citas guardadas en este
          dispositivo, no modificar su estado.
        </p>
      )}

      <p className="citas-hint">
        Aquí puedes revisar las citas que tus pacientes han agendado y cambiar
        su estado: aceptar, marcar como atendida, cancelar o eliminar.
      </p>

      {msg && <p className="perfil-msg-success">{msg}</p>}
      {errorMsg && <p className="perfil-msg-error">{errorMsg}</p>}

      <h4 className="citas-subtitle">Mis citas</h4>

      {loading ? (
        <p className="citas-help">Cargando tus citas...</p>
      ) : citas.length === 0 ? (
        <p className="citas-empty">
          Aún no tienes citas registradas. Cuando los pacientes agenden, las
          verás aquí.
        </p>
      ) : (
        <div className="citas-list">
          {citas.map((cita) => {
            const paciente = getPaciente(cita.paciente_id);
            const nombreCompleto = paciente
              ? `${paciente.nombre || ""}${
                  paciente.apellidos ? " " + paciente.apellidos : ""
                }`.trim() || "Paciente"
              : "Paciente";

            const infoLinea = paciente
              ? [
                  paciente.edad ? `${paciente.edad} años` : null,
                  paciente.sexo
                    ? paciente.sexo === "masculino"
                      ? "Masculino"
                      : paciente.sexo === "femenino"
                      ? "Femenino"
                      : paciente.sexo
                    : null,
                  paciente.telefono || null,
                ]
                  .filter(Boolean)
                  .join(" • ")
              : null;

            const deshabilitado = savingId === cita.id || !online;

            return (
              <div key={cita.id} className="cita-card">
                <div className="cita-header">
                  <div>
                    <div className="cita-psych-name">{nombreCompleto}</div>
                    {infoLinea && (
                      <div className="cita-psych-speciality">{infoLinea}</div>
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

                <div
                  className="cita-actions"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {cita.estado === "pendiente" && (
                    <button
                      type="button"
                      className="perfil-button"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      disabled={deshabilitado}
                      onClick={() =>
                        handleCambiarEstado(cita, "aceptada")
                      }
                    >
                      {savingId === cita.id
                        ? "Actualizando..."
                        : "Aceptar"}
                    </button>
                  )}

                  {cita.estado === "aceptada" && (
                    <button
                      type="button"
                      className="perfil-button"
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        background: "#10b981",
                      }}
                      disabled={deshabilitado}
                      onClick={() =>
                        handleCambiarEstado(cita, "atendida")
                      }
                    >
                      {savingId === cita.id
                        ? "Actualizando..."
                        : "Marcar atendida"}
                    </button>
                  )}

                  {(cita.estado === "pendiente" ||
                    cita.estado === "aceptada") && (
                    <button
                      type="button"
                      className="perfil-button"
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        background: "#f97316",
                      }}
                      disabled={deshabilitado}
                      onClick={() =>
                        handleCambiarEstado(cita, "cancelada")
                      }
                    >
                      {savingId === cita.id
                        ? "Actualizando..."
                        : "Cancelar"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="perfil-button perfil-button-disabled"
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      background: "#ef4444",
                      color: "#fff",
                    }}
                    disabled={deshabilitado}
                    onClick={() => handleEliminar(cita.id)}
                  >
                    {savingId === cita.id
                      ? "Eliminando..."
                      : "Eliminar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

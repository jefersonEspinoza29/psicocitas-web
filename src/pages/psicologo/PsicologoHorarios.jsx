// src/pages/psicologo/PsicologoHorarios.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import "../../styles/psicologoHorarios.css";

const DIAS_SEMANA = [
  { key: 1, label: "Lunes" },
  { key: 2, label: "Martes" },
  { key: 3, label: "Miércoles" },
  { key: 4, label: "Jueves" },
  { key: 5, label: "Viernes" },
  { key: 6, label: "Sábado" },
  { key: 0, label: "Domingo" }, // opcional
];

function buildInitialHorarios() {
  const base = {};
  DIAS_SEMANA.forEach((d) => {
    base[d.key] = {
      activo: false,
      hora_inicio: "09:00",
      hora_fin: "18:00",
    };
  });
  return base;
}

export default function PsicologoHorarios({ user }) {
  const online = useOnlineStatus();

  const [horarios, setHorarios] = useState(buildInitialHorarios);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 1) Cargar desde localStorage (psicologoHorariosLocal) como base
  useEffect(() => {
    const localRaw = localStorage.getItem("psicologoHorariosLocal");
    if (localRaw) {
      try {
        const localData = JSON.parse(localRaw);
        if (localData && localData.id === user.id && localData.horarios) {
          setHorarios((prev) => ({
            ...prev,
            ...localData.horarios,
          }));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Error parseando psicologoHorariosLocal:", e);
      }
    }

    setLoading(false);
  }, [user.id]);

  // 2) Si hay cambios pendientes en offline y vuelve el internet, sincronizar (UPERT)
  useEffect(() => {
    const syncPending = async () => {
      const pendingRaw = localStorage.getItem("psicologoHorariosPending");
      if (!pendingRaw) return;

      let pending;
      try {
        pending = JSON.parse(pendingRaw);
      } catch {
        return;
      }

      if (!pending || pending.id !== user.id || !pending.horarios) return;

      try {
        // Construimos filas a upsertear según lo pendiente
        const rows = [];
        for (const diaKey of Object.keys(pending.horarios)) {
          const diaNum = Number(diaKey);
          const h = pending.horarios[diaKey];
          if (!h) continue;

          rows.push({
            psicologo_id: user.id,
            dia_semana: diaNum,
            hora_inicio: h.hora_inicio + ":00",
            hora_fin: h.hora_fin + ":00",
            activo: h.activo,
          });
        }

        if (rows.length > 0) {
          const { error: upsertError } = await supabase
            .from("horarios_psicologo")
            .upsert(rows, { onConflict: "psicologo_id,dia_semana" });

          if (upsertError) {
            console.error(
              "Error upserteando horarios pendientes (psicólogo):",
              upsertError
            );
            return;
          }
        }

        // Si todo bien, actualizamos localStorage oficial y limpiamos pending
        const newLocal = {
          id: user.id,
          horarios: pending.horarios,
        };
        localStorage.setItem(
          "psicologoHorariosLocal",
          JSON.stringify(newLocal)
        );
        localStorage.removeItem("psicologoHorariosPending");

        setHorarios(pending.horarios);
        setMsg("Horarios sincronizados con el servidor.");
      } catch (e) {
        console.error("Error en syncPending horarios (psicólogo):", e);
      }
    };

    if (online) {
      syncPending();
    }
  }, [online, user.id]);

  // 3) Cuando haya internet y NO haya cambios pendientes, traer datos frescos de Supabase
  useEffect(() => {
    const fetchHorarios = async () => {
      if (!online) return;

      const pendingRaw = localStorage.getItem("psicologoHorariosPending");
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          if (pending && pending.id === user.id) {
            // Dejamos que el efecto de syncPending maneje eso
            return;
          }
        } catch {
          // seguimos normal
        }
      }

      try {
        const { data, error } = await supabase
          .from("horarios_psicologo")
          .select("dia_semana, hora_inicio, hora_fin, activo")
          .eq("psicologo_id", user.id);

        if (error) {
          console.error("Error obteniendo horarios desde Supabase:", error);
          return;
        }

        if (!data || data.length === 0) return;

        setHorarios((prev) => {
          const base = { ...prev };
          data.forEach((row) => {
            const dia = row.dia_semana;
            const inicio =
              (row.hora_inicio && row.hora_inicio.slice(0, 5)) || "09:00";
            const fin =
              (row.hora_fin && row.hora_fin.slice(0, 5)) || "18:00";

            base[dia] = {
              activo: row.activo,
              hora_inicio: inicio,
              hora_fin: fin,
            };
          });
          return base;
        });

        const localPayload = {
          id: user.id,
          horarios: data.reduce((acc, row) => {
            const dia = row.dia_semana;
            acc[dia] = {
              activo: row.activo,
              hora_inicio: row.hora_inicio.slice(0, 5),
              hora_fin: row.hora_fin.slice(0, 5),
            };
            return acc;
          }, {}),
        };

        localStorage.setItem(
          "psicologoHorariosLocal",
          JSON.stringify(localPayload)
        );
      } catch (e) {
        console.error("Error en fetchHorarios (psicólogo):", e);
      }
    };

    fetchHorarios();
  }, [online, user.id]);

  const handleToggleDia = (diaKey) => {
    setHorarios((prev) => ({
      ...prev,
      [diaKey]: {
        ...prev[diaKey],
        activo: !prev[diaKey].activo,
      },
    }));
  };

  const handleChangeHora = (diaKey, field, value) => {
    setHorarios((prev) => ({
      ...prev,
      [diaKey]: {
        ...prev[diaKey],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");

    // Validaciones básicas
    for (const d of DIAS_SEMANA) {
      const h = horarios[d.key];
      if (!h) continue;

      if (h.activo) {
        if (!h.hora_inicio || !h.hora_fin) {
          setErrorMsg(
            `Completa hora de inicio y fin para ${d.label} o desactiva el día.`
          );
          return;
        }
        if (h.hora_inicio >= h.hora_fin) {
          setErrorMsg(
            `En ${d.label}, la hora de inicio debe ser menor que la hora de fin.`
          );
          return;
        }
      }
    }

    const payload = {
      id: user.id,
      horarios,
    };

    setSaving(true);

    // Guardar siempre en caché local
    try {
      localStorage.setItem(
        "psicologoHorariosLocal",
        JSON.stringify(payload)
      );
    } catch (e) {
      console.error("Error guardando psicologoHorariosLocal:", e);
    }

    // Si estamos offline → solo pendiente
    if (!online) {
      localStorage.setItem(
        "psicologoHorariosPending",
        JSON.stringify(payload)
      );
      setSaving(false);
      setMsg(
        "Horarios guardados en este dispositivo. Se sincronizarán cuando vuelvas a tener internet."
      );
      return;
    }

    // Online → actualizar Supabase vía UPSERT (sin delete previo)
    try {
      const rows = [];
      for (const d of DIAS_SEMANA) {
        const h = horarios[d.key];
        if (!h) continue;
        rows.push({
          psicologo_id: user.id,
          dia_semana: d.key,
          hora_inicio: h.hora_inicio + ":00",
          hora_fin: h.hora_fin + ":00",
          activo: h.activo,
        });
      }

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("horarios_psicologo")
          .upsert(rows, { onConflict: "psicologo_id,dia_semana" });

        if (upsertError) {
          console.error("Error upserteando horarios:", upsertError);
          localStorage.setItem(
            "psicologoHorariosPending",
            JSON.stringify(payload)
          );
          setErrorMsg(
            "No se pudieron guardar los horarios en el servidor. Tus cambios quedaron guardados localmente."
          );
          setSaving(false);
          return;
        }
      }

      // Si todo bien, limpiamos pending
      localStorage.removeItem("psicologoHorariosPending");
      setMsg("Horarios guardados correctamente.");
    } catch (err) {
      console.error("Error en handleSubmit (horarios, psicólogo):", err);
      localStorage.setItem(
        "psicologoHorariosPending",
        JSON.stringify(payload)
      );
      setErrorMsg(
        "Ocurrió un problema con la conexión. Tus cambios quedaron guardados localmente."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="horarios-container">Cargando horarios...</div>;
  }

  return (
    <div className="horarios-container">
      <h3 className="horarios-title">Horarios de atención</h3>

      {!online && (
        <p className="perfil-offline">
          Estás en modo offline. Los horarios se guardarán en este dispositivo y
          se enviarán cuando tengas internet.
        </p>
      )}

      <p className="horarios-hint">
        Marca los días en los que atiendes y define tu rango de horas. El
        sistema usará estos datos para permitir que los pacientes reserven solo
        en tus horarios disponibles.
      </p>

      {msg && <p className="perfil-msg-success">{msg}</p>}
      {errorMsg && <p className="perfil-msg-error">{errorMsg}</p>}

      <form onSubmit={handleSubmit} className="horarios-form">
        <div className="horarios-list">
          {DIAS_SEMANA.map((d) => {
            const h = horarios[d.key];
            return (
              <div key={d.key} className="horario-row">
                <label className="horario-dia">
                  <input
                    type="checkbox"
                    checked={h?.activo || false}
                    onChange={() => handleToggleDia(d.key)}
                    className="horario-checkbox"
                  />
                  <span>{d.label}</span>
                </label>

                <div className="horario-time-group">
                  <div className="horario-time-field">
                    <span>Inicio</span>
                    <input
                      type="time"
                      value={h?.hora_inicio || "09:00"}
                      onChange={(e) =>
                        handleChangeHora(d.key, "hora_inicio", e.target.value)
                      }
                      disabled={!h?.activo}
                    />
                  </div>

                  <div className="horario-time-field">
                    <span>Fin</span>
                    <input
                      type="time"
                      value={h?.hora_fin || "18:00"}
                      onChange={(e) =>
                        handleChangeHora(d.key, "hora_fin", e.target.value)
                      }
                      disabled={!h?.activo}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`perfil-button ${saving ? "perfil-button-disabled" : ""}`}
        >
          {saving ? "Guardando..." : "Guardar horarios"}
        </button>
      </form>
    </div>
  );
}

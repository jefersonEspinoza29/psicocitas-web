// src/pages/paciente/PacienteHome.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import "../../styles/pacienteCitas.css";

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

export default function PacienteHome({ user }) {
  const online = useOnlineStatus();

  const [psicologos, setPsicologos] = useState([]);
  const [citas, setCitas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const getPsicologo = (id) =>
    psicologos.find((p) => p.id === id) || null;

  const persistLocal = (newCitas) => {
    try {
      localStorage.setItem(
        "pacienteCitasLocal",
        JSON.stringify({ id: user.id, citas: newCitas })
      );
    } catch (e) {
      console.error("Error guardando pacienteCitasLocal:", e);
    }
  };

  // 1) Cargar citas desde localStorage + refrescar desde Supabase
  useEffect(() => {
    const loadFromLocal = () => {
      const raw = localStorage.getItem("pacienteCitasLocal");
      if (!raw) return;
      try {
        const localData = JSON.parse(raw);
        if (!localData || localData.id !== user.id) return;
        if (Array.isArray(localData.citas)) {
          setCitas(sortCitas(localData.citas));
        }
      } catch (e) {
        console.error("Error parseando pacienteCitasLocal:", e);
      }
    };

    const fetchData = async () => {
      setLoading(true);
      setErrorMsg("");
      loadFromLocal(); // mostramos algo mientras se consulta el servidor

      if (!online) {
        setLoading(false);
        return;
      }

      try {
        // 1) Psicólogos (para mostrar nombre/especialidad)
        const { data: psData, error: psError } = await supabase
          .from("psicologos")
          .select("id, nombre, especialidad");

        if (psError) {
          console.error("Error cargando psicólogos:", psError);
        }
        setPsicologos(psData || []);

        // 2) Citas del paciente
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

        const safeCitas = citasData || [];
        const ordenadas = sortCitas(safeCitas);
        setCitas(ordenadas);
        persistLocal(ordenadas);
      } catch (e) {
        console.error("Error general cargando citas en Home:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [online, user.id]);

  // 2) Obtener próximas citas (hoy en adelante)
  const ahora = new Date();
  const proximas = sortCitas(citas).filter((c) => {
    if (!c.fecha) return false;
    try {
      const d = new Date(
        `${c.fecha}T${(c.hora || "00:00").slice(0, 5)}:00`
      );
      // cita hoy o futura
      return d >= ahora;
    } catch {
      return false;
    }
  });

  const proximasLimit = proximas.slice(0, 5); // mostramos máximo 5

  return (
    <div className="citas-container">
      <h3 className="citas-title" style={{ marginTop: 0 }}>
        Inicio
      </h3>

      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 4 }}>
        Bienvenido(a), <strong>{user.nombre || "Paciente"}</strong>.
      </p>

      {!online && (
        <p className="citas-offline">
          Estás en modo offline. Aquí verás las citas guardadas en este
          dispositivo. Para ver la información más actualizada, conecta a
          internet.
        </p>
      )}

      <p className="citas-hint">
        En este apartado verás un resumen rápido de tus próximas citas con
        tus psicólogos. Para agendar nuevas o ver el historial completo,
        usa la pestaña <strong>"Citas"</strong>.
      </p>

      {errorMsg && <p className="perfil-msg-error">{errorMsg}</p>}

      <h4 className="citas-subtitle">Próximas citas</h4>

      {loading ? (
        <p className="citas-help">Cargando tus citas...</p>
      ) : proximasLimit.length === 0 ? (
        <p className="citas-empty">
          No tienes próximas citas agendadas. Puedes programar una desde la
          sección <strong>"Citas"</strong>.
        </p>
      ) : (
        <div className="citas-list">
          {proximasLimit.map((cita) => {
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

// src/pages/psicologo/PsicologoHome.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import "../../styles/pacienteCitas.css"; // reutilizamos los mismos estilos

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

export default function PsicologoHome({ user }) {
  const online = useOnlineStatus();

  const [pacientes, setPacientes] = useState([]);
  const [citas, setCitas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const getPaciente = (id) =>
    pacientes.find((p) => p.id === id) || null;

  const persistLocal = (newCitas) => {
    try {
      localStorage.setItem(
        "psicologoCitasLocal",
        JSON.stringify({ id: user.id, citas: newCitas })
      );
    } catch (e) {
      console.error("Error guardando psicologoCitasLocal:", e);
    }
  };

  // 1) Cargar citas desde localStorage + refrescar desde Supabase
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
      } catch (e) {
        console.error("Error parseando psicologoCitasLocal:", e);
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
        // 1) Citas del psicólogo
        const { data: citasData, error: citasError } = await supabase
          .from("citas")
          .select("id, paciente_id, fecha, hora, motivo, estado")
          .eq("psicologo_id", user.id)
          .order("fecha", { ascending: true })
          .order("hora", { ascending: true });

        if (citasError) {
          console.error("Error cargando citas (psicólogo):", citasError);
          setErrorMsg("No se pudieron cargar tus citas desde el servidor.");
        }

        const safeCitas = citasData || [];
        const ordenadas = sortCitas(safeCitas);
        setCitas(ordenadas);
        persistLocal(ordenadas);

        // 2) Pacientes relacionados a esas citas (solo los necesarios)
        const uniquePacienteIds = Array.from(
          new Set(safeCitas.map((c) => c.paciente_id).filter(Boolean))
        );

        if (uniquePacienteIds.length > 0) {
          const { data: pacientesData, error: pacientesError } =
            await supabase
              .from("pacientes")
              .select("id, nombre, edad, sexo, telefono")
              .in("id", uniquePacienteIds);

          if (pacientesError) {
            console.error("Error cargando pacientes:", pacientesError);
          } else {
            setPacientes(pacientesData || []);
          }
        } else {
          setPacientes([]);
        }
      } catch (e) {
        console.error("Error general cargando citas en PsicologoHome:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [online, user.id]);

  // 2) Próximas citas (hoy en adelante)
  const ahora = new Date();
  const proximas = sortCitas(citas).filter((c) => {
    if (!c.fecha) return false;
    try {
      const d = new Date(
        `${c.fecha}T${(c.hora || "00:00").slice(0, 5)}:00`
      );
      return d >= ahora;
    } catch {
      return false;
    }
  });

  const proximasLimit = proximas.slice(0, 5); // mostramos máximo 5

  // 3) Pequeño resumen numérico
  const totalPendientes = proximas.filter(
    (c) => c.estado === "pendiente"
  ).length;
  const totalAceptadas = proximas.filter(
    (c) => c.estado === "aceptada"
  ).length;

  return (
    <div className="citas-container">
      <h3 className="citas-title" style={{ marginTop: 0 }}>
        Inicio
      </h3>

      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 4 }}>
        Bienvenido, <strong>{user.nombre || user.email}</strong>.
      </p>

      {!online && (
        <p className="citas-offline">
          Estás en modo offline. Aquí verás las citas guardadas en este
          dispositivo. Para ver la información más actualizada, conecta a
          internet.
        </p>
      )}

      <p className="citas-hint">
        Aquí tienes un resumen rápido de tus próximas citas con pacientes.
        Para gestionar en detalle (aceptar, cancelar, marcar atendida, etc.),
        usa la pestaña <strong>"Citas"</strong>.
      </p>

      {errorMsg && <p className="perfil-msg-error">{errorMsg}</p>}

      {/* Resumen numérico simple */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#eef2ff",
            fontSize: 13,
          }}
        >
          Próximas citas: <strong>{proximas.length}</strong>
        </div>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#ecfdf5",
            fontSize: 13,
          }}
        >
          Pendientes: <strong>{totalPendientes}</strong>
        </div>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#eff6ff",
            fontSize: 13,
          }}
        >
          Aceptadas: <strong>{totalAceptadas}</strong>
        </div>
      </div>

      <h4 className="citas-subtitle">Próximas citas</h4>

      {loading ? (
        <p className="citas-help">Cargando tus citas...</p>
      ) : proximasLimit.length === 0 ? (
        <p className="citas-empty">
          No tienes próximas citas agendadas. Cuando los pacientes reserven en
          tus horarios, aparecerán aquí.
        </p>
      ) : (
        <div className="citas-list">
          {proximasLimit.map((cita) => {
            const pac = getPaciente(cita.paciente_id);
            return (
              <div key={cita.id} className="cita-card">
                <div className="cita-header">
                  <div>
                    <div className="cita-psych-name">
                      {pac?.nombre || "Paciente"}
                    </div>
                    {pac && (
                      <div className="cita-psych-speciality">
                        {/* usamos esta clase solo para estilo */}
                        {pac.edad ? `Edad: ${pac.edad} años` : ""}
                        {pac.sexo
                          ? `${pac.edad ? " · " : ""}Sexo: ${pac.sexo}`
                          : ""}
                        {pac.telefono
                          ? `${pac.edad || pac.sexo ? " · " : ""}Tel: ${
                              pac.telefono
                            }`
                          : ""}
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

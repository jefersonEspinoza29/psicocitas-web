// src/pages/DashboardPaciente.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import PacienteHome from "./paciente/PacienteHome";
import PacienteCitas from "./paciente/PacienteCitas";
import PacientePerfil from "./paciente/PacientePerfil";
import "../styles/dashboardPaciente.css";

export default function DashboardPaciente() {
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const [user, setUser] = useState(null);
  const [section, setSection] = useState("home"); // "home" | "citas" | "perfil"

  useEffect(() => {
    const raw = localStorage.getItem("userLogged");
    if (!raw) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(raw);

      if (!parsed || !parsed.rol) {
        localStorage.removeItem("userLogged");
        navigate("/login");
        return;
      }

      // Si no es paciente, lo sacamos
      if (parsed.rol !== "paciente") {
        if (parsed.rol === "psicologo") {
          navigate("/psicologo");
        } else {
          navigate("/login");
        }
        return;
      }

      setUser(parsed);
    } catch (e) {
      console.error("Error leyendo userLogged:", e);
      localStorage.removeItem("userLogged");
      navigate("/login");
    }
  }, [navigate]);

  if (!user) {
    // Puedes poner un spinner si quieres
    return null;
  }

  const renderSection = () => {
    switch (section) {
      case "home":
        return <PacienteHome user={user} />;
      case "citas":
        return <PacienteCitas user={user} />;
      case "perfil":
        return <PacientePerfil user={user} />;
      default:
        return <PacienteHome user={user} />;
    }
  };

  const tabBaseStyle = {
    flex: 1,
    padding: "8px 0",
    borderRadius: 999,
    border: "none",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    background: "#f3f4f6",
    color: "#4b5563",
  };

  const tabActiveStyle = {
    ...tabBaseStyle,
    background: "#111827",
    color: "#ffffff",
  };

  const handleLogout = () => {
    localStorage.removeItem("userLogged");
    localStorage.removeItem("pacienteLocal");
    // no borro offlineUsers para que siga sirviendo modo offline
    navigate("/login");
  };

  // 💊 Estilos del pill Online / Offline
  const statusStyle = online
    ? {
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 999,
        background: "#e5f8e9", // verde suave
        color: "#166534",      // verde fuerte
        border: "1px solid #bbf7d0",
      }
    : {
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 999,
        background: "#fee2e2", // rojo suave
        color: "#b91c1c",      // rojo fuerte
        border: "1px solid #fecaca",
      };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-card">
        {/* Header superior */}
        <div className="dashboard-header">
          <div>
            <h2 className="dashboard-title">Panel del paciente</h2>
            <p className="dashboard-subtitle">
              Hola, <strong>{user.nombre || "Paciente"}</strong>
            </p>
          </div>

          <div className="dashboard-header-right">
            <span
              className={`dashboard-status-pill ${
                online ? "online" : "offline"
              }`}
            >
              ● {online ? "Online" : "Offline"}
            </span>

            <button
              onClick={handleLogout}
              className="dashboard-logout-btn"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs">
          <button
            type="button"
            onClick={() => setSection("home")}
            className={`dashboard-tab ${
              section === "home" ? "dashboard-tab--active" : ""
            }`}
          >
            Inicio
          </button>
          <button
            type="button"
            onClick={() => setSection("citas")}
            className={`dashboard-tab ${
              section === "citas" ? "dashboard-tab--active" : ""
            }`}
          >
            Citas
          </button>
          <button
            type="button"
            onClick={() => setSection("perfil")}
            className={`dashboard-tab ${
              section === "perfil" ? "dashboard-tab--active" : ""
            }`}
          >
            Perfil
          </button>
        </div>

        {/* Contenido */}
        <div className="dashboard-content">{renderSection()}</div>
      </div>
    </div>
  );
}

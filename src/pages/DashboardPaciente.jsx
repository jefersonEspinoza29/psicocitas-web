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
    <div
      className="dashboard-wrapper"
      style={{
        minHeight: "100vh",
        padding: "16px",
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background:
          "radial-gradient(circle at top, #e5e7eb, var(--dashboard-bg, #f3f4f6))",
      }}
    >
      <div
        className="dashboard-card"
        style={{
          width: "100%",
          maxWidth: "960px",
          background: "var(--dashboard-card-bg, #ffffff)",
          borderRadius: "18px",
          boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
          padding: "18px 16px 22px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header superior */}
        <header
          className="dashboard-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: 10,
          }}
        >
          {/* Info usuario */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Avatar inicial */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "999px",
                background:
                  "linear-gradient(135deg, #4f46e5, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {(user.nombre || user.email || "P")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                }}
              >
                Panel del paciente
              </p>
              <p
                className="dashboard-subtitle"
                style={{
                  margin: "2px 0 0 0",
                  fontSize: 15,
                  color: "#111827",
                }}
              >
                Hola{" "}
                <strong>
                  {user.nombre?.trim() || "Paciente"}
                </strong>
              </p>
            </div>
          </div>

          {/* Estado + logout */}
          <div
            className="dashboard-header-right"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <span
              className={`dashboard-status-pill ${online ? "online" : "offline"
                }`}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: online
                  ? "1px solid rgba(16,185,129,0.3)"
                  : "1px solid rgba(148,163,184,0.5)",
                backgroundColor: online
                  ? "rgba(16,185,129,0.08)"
                  : "rgba(148,163,184,0.12)",
                color: online ? "#047857" : "#6b7280",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "999px",
                  backgroundColor: online ? "#10b981" : "#9ca3af",
                }}
              />
              {online ? "Conectado" : "Sin conexión"}
            </span>

            <button
              onClick={handleLogout}
              className="dashboard-logout-btn"
              style={{
                whiteSpace: "nowrap",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
                color: "#374151",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition:
                  "background 0.16s ease, transform 0.12s ease, box-shadow 0.16s ease",
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.97)")
              }
              onMouseUp={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav
          className="dashboard-tabs"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            background: "#f9fafb",
            borderRadius: "999px",
            padding: 4,
            overflowX: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setSection("home")}
            className={`dashboard-tab ${section === "home"
                ? "dashboard-tab--active"
                : ""
              }`}
            style={{
              flex: "1 1 auto",
              minWidth: 80,
              border: "none",
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: 13,
              background:
                section === "home"
                  ? "#ffffff"
                  : "transparent",
              boxShadow:
                section === "home"
                  ? "0 6px 14px rgba(15,23,42,0.08)"
                  : "none",
              color:
                section === "home"
                  ? "#111827"
                  : "#6b7280",
              cursor: "pointer",
              transition:
                "background 0.18s ease, box-shadow 0.18s ease, color 0.18s ease",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            Inicio
          </button>

          <button
            type="button"
            onClick={() => setSection("citas")}
            className={`dashboard-tab ${section === "citas"
                ? "dashboard-tab--active"
                : ""
              }`}
            style={{
              flex: "1 1 auto",
              minWidth: 80,
              border: "none",
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: 13,
              background:
                section === "citas"
                  ? "#ffffff"
                  : "transparent",
              boxShadow:
                section === "citas"
                  ? "0 6px 14px rgba(15,23,42,0.08)"
                  : "none",
              color:
                section === "citas"
                  ? "#111827"
                  : "#6b7280",
              cursor: "pointer",
              transition:
                "background 0.18s ease, box-shadow 0.18s ease, color 0.18s ease",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            Citas
          </button>

          <button
            type="button"
            onClick={() => setSection("perfil")}
            className={`dashboard-tab ${section === "perfil"
                ? "dashboard-tab--active"
                : ""
              }`}
            style={{
              flex: "1 1 auto",
              minWidth: 80,
              border: "none",
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: 13,
              background:
                section === "perfil"
                  ? "#ffffff"
                  : "transparent",
              boxShadow:
                section === "perfil"
                  ? "0 6px 14px rgba(15,23,42,0.08)"
                  : "none",
              color:
                section === "perfil"
                  ? "#111827"
                  : "#6b7280",
              cursor: "pointer",
              transition:
                "background 0.18s ease, box-shadow 0.18s ease, color 0.18s ease",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            Perfil
          </button>
        </nav>

        {/* Contenido */}
        <main
          className="dashboard-content"
          style={{
            marginTop: 4,
          }}
        >
          {renderSection()}
        </main>
      </div>
    </div>
  );



}

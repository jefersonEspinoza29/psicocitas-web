// src/pages/DashboardPsicologo.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { supabase } from "../supabaseClient";

import PsicologoHome from "./psicologo/PsicologoHome";
import PsicologoCitas from "./psicologo/PsicologoCitas";
import PsicologoHorarios from "./psicologo/PsicologoHorarios";
import PsicologoPerfil from "./psicologo/PsicologoPerfil";

export default function DashboardPsicologo() {
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const [user, setUser] = useState(null);
  const [section, setSection] = useState("home"); // "home" | "citas" | "horarios" | "perfil"

  // Cargar usuario desde localStorage y validar rol
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

      // Si no es psicólogo, lo redirigimos
      if (parsed.rol !== "psicologo") {
        if (parsed.rol === "paciente") {
          navigate("/paciente");
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
    return null; // o un spinner si quieres
  }

  const renderSection = () => {
    switch (section) {
      case "home":
        return <PsicologoHome user={user} />;
      case "citas":
        return <PsicologoCitas user={user} />;
      case "horarios":
        return <PsicologoHorarios user={user} />;
      case "perfil":
        return <PsicologoPerfil user={user} />;
      default:
        return <PsicologoHome user={user} />;
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

  const statusStyle = online
    ? {
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 999,
        background: "#e5f8e9", // verde suave
        color: "#166534", // verde fuerte
        border: "1px solid #bbf7d0",
      }
    : {
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 999,
        background: "#fee2e2", // rojo suave
        color: "#b91c1c", // rojo fuerte
        border: "1px solid #fecaca",
      };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // si falla por estar offline, no pasa nada
    }
    localStorage.removeItem("userLogged");
    localStorage.removeItem("psicologoLocal");
    navigate("/login");
  };

  return (
    <div
      style={{
        minWidth: 344,
        minHeight: 323,
        height: "100vh",
        background: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          minWidth: 344,
          background: "#ffffff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
          boxSizing: "border-box",
        }}
      >
        {/* Header superior */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 8,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Panel del psicólogo</h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              Hola, <strong>{user.nombre || "Psicólogo"}</strong>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={statusStyle}>● {online ? "Online" : "Offline"}</span>

            <button
              onClick={handleLogout}
              style={{
                border: "none",
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                background: "#f3f4f6",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "#e5e7eb",
            borderRadius: 999,
            padding: 2,
            marginBottom: 16,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => setSection("home")}
            style={section === "home" ? tabActiveStyle : tabBaseStyle}
          >
            Inicio
          </button>
          <button
            type="button"
            onClick={() => setSection("citas")}
            style={section === "citas" ? tabActiveStyle : tabBaseStyle}
          >
            Citas
          </button>
          <button
            type="button"
            onClick={() => setSection("horarios")}
            style={section === "horarios" ? tabActiveStyle : tabBaseStyle}
          >
            Horarios
          </button>
          <button
            type="button"
            onClick={() => setSection("perfil")}
            style={section === "perfil" ? tabActiveStyle : tabBaseStyle}
          >
            Perfil
          </button>
        </div>

        {/* Contenido */}
        <div
          style={{
            background: "#f9fafb",
            borderRadius: 10,
            padding: 16,
            minHeight: 180,
            boxSizing: "border-box",
          }}
        >
          {renderSection()}
        </div>
      </div>
    </div>
  );
}

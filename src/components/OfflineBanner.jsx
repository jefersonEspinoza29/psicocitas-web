// src/components/OfflineBanner.jsx
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null; // Si hay internet, no mostramos nada

  return (
    <div
      style={{
        backgroundColor: "#ffcc00",
        color: "#333",
        padding: "8px 16px",
        textAlign: "center",
        fontSize: 14,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
      }}
    >
      <strong>Modo offline activado.</strong> No tienes acceso a internet.{" "}
      <span>Algunas funciones pueden estar limitadas. Intenta reconectarte.</span>
    </div>
  );
}

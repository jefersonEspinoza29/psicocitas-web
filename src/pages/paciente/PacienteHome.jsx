// src/pages/paciente/PacienteHome.jsx
export default function PacienteHome({ user }) {
  return (
    <div>
      <h3 style={{ marginTop: 0, fontSize: 18 }}>Inicio</h3>
      <p style={{ fontSize: 14, color: "#4b5563" }}>
        Bienvenido(a), <strong>{user.nombre || "Paciente"}</strong>.
      </p>
      <p style={{ fontSize: 14, color: "#6b7280" }}>
        Aquí más adelante podrás ver un resumen rápido de tus próximas citas y
        recordatorios.
      </p>
    </div>
  );
}

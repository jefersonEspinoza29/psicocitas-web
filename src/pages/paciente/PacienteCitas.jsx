// src/pages/paciente/PacienteCitas.jsx
export default function PacienteCitas({ user }) {
  return (
    <div>
      <h3 style={{ marginTop: 0, fontSize: 18 }}>Citas</h3>
      <p style={{ fontSize: 14, color: "#6b7280" }}>
        Aquí verás tus citas con psicólogos: pendientes, aceptadas y atendidas.
      </p>
      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        (Más adelante: listado de citas, botón para agendar, filtros, etc.)
      </p>
    </div>
  );
}

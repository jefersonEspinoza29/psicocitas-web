// src/pages/psicologo/PsicologoHome.jsx
export default function PsicologoHome({ user }) {
  return (
    <div>
      <h3 style={{ marginTop: 0, fontSize: 18 }}>Inicio</h3>
      <p style={{ fontSize: 14, color: "#4b5563" }}>
        Aquí verás un resumen rápido de tus citas próximas y pendientes.
      </p>
      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        (Más adelante conectaremos esta sección con la tabla de citas en Supabase.)
      </p>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
        Bienvenido, <strong>{user.nombre || user.email}</strong>.
      </p>
    </div>
  );
}

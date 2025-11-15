// src/pages/psicologo/PsicologoHorarios.jsx
export default function PsicologoHorarios({ user }) {
  return (
    <div>
      <h3 style={{ marginTop: 0, fontSize: 18 }}>Horarios</h3>
      <p style={{ fontSize: 14, color: "#4b5563" }}>
        Aquí podrás definir tus horarios de atención y disponibilidad.
      </p>
      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        En una siguiente etapa conectaremos esta sección con las citas para que
        los pacientes solo reserven en tus horarios libres.
      </p>
    </div>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const userJson = localStorage.getItem("userLogged");
    if (!userJson) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(userJson);
    if (user.rol === "paciente") navigate("/paciente");
    else if (user.rol === "psicologo") navigate("/psicologo");
    else navigate("/login");
  }, [navigate]);

  return <p style={{ textAlign: "center", marginTop: 40 }}>Cargando...</p>;
}

import { Navigate, Outlet } from "react-router-dom";

export default function PrivateRoute({ allowedRoles }) {
  const userJson = localStorage.getItem("userLogged");
  const user = userJson ? JSON.parse(userJson) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.rol)) {
    if (user.rol === "paciente") return <Navigate to="/paciente" replace />;
    if (user.rol === "psicologo") return <Navigate to="/psicologo" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import DashboardPaciente from "./pages/DashboardPaciente.jsx";
import DashboardPsicologo from "./pages/DashboardPsicologo.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import OfflineBanner from "./components/OfflineBanner.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <OfflineBanner/>
      <Routes>
        <Route path="/" element={<App />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Solo pacientes */}
        <Route element={<PrivateRoute allowedRoles={["paciente"]} />}>
          <Route path="/paciente" element={<DashboardPaciente />} />
        </Route>

        {/* Solo psicólogos */}
        <Route element={<PrivateRoute allowedRoles={["psicologo"]} />}>
          <Route path="/psicologo" element={<DashboardPsicologo />} />
        </Route>

        {/* Rutas desconocidas */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      
    </BrowserRouter>
  </React.StrictMode>
);

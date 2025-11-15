// src/pages/Register.jsx
import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import "../styles/register.css";


export default function Register() {
    const navigate = useNavigate();
    const online = useOnlineStatus();

    const [nombre, setNombre] = useState("");
    const [rol, setRol] = useState("paciente");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [infoMsg, setInfoMsg] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setInfoMsg("");

        // Validaciones de frontend
        if (!nombre.trim() || !email.trim() || !password || !passwordConfirm) {
            setErrorMsg("Completa todos los campos.");
            return;
        }

        if (nombre.trim().length < 2) {
            setErrorMsg("El nombre debe tener al menos 2 caracteres.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setErrorMsg("Ingresa un correo válido.");
            return;
        }

        if (password.length < 6) {
            setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (password !== passwordConfirm) {
            setErrorMsg("Las contraseñas no coinciden.");
            return;
        }

        if (!online) {
            setErrorMsg("Necesitas conexión a internet para registrarte.");
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        nombre: nombre.trim(),
                        rol,
                    },
                },
            });

            if (error) throw error;

            const user = data.user;
            const session = data.session;

            if (!user) {
                throw new Error("No se pudo obtener el usuario creado.");
            }

            // Si tu proyecto tiene verificación de email activada,
            // Supabase suele devolver session = null.
            if (!session) {
                setInfoMsg(
                    "Registro exitoso. Te hemos enviado un correo de confirmación. " +
                    "Revisa tu bandeja (y spam) y luego inicia sesión."
                );
                // NO guardo userLogged ni offlineCreds aún, porque todavía no ha iniciado sesión.
                return;
            }

            // 👉 Insertar en la tabla correcta
            const tablaDestino = rol === "paciente" ? "pacientes" : "psicologos";

            const { error: errorPerfil } = await supabase.from(tablaDestino).insert({
                id: user.id,
                email: user.email,
                nombre: user.user_metadata?.nombre || nombre.trim(),
            });

            if (errorPerfil) throw errorPerfil;

            // Si hay sesión, lo tratamos como login inmediato
            const userLogged = {
                id: user.id,
                email: user.email,
                nombre: user.user_metadata?.nombre || "",
                rol: user.user_metadata?.rol || "paciente",
                tabla: tablaDestino,
            };

            // Guardamos para usar en toda la app
            localStorage.setItem("userLogged", JSON.stringify(userLogged));

            // Guardamos credenciales + datos para modo offline (demo)
            localStorage.setItem(
                "offlineCreds",
                JSON.stringify({
                    id: userLogged.id,
                    email: userLogged.email.toLowerCase(), // 👈 normalizado
                    password,
                    nombre: userLogged.nombre,
                    rol: userLogged.rol,
                    tabla: tablaDestino,
                })
            );
            localStorage.setItem("hasLoggedInOnline", "true");


            // Además, guardamos por tabla para identificar más fácil
            if (rol === "paciente") {
                localStorage.setItem("pacienteLocal", JSON.stringify(userLogged));
            } else {
                localStorage.setItem("psicologoLocal", JSON.stringify(userLogged));
            }

            if (userLogged.rol === "paciente") navigate("/paciente");
            else navigate("/psicologo");
        } catch (err) {
            console.error("ERROR REGISTER:", err);
            let msg = err.message || "Error al registrarse";

            const lower = msg.toLowerCase();

            if (lower.includes("user already registered") || lower.includes("already exists")) {
                msg = "Este correo ya está registrado. Intenta iniciar sesión.";
            } else if (lower.includes("network") || lower.includes("fetch")) {
                msg = "Problema de conexión con el servidor. Inténtalo de nuevo.";
            } else if (lower.includes("rate limit")) {
                msg = "Has hecho demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
            }

            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                {/* Header */}
                <div className="auth-header">
                    <h2>Registro</h2>

                    <span className={`status-pill ${online ? "online" : "offline"}`}>
                        ● {online ? "Online" : "Offline"}
                    </span>
                </div>

                <p className="auth-subtitle">
                    Después de registrarte, es posible que debas confirmar tu correo para
                    poder iniciar sesión.
                </p>

                {!online && (
                    <p className="offline-hint">
                        Estás sin conexión. No podrás registrarte hasta que vuelvas a tener
                        internet.
                    </p>
                )}

                {infoMsg && <p className="info-msg">{infoMsg}</p>}

                <form onSubmit={handleRegister}>
                    <div className="field">
                        <label>Nombre</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                        />
                    </div>

                    <div className="field">
                        <label>Rol</label>
                        <select
                            value={rol}
                            onChange={(e) => setRol(e.target.value)}
                        >
                            <option value="paciente">Paciente</option>
                            <option value="psicologo">Psicólogo</option>
                        </select>
                    </div>

                    <div className="field">
                        <label>Correo</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="field">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            minLength={6}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    <div className="field">
                        <label>Confirmar contraseña</label>
                        <input
                            type="password"
                            value={passwordConfirm}
                            minLength={6}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    {errorMsg && <p className="error-msg">{errorMsg}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="auth-button"
                    >
                        {loading ? "Registrando..." : "Registrarme"}
                    </button>
                </form>

                <p className="auth-footer">
                    ¿Ya tienes cuenta?{" "}
                    <Link to="/login" className="auth-link">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );


}

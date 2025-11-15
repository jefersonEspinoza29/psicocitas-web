// src/pages/psicologo/PsicologoPerfil.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import "../../styles/pacientePerfil.css"; // reutilizamos los mismos estilos

export default function PsicologoPerfil({ user }) {
  const online = useOnlineStatus();

  const [nombre, setNombre] = useState(user.nombre || "");
  const [especialidad, setEspecialidad] = useState("");
  const [colegiatura, setColegiatura] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [telefono, setTelefono] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 1) Cargar datos desde localStorage (psicologoLocal) o desde user
  useEffect(() => {
    const localRaw = localStorage.getItem("psicologoLocal");
    if (localRaw) {
      try {
        const localData = JSON.parse(localRaw);
        if (localData && localData.id === user.id) {
          setNombre(localData.nombre || user.nombre || "");
          setEspecialidad(localData.especialidad || "");
          setColegiatura(localData.colegiatura || "");
          setExperiencia(localData.experiencia || "");
          setTelefono(localData.telefono || "");
          return;
        }
      } catch (e) {
        console.error("Error parseando psicologoLocal:", e);
      }
    }

    // Si no hay psicologoLocal válido, usamos lo que venga en user
    setNombre(user.nombre || "");
    setEspecialidad("");
    setColegiatura("");
    setExperiencia("");
    setTelefono("");
  }, [user.id, user.nombre]);

  // 2) Si hay cambios pendientes y estamos online, sincronizar con Supabase
  useEffect(() => {
    const syncPending = async () => {
      const pendingRaw = localStorage.getItem("psicologoProfilePending");
      if (!pendingRaw) return;

      let pending;
      try {
        pending = JSON.parse(pendingRaw);
      } catch {
        return;
      }

      if (!pending || pending.id !== user.id) return;

      try {
        const { error } = await supabase
          .from("psicologos")
          .update({
            nombre: pending.nombre,
            especialidad: pending.especialidad,
            colegiatura: pending.colegiatura,
            experiencia: pending.experiencia,
            telefono: pending.telefono,
          })
          .eq("id", user.id);

        if (error) {
          console.error("Error sincronizando perfil pendiente (psicólogo):", error);
          return;
        }

        // Actualizamos localStorage con datos sincronizados
        const localRaw = localStorage.getItem("psicologoLocal");
        let localData = {};
        if (localRaw) {
          try {
            localData = JSON.parse(localRaw) || {};
          } catch {
            localData = {};
          }
        }

        const updatedLocal = {
          ...localData,
          ...user,
          nombre: pending.nombre,
          especialidad: pending.especialidad || "",
          colegiatura: pending.colegiatura || "",
          experiencia: pending.experiencia || "",
          telefono: pending.telefono || "",
        };

        localStorage.setItem("psicologoLocal", JSON.stringify(updatedLocal));
        localStorage.removeItem("psicologoProfilePending");

        setNombre(pending.nombre);
        setEspecialidad(pending.especialidad || "");
        setColegiatura(pending.colegiatura || "");
        setExperiencia(pending.experiencia || "");
        setTelefono(pending.telefono || "");
        setMsg("Perfil sincronizado con el servidor.");
      } catch (e) {
        console.error("Error en syncPending (psicólogo):", e);
      }
    };

    if (online) {
      syncPending();
    }
  }, [online, user.id, user]);

  // 3) Cuando haya internet y NO haya cambios pendientes, traer datos frescos de Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!online) return;

      // Si hay algo pendiente, dejamos que el efecto de syncPending se encargue
      const pendingRaw = localStorage.getItem("psicologoProfilePending");
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          if (pending && pending.id === user.id) {
            return;
          }
        } catch {
          // si falla el parse, seguimos normal
        }
      }

      try {
        const { data, error } = await supabase
          .from("psicologos")
          .select("nombre, especialidad, colegiatura, experiencia, telefono")
          .eq("id", user.id)
          .limit(1);

        if (error) {
          console.error("Error obteniendo perfil desde Supabase (psicólogo):", error);
          return;
        }

        if (!data || data.length === 0) {
          // No hay fila en psicologos para este usuario
          return;
        }

        const perfil = data[0];

        // Actualizar estado con lo que viene de la BD
        setNombre(perfil.nombre || user.nombre || "");
        setEspecialidad(perfil.especialidad || "");
        setColegiatura(perfil.colegiatura || "");
        setExperiencia(perfil.experiencia || "");
        setTelefono(perfil.telefono || "");

        // Actualizar psicologoLocal con estos datos como snapshot "oficial"
        const localRaw = localStorage.getItem("psicologoLocal");
        let localData = {};
        if (localRaw) {
          try {
            localData = JSON.parse(localRaw) || {};
          } catch {
            localData = {};
          }
        }

        const updatedLocal = {
          ...localData,
          ...user,
          nombre: perfil.nombre || user.nombre || "",
          especialidad: perfil.especialidad || "",
          colegiatura: perfil.colegiatura || "",
          experiencia: perfil.experiencia || "",
          telefono: perfil.telefono || "",
        };

        localStorage.setItem("psicologoLocal", JSON.stringify(updatedLocal));
      } catch (e) {
        console.error("Error en fetchProfile (psicólogo):", e);
      }
    };

    fetchProfile();
  }, [online, user.id, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");

    const nombreTrim = nombre.trim();
    const especialidadTrim = especialidad.trim();
    const colegiaturaTrim = colegiatura.trim();
    const experienciaTrim = experiencia.trim();
    const telTrim = telefono.trim();

    if (!nombreTrim) {
      setErrorMsg("El nombre no puede estar vacío.");
      return;
    }

    const perfilData = {
      id: user.id,
      nombre: nombreTrim,
      especialidad: especialidadTrim || null,
      colegiatura: colegiaturaTrim || null,
      experiencia: experienciaTrim || null,
      telefono: telTrim || null,
    };

    setSaving(true);

    // 1) Actualizar siempre el caché local (psicologoLocal)
    try {
      const localRaw = localStorage.getItem("psicologoLocal");
      let localData = {};
      if (localRaw) {
        try {
          localData = JSON.parse(localRaw) || {};
        } catch {
          localData = {};
        }
      }

      const newLocal = {
        ...localData,
        ...user,
        nombre: nombreTrim,
        especialidad: especialidadTrim || "",
        colegiatura: colegiaturaTrim || "",
        experiencia: experienciaTrim || "",
        telefono: telTrim || "",
      };

      localStorage.setItem("psicologoLocal", JSON.stringify(newLocal));

      // También actualizamos userLogged.nombre para que el header del dashboard
      // muestre el nombre nuevo en próximos montajes
      const userLoggedRaw = localStorage.getItem("userLogged");
      if (userLoggedRaw) {
        try {
          const userLogged = JSON.parse(userLoggedRaw);
          if (userLogged.id === user.id) {
            const updatedUserLogged = {
              ...userLogged,
              nombre: nombreTrim,
            };
            localStorage.setItem(
              "userLogged",
              JSON.stringify(updatedUserLogged)
            );
          }
        } catch {
          // nada grave
        }
      }
    } catch (e) {
      console.error("Error guardando en psicologoLocal:", e);
    }

    // 2) Si estamos offline → solo guardamos pendiente y salimos
    if (!online) {
      localStorage.setItem(
        "psicologoProfilePending",
        JSON.stringify(perfilData)
      );
      setSaving(false);
      setMsg(
        "Cambios guardados en este dispositivo. Se sincronizarán cuando vuelvas a tener internet."
      );
      return;
    }

    // 3) Si estamos online → intentamos actualizar Supabase
    try {
      const { error } = await supabase
        .from("psicologos")
        .update({
          nombre: perfilData.nombre,
          especialidad: perfilData.especialidad,
          colegiatura: perfilData.colegiatura,
          experiencia: perfilData.experiencia,
          telefono: perfilData.telefono,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error actualizando perfil en Supabase (psicólogo):", error);

        // Guardamos pendiente por si acaso
        localStorage.setItem(
          "psicologoProfilePending",
          JSON.stringify(perfilData)
        );

        setErrorMsg(
          "No se pudo actualizar en el servidor. Tus cambios quedaron guardados localmente."
        );
      } else {
        // Si se actualizó bien, limpiamos pendiente (si hubiera)
        localStorage.removeItem("psicologoProfilePending");
        setMsg("Perfil actualizado correctamente.");
      }
    } catch (err) {
      console.error("Error en handleSubmit (Supabase, psicólogo):", err);
      localStorage.setItem(
        "psicologoProfilePending",
        JSON.stringify(perfilData)
      );
      setErrorMsg(
        "Ocurrió un problema con la conexión. Tus cambios quedaron guardados localmente."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="perfil-container">
      <h3 className="perfil-title">Perfil del psicólogo</h3>

      {!online && (
        <p className="perfil-offline">
          Estás en modo offline. Los cambios se guardarán en este dispositivo y
          se enviarán cuando tengas internet.
        </p>
      )}

      {msg && <p className="perfil-msg-success">{msg}</p>}

      {errorMsg && <p className="perfil-msg-error">{errorMsg}</p>}

      <form onSubmit={handleSubmit} className="perfil-form">
        <div className="perfil-field">
          <label className="perfil-label">Nombre Completo</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="perfil-input"
          />
        </div>

        <div className="perfil-field">
          <label className="perfil-label">Especialidad</label>
          <input
            type="text"
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            className="perfil-input"
            placeholder="Psicología clínica, organizacional, etc."
          />
        </div>

        <div className="perfil-field">
          <label className="perfil-label">N° de colegiatura</label>
          <input
            type="text"
            value={colegiatura}
            onChange={(e) => setColegiatura(e.target.value)}
            className="perfil-input"
            placeholder="Opcional"
          />
        </div>

        <div className="perfil-field">
          <label className="perfil-label">Experiencia</label>
          <textarea
            value={experiencia}
            onChange={(e) => setExperiencia(e.target.value)}
            className="perfil-input"
            rows={3}
            placeholder="Ejemplo: 3 años en terapia individual, TCC, etc."
            style={{ resize: "vertical" }}
          />
        </div>

        <div className="perfil-field">
          <label className="perfil-label">Teléfono</label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Opcional"
            className="perfil-input"
          />
        </div>

        <div className="perfil-field">
          <label className="perfil-label">Correo</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="perfil-input perfil-input-disabled"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`perfil-button ${saving ? "perfil-button-disabled" : ""}`}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

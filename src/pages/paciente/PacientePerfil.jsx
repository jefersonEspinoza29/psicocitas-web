// src/pages/paciente/PacientePerfil.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import "../../styles/pacientePerfil.css";

export default function PacientePerfil({ user }) {
  const online = useOnlineStatus();

  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState(user.nombre || "");
  const [apellidos, setApellidos] = useState("");
  const [edad, setEdad] = useState(""); // como string para el input
  const [sexo, setSexo] = useState("");
  const [telefono, setTelefono] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 1) Cargar datos desde localStorage (pacienteLocal) o desde user
  useEffect(() => {
    const localRaw = localStorage.getItem("pacienteLocal");
    if (localRaw) {
      try {
        const localData = JSON.parse(localRaw);
        if (localData && localData.id === user.id) {
          setNombre(localData.nombre || user.nombre || "");
          setDni(localData.dni || "");
          setApellidos(localData.apellidos || "");
          setTelefono(localData.telefono || "");
          setSexo(localData.sexo || "");
          setEdad(
            localData.edad !== undefined && localData.edad !== null
              ? String(localData.edad)
              : ""
          );
          return;
        }
      } catch (e) {
        console.error("Error parseando pacienteLocal:", e);
      }
    }

    // Si no hay pacienteLocal válido, usamos lo que venga en user
    setNombre(user.nombre || "");
    setDni("");
    setApellidos("");
    setTelefono("");
    setSexo("");
    setEdad("");
  }, [user.id, user.nombre]);

  // 2) Si hay cambios pendientes y estamos online, sincronizar con Supabase
  useEffect(() => {
    const syncPending = async () => {
      const pendingRaw = localStorage.getItem("pacienteProfilePending");
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
          .from("pacientes")
          .update({
            nombre: pending.nombre,
            telefono: pending.telefono,
            dni: pending.dni,
            apellidos: pending.apellidos,
            edad: pending.edad,
            sexo: pending.sexo,
          })
          .eq("id", user.id);

        if (error) {
          console.error("Error sincronizando perfil pendiente:", error);
          return;
        }

        // Actualizamos localStorage con datos sincronizados
        const localRaw = localStorage.getItem("pacienteLocal");
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
          telefono: pending.telefono || "",
          dni: pending.dni || "",
          apellidos: pending.apellidos || "",
          sexo: pending.sexo || "",
          edad: pending.edad ?? null,
        };

        localStorage.setItem("pacienteLocal", JSON.stringify(updatedLocal));
        localStorage.removeItem("pacienteProfilePending");

        setNombre(pending.nombre);
        setTelefono(pending.telefono || "");
        setDni(pending.dni || "");
        setApellidos(pending.apellidos || "");
        setSexo(pending.sexo || "");
        setEdad(
          pending.edad !== undefined && pending.edad !== null
            ? String(pending.edad)
            : ""
        );
        setMsg("Perfil sincronizado con el servidor.");
      } catch (e) {
        console.error("Error en syncPending:", e);
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
      const pendingRaw = localStorage.getItem("pacienteProfilePending");
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
          .from("pacientes")
          .select("dni, nombre, apellidos, edad, sexo, telefono")
          .eq("id", user.id)
          .limit(1);

        if (error) {
          console.error("Error obteniendo perfil desde Supabase:", error);
          return;
        }

        if (!data || data.length === 0) {
          // No hay fila en pacientes para este usuario
          return;
        }

        const perfil = data[0];

        // Actualizar estado con lo que viene de la BD
        setNombre(perfil.nombre || user.nombre || "");
        setDni(perfil.dni || "");
        setApellidos(perfil.apellidos || "");
        setTelefono(perfil.telefono || "");
        setSexo(perfil.sexo || "");
        setEdad(
          perfil.edad !== undefined && perfil.edad !== null
            ? String(perfil.edad)
            : ""
        );

        // Actualizar pacienteLocal con estos datos como snapshot "oficial"
        const localRaw = localStorage.getItem("pacienteLocal");
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
          telefono: perfil.telefono || "",
          dni: perfil.dni || "",
          apellidos: perfil.apellidos || "",
          sexo: perfil.sexo || "",
          edad: perfil.edad ?? null,
        };

        localStorage.setItem("pacienteLocal", JSON.stringify(updatedLocal));
      } catch (e) {
        console.error("Error en fetchProfile:", e);
      }
    };

    fetchProfile();
  }, [online, user.id, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");

    const nombreTrim = nombre.trim();
    const dniTrim = dni.trim();
    const apellidosTrim = apellidos.trim();
    const telTrim = telefono.trim();
    const edadTrim = edad.trim();

    if (!nombreTrim) {
      setErrorMsg("El nombre no puede estar vacío.");
      return;
    }

    // edad opcional, pero si la ponen intentamos parsear
    let edadNum = null;
    if (edadTrim) {
      const parsed = parseInt(edadTrim, 10);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 120) {
        setErrorMsg("Ingresa una edad válida (0 - 120).");
        return;
      }
      edadNum = parsed;
    }

    // sexo opcional, pero si se envía debe respetar el check de la BD
    const sexoValue = sexo || null; // 'masculino' | 'femenino' | 'otro' | null

    const perfilData = {
      id: user.id,
      nombre: nombreTrim,
      telefono: telTrim || null,
      dni: dniTrim || null,
      apellidos: apellidosTrim || null,
      edad: edadNum,
      sexo: sexoValue,
    };

    setSaving(true);

    // 1) Actualizar siempre el caché local (pacienteLocal)
    try {
      const localRaw = localStorage.getItem("pacienteLocal");
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
        telefono: telTrim || "",
        dni: dniTrim || "",
        apellidos: apellidosTrim || "",
        sexo: sexo || "",
        edad: edadNum,
      };

      localStorage.setItem("pacienteLocal", JSON.stringify(newLocal));

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
      console.error("Error guardando en pacienteLocal:", e);
    }

    // 2) Si estamos offline → solo guardamos pendiente y salimos
    if (!online) {
      localStorage.setItem(
        "pacienteProfilePending",
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
        .from("pacientes")
        .update({
          nombre: perfilData.nombre,
          telefono: perfilData.telefono,
          dni: perfilData.dni,
          apellidos: perfilData.apellidos,
          edad: perfilData.edad,
          sexo: perfilData.sexo,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error actualizando perfil en Supabase:", error);

        // Guardamos pendiente por si acaso
        localStorage.setItem(
          "pacienteProfilePending",
          JSON.stringify(perfilData)
        );

        setErrorMsg(
          "No se pudo actualizar en el servidor. Tus cambios quedaron guardados localmente."
        );
      } else {
        // Si se actualizó bien, limpiamos pendiente (si hubiera)
        localStorage.removeItem("pacienteProfilePending");
        setMsg("Perfil actualizado correctamente.");
      }
    } catch (err) {
      console.error("Error en handleSubmit (Supabase):", err);
      localStorage.setItem(
        "pacienteProfilePending",
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
      <h3 className="perfil-title">Perfil</h3>

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
          <label className="perfil-label">DNI</label>
          <input
            type="text"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            className="perfil-input"
          />
        </div>

        <div className="perfil-field">
          <label className="perfil-label">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="perfil-input"
          />
        </div>

        <div className="perfil-field">
          <label className="perfil-label">Apellidos</label>
          <input
            type="text"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            className="perfil-input"
          />
        </div>

        <div className="perfil-field">
          <label className="perfil-label">Edad</label>
          <input
            type="number"
            min="0"
            max="120"
            value={edad}
            onChange={(e) => setEdad(e.target.value)}
            className="perfil-input"
            placeholder="Opcional"
          />
        </div>

        <div className="perfil-field">
          <label className="perfil-label">Sexo</label>
          <select
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            className="perfil-input"
          >
            <option value="">Seleccione...</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select>
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

import { useEffect, useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;        // ej: https://obxiceqoyqkixxmigihu.supabase.co
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY; // ya lo tienes para createClient

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    let cancelled = false;

    const checkConnection = async () => {
      // Si el navegador ya dice que no hay red → offline directo
      if (!navigator.onLine) {
        if (!cancelled) setOnline(false);
        return;
      }

      // Si no tenemos URL configurada, no podemos chequear bien
      if (!SUPABASE_URL) {
        if (!cancelled) setOnline(navigator.onLine);
        return;
      }

      try {
        const base = SUPABASE_URL.replace(/\/+$/, ""); // quita / final
        const res = await fetch(`${base}/auth/v1/health`, {
          method: "GET",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });

        // Si llegamos aquí, hubo conexión con Supabase (aunque fuera 401, 403, etc.)
        if (!cancelled) {
          // Si quieres ser ultra estricto:
          // setOnline(res.ok);
          // Pero para “hay internet hacia Supabase” nos vale cualquier status que no lance error:
          setOnline(true);
        }
      } catch (err) {
        // Sin internet real / DNS / WiFi apagado → error de red
        if (!cancelled) setOnline(false);
      }
    };

    // Primera comprobación
    checkConnection();

    // Repetir cada 5 segundos
    const intervalId = setInterval(checkConnection, 5000);

    // También reaccionamos a los eventos del navegador
    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", checkConnection);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", checkConnection);
    };
  }, []);

  return online;
}

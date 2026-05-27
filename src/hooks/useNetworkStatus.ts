import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Hook que reporta el estado de conexión del navegador.
 * Escucha eventos `online` / `offline` y muestra un toast al recuperar conexión.
 * SSR-safe: devuelve `true` en el servidor (asumimos online).
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    let wasOffline = !navigator.onLine;

    const handleOnline = () => {
      setOnline(true);
      if (wasOffline) {
        toast.success("Conexión recuperada", {
          description: "Ya puedes guardar cambios nuevamente.",
        });
      }
      wasOffline = false;
    };
    const handleOffline = () => {
      setOnline(false);
      wasOffline = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { online, offline: !online };
}
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push-vapid";

const SW_URL = "/push-sw.js";

type Status = "unsupported" | "denied" | "default" | "subscribed" | "loading";

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function usePushNotifications() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupported()) return setStatus("unsupported");
    if (Notification.permission === "denied") return setStatus("denied");
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") setStatus("subscribed");
      else setStatus(Notification.permission as Status);
    } catch {
      setStatus("default");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setError(null);
    if (!isSupported()) {
      setError("Este navegador no soporta notificaciones push.");
      return;
    }
    try {
      setStatus("loading");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return;
      }
      const reg =
        (await navigator.serviceWorker.getRegistration(SW_URL)) ??
        (await navigator.serviceWorker.register(SW_URL, { scope: "/" }));
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("No hay sesión activa.");

      const json = sub.toJSON();
      const endpoint = sub.endpoint;
      const { error: upsertErr } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: userId,
            endpoint,
            subscription: json as never,
            user_agent: navigator.userAgent,
          },
          { onConflict: "endpoint" },
        );
      if (upsertErr) throw upsertErr;

      setStatus("subscribed");
      qc.invalidateQueries({ queryKey: ["userNotificationsStatus"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al suscribir notificaciones.");
      await refresh();
    }
  }, [qc, refresh]);

  const unsubscribe = useCallback(async () => {
    setError(null);
    if (!isSupported()) return;
    try {
      setStatus("loading");
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
      setStatus(Notification.permission as Status);
      qc.invalidateQueries({ queryKey: ["userNotificationsStatus"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cancelar la suscripción.");
      await refresh();
    }
  }, [qc, refresh]);

  return {
    status,
    error,
    isSupported: status !== "unsupported",
    isSubscribed: status === "subscribed",
    subscribe,
    unsubscribe,
  };
}
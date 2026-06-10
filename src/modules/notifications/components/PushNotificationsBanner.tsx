import { Bell, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_KEY = "push-banner-dismissed-v1";

export function PushNotificationsBanner() {
  const { status, isSupported, isSubscribed, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  });

  if (!isSupported) return null;
  if (isSubscribed) return null;
  if (status === "denied") return null;
  if (status === "loading") return null;
  if (dismissed) return null;

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    }
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Activar notificaciones"
      className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            Activa los recordatorios sanitarios
          </p>
          <p className="text-xs text-muted-foreground">
            Recibe avisos 15 días, 5 días y el mismo día antes de cada tratamiento.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0">
        <Button size="sm" onClick={() => void subscribe()}>
          Activar
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={dismiss}
          aria-label="Descartar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
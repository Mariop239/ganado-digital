import { Bell, BellOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationsToggle() {
  const { status, error, isSupported, isSubscribed, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) {
    return (
      <Alert variant="default" className="border-dashed">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Este navegador no soporta notificaciones push. En iOS, instala la app en la pantalla
          de inicio (iOS 16.4+).
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {isSubscribed ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">
            {isSubscribed
              ? "Recordatorios de vacunas activos en este dispositivo"
              : "Activar recordatorios de vacunas en este dispositivo"}
          </span>
        </div>
        {isSubscribed ? (
          <Button
            size="sm"
            variant="outline"
            disabled={status === "loading"}
            onClick={() => void unsubscribe()}
          >
            Desactivar
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={status === "loading" || status === "denied"}
            onClick={() => void subscribe()}
          >
            {status === "loading" ? "Procesando..." : "Activar"}
          </Button>
        )}
      </div>
      {status === "denied" && (
        <p className="text-xs text-muted-foreground">
          Permiso bloqueado. Habilítalo en la configuración del navegador.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
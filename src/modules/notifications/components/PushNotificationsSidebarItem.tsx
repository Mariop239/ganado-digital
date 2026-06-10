import { Bell, BellOff } from "lucide-react";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

export function PushNotificationsSidebarItem() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { status, isSupported, isSubscribed, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) return null;

  const loading = status === "loading";
  const denied = status === "denied";

  const label = isSubscribed
    ? "Alertas activas en este dispositivo"
    : denied
      ? "Alertas bloqueadas por el navegador"
      : "Recibir alertas en este dispositivo";

  return (
    <SidebarMenuButton
      type="button"
      onClick={() => {
        if (loading || denied) return;
        if (isSubscribed) void unsubscribe();
        else void subscribe();
      }}
      disabled={loading || denied}
      tooltip={label}
      className={cn(
        "min-h-11 text-sm",
        isSubscribed && "text-primary",
      )}
      aria-pressed={isSubscribed}
    >
      {isSubscribed ? (
        <Bell className="h-5 w-5 shrink-0" />
      ) : (
        <BellOff className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      {!collapsed && <span className="truncate">{label}</span>}
    </SidebarMenuButton>
  );
}
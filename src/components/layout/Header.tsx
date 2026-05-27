import { useNavigate } from "@tanstack/react-router";
import { LogOut, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function Header() {
  const navigate = useNavigate();
  const { offline } = useNetworkStatus();
  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      {offline && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
        >
          <WifiOff className="h-4 w-4" />
          Sin conexión a Internet — Modo solo lectura
        </div>
      )}
      <div className="flex w-full items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="min-h-11 min-w-11" />
          <img
            src="/icons/icon-192.png"
            alt="Rancho Digital"
            className="h-8 w-8 rounded-md object-cover"
          />
          <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Rancho Digital
          </span>
        </div>
        <Button variant="ghost" size="lg" onClick={logout} className="min-h-12">
          <LogOut className="mr-2 h-5 w-5" /> Salir
        </Button>
      </div>
    </header>
  );
}
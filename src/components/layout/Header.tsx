import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function Header() {
  const navigate = useNavigate();
  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/login" });
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-primary">
          <Beef className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-tight">Rancho · Vacas Paridas</span>
        </Link>
        <Button variant="ghost" size="lg" onClick={logout} className="min-h-12">
          <LogOut className="mr-2 h-5 w-5" /> Salir
        </Button>
      </div>
    </header>
  );
}
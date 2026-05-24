import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { egresoSchema } from "../schemas";
import type { EgresoInput } from "../types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMarcarEgreso } from "../hooks/useVacas";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export function EgresoDialog({ numero }: { numero: string }) {
  const [open, setOpen] = useState(false);
  const mut = useMarcarEgreso(numero);
  const form = useForm<EgresoInput>({
    resolver: zodResolver(egresoSchema),
    defaultValues: { fecha_egreso: new Date().toISOString().slice(0, 10), motivo_egreso: "" },
  });

  const onSubmit = async (v: EgresoInput) => {
    try {
      await mut.mutateAsync(v);
      toast.success("Vaca marcada como egresada");
      setOpen(false);
      form.reset();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="min-h-12">
          <LogOut className="mr-2 h-5 w-5" /> Marcar egreso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar egreso</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fecha_egreso" className="text-base">Fecha de egreso *</Label>
            <Input id="fecha_egreso" type="date" className="h-12 text-base" {...form.register("fecha_egreso")} />
            {form.formState.errors.fecha_egreso && (
              <p className="text-sm text-destructive">{form.formState.errors.fecha_egreso.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo_egreso" className="text-base">Motivo *</Label>
            <Textarea id="motivo_egreso" rows={3} className="text-base" {...form.register("motivo_egreso")} />
            {form.formState.errors.motivo_egreso && (
              <p className="text-sm text-destructive">{form.formState.errors.motivo_egreso.message}</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="lg" className="min-h-12">Confirmar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useMarcarEgresoAnimal } from "../hooks/useAnimals";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

const schema = z.object({
  fecha: z.string().min(1, "Requerida"),
  motivo: z.string().trim().min(1, "Requerido").max(300),
  estado: z.enum(["vendida", "fallecida"]),
}).refine((d) => new Date(d.fecha) <= new Date(), {
  message: "La fecha no puede ser futura",
  path: ["fecha"],
});

type FormValues = z.infer<typeof schema>;

export function EstadoAnimalDialog({ numero }: { numero: string }) {
  const [open, setOpen] = useState(false);
  const mut = useMarcarEgresoAnimal(numero);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 10),
      motivo: "",
      estado: "vendida",
    },
  });

  const onSubmit = async (v: FormValues) => {
    try {
      await mut.mutateAsync(v);
      toast.success("Estado del animal actualizado");
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
          <DialogTitle>Cambiar estado del animal</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base">Nuevo estado *</Label>
            <Select
              value={form.watch("estado")}
              onValueChange={(v) => form.setValue("estado", v as "vendida" | "fallecida")}
            >
              <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vendida">Vendida / Egresada</SelectItem>
                <SelectItem value="fallecida">Fallecida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-base">Fecha *</Label>
            <Input id="fecha" type="date" className="h-12 text-base" {...form.register("fecha")} />
            {form.formState.errors.fecha && (
              <p className="text-sm text-destructive">{form.formState.errors.fecha.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-base">Motivo *</Label>
            <Textarea id="motivo" rows={3} className="text-base" {...form.register("motivo")} />
            {form.formState.errors.motivo && (
              <p className="text-sm text-destructive">{form.formState.errors.motivo.message}</p>
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vacunaSchema } from "../schemas";
import type { VacunaInput } from "../types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateVacuna } from "../hooks/useVacunas";
import { toast } from "sonner";

type Props = {
  vacaNumero: string;
  onDone: () => void;
};

export function FormVacuna({ vacaNumero, onDone }: Props) {
  const form = useForm<VacunaInput>({
    resolver: zodResolver(vacunaSchema),
    defaultValues: {
      fecha: "",
      vacuna_aplicada: "",
      enfermedad_a_prevenir: "",
      gasto: 0,
      observaciones: "",
    },
  });
  const create = useCreateVacuna(vacaNumero);

  const onSubmit = async (values: VacunaInput) => {
    try {
      await create.mutateAsync(values);
      toast.success("Vacuna registrada");
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const err = (k: keyof VacunaInput) =>
    form.formState.errors[k] && (
      <p className="text-sm text-destructive">{form.formState.errors[k]?.message as string}</p>
    );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fecha" className="text-base">Fecha *</Label>
          <Input id="fecha" type="date" className="h-12 text-base" {...form.register("fecha")} />
          {err("fecha")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="gasto" className="text-base">Gasto ($) *</Label>
          <Input id="gasto" type="number" min="0" step="0.01" className="h-12 text-base" {...form.register("gasto", { valueAsNumber: true })} />
          {err("gasto")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vacuna_aplicada" className="text-base">Vacuna / medicamento *</Label>
          <Input id="vacuna_aplicada" className="h-12 text-base" {...form.register("vacuna_aplicada")} />
          {err("vacuna_aplicada")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="enfermedad_a_prevenir" className="text-base">Enfermedad a prevenir</Label>
          <Input id="enfermedad_a_prevenir" className="h-12 text-base" {...form.register("enfermedad_a_prevenir")} />
          {err("enfermedad_a_prevenir")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="observaciones" className="text-base">Observaciones</Label>
          <Textarea id="observaciones" rows={3} className="text-base" {...form.register("observaciones")} />
          {err("observaciones")}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" size="lg" className="min-h-12" disabled={form.formState.isSubmitting}>
          Registrar vacuna
        </Button>
      </div>
    </form>
  );
}
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { historialSchema } from "../schemas";
import type { HistorialInput, Historial } from "../types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateHistorial, useUpdateHistorial } from "../hooks/useHistorial";
import { toast } from "sonner";

type Props = {
  vacaNumero: string;
  registro?: Historial;
  onDone: () => void;
};

export function FormHistorial({ vacaNumero, registro, onDone }: Props) {
  const editing = !!registro;
  const form = useForm<HistorialInput>({
    resolver: zodResolver(historialSchema),
    defaultValues: registro
      ? {
          fecha_monta: registro.fecha_monta,
          toro: registro.toro,
          fecha_parto: registro.fecha_parto ?? "",
          sexo_cria: (registro.sexo_cria ?? "") as HistorialInput["sexo_cria"],
          fecha_destete: registro.fecha_destete ?? "",
          observaciones: registro.observaciones ?? "",
        }
      : { fecha_monta: "", toro: "", fecha_parto: "", sexo_cria: "", fecha_destete: "", observaciones: "" },
  });
  const create = useCreateHistorial(vacaNumero);
  const update = useUpdateHistorial(vacaNumero);

  const onSubmit = async (values: HistorialInput) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: registro!.id, input: values });
        toast.success("Registro actualizado");
      } else {
        await create.mutateAsync(values);
        toast.success("Registro añadido");
      }
      onDone();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al guardar";
      toast.error(msg);
    }
  };

  const err = (k: keyof HistorialInput) =>
    form.formState.errors[k] && (
      <p className="text-sm text-destructive">{form.formState.errors[k]?.message as string}</p>
    );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fecha_monta" className="text-base">Fecha de monta *</Label>
          <Input id="fecha_monta" type="date" className="h-12 text-base" {...form.register("fecha_monta")} />
          {err("fecha_monta")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="toro" className="text-base">Toro</Label>
          <Input id="toro" className="h-12 text-base" {...form.register("toro")} />
          {err("toro")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_parto" className="text-base">Fecha de parto</Label>
          <Input id="fecha_parto" type="date" className="h-12 text-base" {...form.register("fecha_parto")} />
          {err("fecha_parto")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sexo_cria" className="text-base">Sexo de cría</Label>
          <select
            id="sexo_cria"
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            {...form.register("sexo_cria")}
          >
            <option value="">— Sin especificar —</option>
            <option value="Macho">Macho</option>
            <option value="Hembra">Hembra</option>
          </select>
          {err("sexo_cria")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fecha_destete" className="text-base">Fecha de destete</Label>
          <Input id="fecha_destete" type="date" className="h-12 text-base" {...form.register("fecha_destete")} />
          {err("fecha_destete")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="observaciones" className="text-base">Observaciones</Label>
          <Textarea id="observaciones" rows={3} className="text-base" {...form.register("observaciones")} />
          {err("observaciones")}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" size="lg" className="min-h-12" disabled={form.formState.isSubmitting}>
          {editing ? "Guardar cambios" : "Añadir registro"}
        </Button>
      </div>
    </form>
  );
}
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vacaSchema, type VacaInput } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateVaca, useUpdateVaca } from "@/hooks/useVacas";
import type { Vaca } from "@/lib/vacas-repository";
import { toast } from "sonner";

type Props = {
  vaca?: Vaca;
  onDone: (numero: string) => void;
};

export function FormVaca({ vaca, onDone }: Props) {
  const editing = !!vaca;
  const form = useForm<VacaInput>({
    resolver: zodResolver(vacaSchema),
    defaultValues: vaca
      ? {
          numero: vaca.numero,
          dueno: vaca.dueno,
          nombre: vaca.nombre,
          color: vaca.color,
          raza: vaca.raza,
          padre: vaca.padre,
          madre: vaca.madre,
        }
      : { numero: "", dueno: "", nombre: "", color: "", raza: "", padre: "", madre: "" },
  });
  const create = useCreateVaca();
  const update = useUpdateVaca(vaca?.numero ?? "");

  const onSubmit = async (values: VacaInput) => {
    try {
      if (editing) {
        const { numero: _ignored, ...rest } = values;
        await update.mutateAsync(rest);
        toast.success("Vaca actualizada");
        onDone(vaca!.numero);
      } else {
        const created = await create.mutateAsync(values);
        toast.success("Vaca añadida");
        onDone(created.numero);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al guardar";
      toast.error(msg);
    }
  };

  const fields: Array<{ name: keyof VacaInput; label: string; required?: boolean }> = [
    { name: "numero", label: "Número (arete)", required: true },
    { name: "nombre", label: "Nombre" },
    { name: "dueno", label: "Dueño" },
    { name: "color", label: "Color" },
    { name: "raza", label: "Raza" },
    { name: "padre", label: "Padre" },
    { name: "madre", label: "Madre" },
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className="space-y-2">
            <Label htmlFor={f.name} className="text-base">
              {f.label}{f.required && " *"}
            </Label>
            <Input
              id={f.name}
              className="h-12 text-base"
              disabled={editing && f.name === "numero"}
              {...form.register(f.name)}
            />
            {form.formState.errors[f.name] && (
              <p className="text-sm text-destructive">
                {form.formState.errors[f.name]?.message as string}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" size="lg" className="min-h-12" disabled={form.formState.isSubmitting}>
          {editing ? "Guardar cambios" : "Añadir vaca"}
        </Button>
      </div>
    </form>
  );
}
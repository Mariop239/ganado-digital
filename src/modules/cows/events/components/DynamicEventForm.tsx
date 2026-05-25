import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import { EVENT_REGISTRY } from "../registry";
import { useCreateAnimalEvent } from "../hooks/useAnimalEvents";
import type { AnimalEventType } from "../types/domain";

type Props = {
  vacaNumero: string;
  tipo: AnimalEventType;
  onDone: () => void;
};

export function DynamicEventForm({ vacaNumero, tipo, onDone }: Props) {
  const def = EVENT_REGISTRY[tipo];
  const fullSchema = z.object({
    fecha: z
      .string()
      .min(1, "Requerida")
      .refine((d) => new Date(d) <= new Date(), { message: "La fecha no puede ser futura" }),
    observaciones: z.string().trim().max(1000).optional(),
    payload: def.schema,
  });
  const form = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(fullSchema as any),
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 10),
      observaciones: "",
      payload: {} as Record<string, unknown>,
    },
  });
  const create = useCreateAnimalEvent(vacaNumero);

  const onSubmit = async (values: {
    fecha: string;
    observaciones?: string;
    payload: Record<string, unknown>;
  }) => {
    try {
      await create.mutateAsync({
        tipo: tipo as never,
        fecha: values.fecha,
        payload: values.payload as never,
        observaciones: values.observaciones || null,
      });
      toast.success(`${def.label} registrado`);
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const payloadErrors = form.formState.errors.payload as
    | Record<string, { message?: string }>
    | undefined;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">{def.description}</p>

      <div className="space-y-2">
        <Label htmlFor="fecha" className="text-base">Fecha *</Label>
        <Input id="fecha" type="date" className="h-12 text-base" {...form.register("fecha")} />
        {form.formState.errors.fecha && (
          <p className="text-sm text-destructive">
            {String(form.formState.errors.fecha.message ?? "")}
          </p>
        )}
      </div>

      {def.fields.map((f) => {
        const id = `payload.${f.name}`;
        const fieldPath = `payload.${f.name}`;
        const err = payloadErrors?.[f.name]?.message;
        return (
          <div key={f.name} className="space-y-2">
            <Label htmlFor={id} className="text-base">
              {f.label}{f.required && " *"}
            </Label>
            {f.kind === "textarea" ? (
              <Textarea
                id={id}
                rows={3}
                className="text-base"
                placeholder={f.placeholder}
                {...form.register(fieldPath)}
              />
            ) : (
              <Input
                id={id}
                type={f.kind === "number" ? "number" : "text"}
                step={f.kind === "number" ? "any" : undefined}
                className="h-12 text-base"
                placeholder={f.placeholder}
                {...form.register(fieldPath, {
                  valueAsNumber: f.kind === "number",
                })}
              />
            )}
            {err && <p className="text-sm text-destructive">{err}</p>}
          </div>
        );
      })}

      <div className="space-y-2">
        <Label htmlFor="observaciones" className="text-base">Observaciones</Label>
        <Textarea id="observaciones" rows={2} className="text-base" {...form.register("observaciones")} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="min-h-12" disabled={form.formState.isSubmitting}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
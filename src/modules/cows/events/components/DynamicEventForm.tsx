import { useForm, Controller } from "react-hook-form";
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
import { useAnimals } from "@/modules/animals/hooks/useAnimals";
import { ComboboxFree } from "@/components/ui/combobox-free";
import { DatePicker } from "@/components/ui/date-picker";
import { useMemo } from "react";

type Props = {
  animalId: string;
  tipo: AnimalEventType;
  onDone: () => void;
};

function formatSubmitError(e: unknown): string {
  if (!e) return "Error desconocido al guardar";
  if (typeof e === "string") return e;
  // Supabase PostgrestError-like: { message, details, hint, code }
  if (typeof e === "object") {
    const err = e as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const parts = [
      err.message,
      err.details,
      err.hint,
      err.code ? `(code ${err.code})` : null,
    ].filter(Boolean);
    if (parts.length) return parts.join(" — ");
  }
  return "Error al guardar";
}

function sanitizePayload(
  raw: Record<string, unknown>,
  allowedKeys: ReadonlyArray<string>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const k of allowedKeys) {
    const v = raw?.[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed === "") continue;
      clean[k] = trimmed;
      continue;
    }
    if (typeof v === "number" && Number.isNaN(v)) continue;
    clean[k] = v;
  }
  return clean;
}

export function DynamicEventForm({ animalId, tipo, onDone }: Props) {
  const def = EVENT_REGISTRY[tipo];
  const { data: animals } = useAnimals();
  const { ubicacionOptions, loteOptions } = useMemo(() => {
    const ubic = new Set<string>(["Mi rancho"]);
    const lot = new Set<string>();
    for (const a of animals ?? []) {
      const u = (a.ubicacion_actual ?? "").trim();
      if (u) ubic.add(u);
      const l = (a.lote_actual ?? "").trim();
      if (l) lot.add(l);
    }
    return {
      ubicacionOptions: Array.from(ubic),
      loteOptions: Array.from(lot),
    };
  }, [animals]);
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
  const create = useCreateAnimalEvent(animalId);

  const onSubmit = async (values: {
    fecha: string;
    observaciones?: string;
    payload: Record<string, unknown>;
  }) => {
    try {
      const allowedKeys = def.fields.map((f) => f.name as string);
      const cleanPayload = sanitizePayload(values.payload ?? {}, allowedKeys);
      await create.mutateAsync({
        tipo: tipo as never,
        fecha: values.fecha,
        payload: cleanPayload as never,
        observaciones: values.observaciones || null,
      });
      toast.success(`${def.label} registrado`);
      onDone();
    } catch (e: unknown) {
      console.error("[DynamicEventForm] save failed", e);
      toast.error(formatSubmitError(e), { duration: 10000 });
    }
  };

  const onInvalid = (errors: unknown) => {
    console.error("[DynamicEventForm] validation errors", errors);
    const flat: string[] = [];
    const walk = (obj: unknown, path: string) => {
      if (!obj || typeof obj !== "object") return;
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (v && typeof v === "object" && "message" in (v as object)) {
          const msg = (v as { message?: string }).message;
          if (msg) flat.push(`${path ? `${path}.` : ""}${k}: ${msg}`);
        } else if (v && typeof v === "object") {
          walk(v, path ? `${path}.${k}` : k);
        }
      }
    };
    walk(errors, "");
    toast.error(
      flat.length ? `Revisa los campos: ${flat.join(" · ")}` : "Formulario inválido",
      { duration: 10000 },
    );
  };

  const payloadErrors = form.formState.errors.payload as
    | Record<string, { message?: string }>
    | undefined;

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
      <p className="text-sm text-muted-foreground">{def.description}</p>

      <div className="space-y-2">
        <Label htmlFor="fecha" className="text-base">Fecha *</Label>
        <Controller
          control={form.control}
          name="fecha"
          render={({ field }) => (
            <DatePicker
              id="fecha"
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              placeholder="Selecciona la fecha del evento"
              disableFuture
              clearable={false}
            />
          )}
        />
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
        const isTrasladoDestino = tipo === "traslado" && f.name === "destino";
        const isTrasladoLote = tipo === "traslado" && f.name === "lote";
        return (
          <div key={f.name} className="space-y-2">
            <Label htmlFor={id} className="text-base">
              {f.label}{f.required && " *"}
            </Label>
            {isTrasladoDestino || isTrasladoLote ? (
              <Controller
                control={form.control}
                name={fieldPath as `payload.${string}`}
                render={({ field }) => (
                  <ComboboxFree
                    id={id}
                    value={(field.value as string) ?? ""}
                    onChange={field.onChange}
                    options={isTrasladoDestino ? ubicacionOptions : loteOptions}
                    placeholder={
                      isTrasladoDestino
                        ? "Seleccionar o escribir ubicación…"
                        : "Seleccionar o escribir lote…"
                    }
                    emptyText="Sin coincidencias"
                  />
                )}
              />
            ) : f.kind === "textarea" ? (
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
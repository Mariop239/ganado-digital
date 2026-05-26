import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { servicioSchema } from "../schemas";
import type { ServicioInput, ServicioFormInput, Historial } from "../types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateServicio, useUpdateServicio } from "../hooks/useHistorial";
import { toast } from "sonner";

type Props = {
  animalId: string;
  vacaNumero: string;
  registro?: Historial;
  onDone: () => void;
};

const TIPO_LABELS: Record<ServicioInput["tipo_servicio"], string> = {
  monta_natural: "Monta Natural",
  inseminacion: "Inseminación Artificial",
};

const ESTADO_LABELS: Record<ServicioInput["estado_servicio"], string> = {
  pendiente: "Pendiente diagnóstico",
  prenada: "Confirmado preñada",
  vacia: "Vacía",
  parida: "Parida",
};

// Solo estos estados pueden establecerse manualmente desde el form sin fecha de confirmación.
// 'prenada' se asigna automáticamente al ingresar fecha de confirmación.
// 'parida' la asigna el sistema al registrar el nacimiento.
const ESTADOS_SIN_CONFIRMACION: Array<ServicioInput["estado_servicio"]> = ["pendiente", "vacia"];

function addDays(isoDate: string, days: number): string {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FormHistorial({ animalId, vacaNumero, registro, onDone }: Props) {
  const editing = !!registro;
  const form = useForm<ServicioFormInput>({
    resolver: zodResolver(servicioSchema),
    defaultValues: registro
      ? {
          tipo_servicio: registro.tipo_servicio,
          toro: registro.toro ?? "",
          fecha_monta: registro.fecha_monta,
          fecha_confirmacion: registro.fecha_confirmacion ?? "",
          estado_servicio:
            registro.estado_servicio === "parida" ? "prenada" : registro.estado_servicio,
          observaciones: registro.observaciones ?? "",
        }
      : {
          tipo_servicio: "monta_natural",
          toro: "",
          fecha_monta: "",
          fecha_confirmacion: "",
          estado_servicio: "pendiente",
          observaciones: "",
        },
  });
  const create = useCreateServicio(animalId, vacaNumero);
  const update = useUpdateServicio(animalId);

  const fechaMonta = form.watch("fecha_monta");
  const fechaConfirmacion = form.watch("fecha_confirmacion");
  const estadoActual = form.watch("estado_servicio");
  const hasConfirmacion = !!(fechaConfirmacion && String(fechaConfirmacion).length > 0);
  const esVacia = estadoActual === "vacia";
  const fechaProbableParto = esVacia ? "" : addDays(fechaMonta, 283);

  // Si hay fecha de confirmación → fuerza estado a "prenada".
  useEffect(() => {
    if (hasConfirmacion && estadoActual !== "prenada") {
      form.setValue("estado_servicio", "prenada", { shouldValidate: true });
    }
  }, [hasConfirmacion, estadoActual, form]);

  // Si el usuario marca "vacia" → limpia fecha de confirmación.
  useEffect(() => {
    if (esVacia && hasConfirmacion) {
      form.setValue("fecha_confirmacion", "", { shouldValidate: true });
    }
  }, [esVacia, hasConfirmacion, form]);

  const onSubmit = async (values: ServicioFormInput) => {
    try {
      const parsed = servicioSchema.parse(values);
      if (editing) {
        await update.mutateAsync({ id: registro!.id, input: parsed });
        toast.success("Servicio actualizado");
      } else {
        await create.mutateAsync(parsed);
        toast.success("Servicio registrado");
      }
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const err = (k: keyof ServicioFormInput) =>
    form.formState.errors[k] && (
      <p className="text-sm text-destructive">{form.formState.errors[k]?.message as string}</p>
    );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="tipo_servicio"
          render={({ field }) => (
            <div className="space-y-2">
              <Label className="text-base">Tipo de servicio *</Label>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_LABELS) as Array<keyof typeof TIPO_LABELS>).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err("tipo_servicio")}
            </div>
          )}
        />

        <div className="space-y-2">
          <Label htmlFor="toro" className="text-base">Toro / Pajuela</Label>
          <Input id="toro" className="h-12 text-base" {...form.register("toro")} />
          {err("toro")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha_monta" className="text-base">Fecha de servicio *</Label>
          <Input id="fecha_monta" type="date" className="h-12 text-base" {...form.register("fecha_monta")} />
          {err("fecha_monta")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha_confirmacion" className="text-base">
            Fecha de confirmación de preñez
          </Label>
          <Input
            id="fecha_confirmacion"
            type="date"
            className="h-12 text-base"
            disabled={esVacia}
            {...form.register("fecha_confirmacion")}
          />
          <p className="text-xs text-muted-foreground">
            Opcional. Al ingresarla, el estado pasa a "Confirmado preñada".
          </p>
          {err("fecha_confirmacion")}
        </div>

        {!esVacia && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fecha_probable_parto" className="text-base">
              Fecha probable de parto
            </Label>
            <Input
              id="fecha_probable_parto"
              type="date"
              className="h-12 text-base bg-muted"
              value={fechaProbableParto}
              readOnly
              tabIndex={-1}
            />
            <p className="text-xs text-muted-foreground">Calculada automáticamente (+283 días).</p>
          </div>
        )}

        <Controller
          control={form.control}
          name="estado_servicio"
          render={({ field }) => (
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-base">Estado *</Label>
              <Select value={field.value} onValueChange={field.onChange} disabled={hasConfirmacion}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {hasConfirmacion ? (
                    <SelectItem value="prenada">{ESTADO_LABELS.prenada}</SelectItem>
                  ) : (
                    ESTADOS_SIN_CONFIRMACION.map((e) => (
                      <SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {hasConfirmacion && (
                <p className="text-xs text-muted-foreground">
                  Estado bloqueado por fecha de confirmación. Borra esa fecha para cambiarlo.
                </p>
              )}
              {err("estado_servicio")}
            </div>
          )}
        />

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="observaciones" className="text-base">Observaciones</Label>
          <Textarea id="observaciones" rows={3} className="text-base" {...form.register("observaciones")} />
          {err("observaciones")}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" size="lg" className="min-h-12" disabled={form.formState.isSubmitting}>
          {editing ? "Guardar cambios" : "Registrar servicio"}
        </Button>
      </div>
    </form>
  );
}
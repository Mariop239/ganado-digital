import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  vacunaSchema,
  TIPO_TRATAMIENTO_LABELS,
  type TipoTratamiento,
  type EstadoTratamiento,
} from "../schemas";
import type { VacunaInput } from "../types/domain";
import { OfflineAwareSubmit } from "@/components/ui/offline-aware-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ComboboxFree } from "@/components/ui/combobox-free";
import { DatePicker } from "@/components/ui/date-picker";
import { useCreateVacuna, useVacunasGlobal, useResolverAlerta, useLimpiarProximaDosis } from "../hooks/useVacunas";
import { toast } from "sonner";

type Props = {
  animalId: string;
  alertaId?: string;
  alertaEstado?: "programado" | "aplicado";
  onDone: () => void;
};

export function FormVacuna({ animalId, alertaId, alertaEstado, onDone }: Props) {
  const form = useForm<VacunaInput>({
    resolver: zodResolver(vacunaSchema),
    defaultValues: {
      tipo_tratamiento: "vacuna",
      estado_tratamiento: "aplicado",
      fecha: new Date().toISOString().slice(0, 10),
      vacuna_aplicada: "",
      enfermedad_a_prevenir: "",
      gasto: 0,
      observaciones: "",
      fecha_proxima_dosis: null,
    },
  });
  const create = useCreateVacuna(animalId);
  const resolver = useResolverAlerta();
  const limpiarProxima = useLimpiarProximaDosis();
  const { data: globales } = useVacunasGlobal();
  const productoOptions = (globales ?? [])
    .map((g) => g.vacuna_aplicada)
    .filter(Boolean);

  const estado = form.watch("estado_tratamiento");

  const onSubmit = async (values: VacunaInput) => {
    try {
      if (alertaId && alertaEstado === "aplicado") {
        // Caso B: la alerta proviene de un registro ya aplicado con próxima dosis.
        // Creamos un NUEVO registro aplicado (con la nueva próxima dosis si la hay)
        // y limpiamos la fecha_proxima_dosis del registro antiguo.
        await create.mutateAsync({ ...values, estado_tratamiento: "aplicado" });
        await limpiarProxima.mutateAsync(alertaId);
        toast.success("Tratamiento registrado y alerta resuelta");
      } else if (alertaId) {
        // Caso A: la alerta proviene de un registro programado. Lo marcamos como
        // aplicado y guardamos la próxima dosis (si existe) en ese mismo registro.
        await resolver.mutateAsync({
          id: alertaId,
          fecha: values.fecha || new Date().toISOString().slice(0, 10),
          fechaProximaDosis: values.fecha_proxima_dosis ?? null,
        });
        toast.success("Alerta resuelta y tratamiento registrado");
      } else {
        await create.mutateAsync(values);
        toast.success("Vacuna registrada");
      }
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
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-base">Estado del tratamiento *</Label>
          <Controller
            control={form.control}
            name="estado_tratamiento"
            render={({ field }) => (
              <Tabs
                value={field.value}
                onValueChange={(v) => field.onChange(v as EstadoTratamiento)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="aplicado">Aplicado</TabsTrigger>
                  <TabsTrigger value="programado">Programado</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-base">Tipo de tratamiento *</Label>
          <Controller
            control={form.control}
            name="tipo_tratamiento"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as TipoTratamiento)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_TRATAMIENTO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {err("tipo_tratamiento")}
        </div>
        {estado === "aplicado" && (
          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-base">Fecha de aplicación *</Label>
            <Controller
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <DatePicker
                  id="fecha"
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  placeholder="Selecciona la fecha"
                  disableFuture
                  clearable={false}
                />
              )}
            />
            {err("fecha")}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="gasto" className="text-base">Gasto ($) *</Label>
          <Input id="gasto" type="number" min="0" step="0.01" className="h-12 text-base" {...form.register("gasto", { valueAsNumber: true })} />
          {err("gasto")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-base">Producto / medicamento *</Label>
          <Controller
            control={form.control}
            name="vacuna_aplicada"
            render={({ field }) => (
              <ComboboxFree
                value={field.value ?? ""}
                onChange={field.onChange}
                options={productoOptions}
                placeholder="Selecciona o escribe un producto…"
              />
            )}
          />
          {err("vacuna_aplicada")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="enfermedad_a_prevenir" className="text-base">Enfermedad o motivo</Label>
          <Input id="enfermedad_a_prevenir" className="h-12 text-base" {...form.register("enfermedad_a_prevenir")} />
          {err("enfermedad_a_prevenir")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-base">
            {estado === "programado"
              ? "Fecha programada *"
              : "Fecha de próxima dosis / refuerzo (opcional)"}
          </Label>
          <Controller
            control={form.control}
            name="fecha_proxima_dosis"
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={field.onChange}
                placeholder="Sin programar"
                disablePast
              />
            )}
          />
          {err("fecha_proxima_dosis")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="observaciones" className="text-base">Observaciones</Label>
          <Textarea id="observaciones" rows={3} className="text-base" {...form.register("observaciones")} />
          {err("observaciones")}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <OfflineAwareSubmit label="Registrar tratamiento" submitting={form.formState.isSubmitting} />
      </div>
    </form>
  );
}
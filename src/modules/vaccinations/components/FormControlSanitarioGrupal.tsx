import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OfflineAwareSubmit } from "@/components/ui/offline-aware-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ComboboxFree } from "@/components/ui/combobox-free";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { useAnimals } from "@/modules/animals/hooks/useAnimals";
import {
  vacunaSchema,
  TIPO_TRATAMIENTO_LABELS,
  type TipoTratamiento,
  type EstadoTratamiento,
} from "../schemas";
import type { VacunaInput } from "../types/domain";
import { useCreateVacunasBulk, useVacunasGlobal } from "../hooks/useVacunas";

type Props = { onDone: () => void };

export function FormControlSanitarioGrupal({ onDone }: Props) {
  const { data: animales, isLoading: loadingAnimales } = useAnimals({ estado_actual: "activa" });
  const { data: globales } = useVacunasGlobal();
  const productoOptions = (globales ?? []).map((g) => g.vacuna_aplicada).filter(Boolean);

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const form = useForm<VacunaInput>({
    resolver: zodResolver(vacunaSchema),
    defaultValues: {
      tipo_tratamiento: "vacuna",
      estado_tratamiento: "aplicado",
      fecha: format(new Date(), "yyyy-MM-dd"),
      vacuna_aplicada: "",
      enfermedad_a_prevenir: "",
      gasto: 0,
      observaciones: "",
      fecha_proxima_dosis: null,
    },
  });
  const estado = form.watch("estado_tratamiento");
  const bulk = useCreateVacunasBulk();

  const lista = useMemo(() => {
    const rows = animales ?? [];
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((a) =>
      [a.numero, a.nombre].filter(Boolean).some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [animales, q]);

  const toggle = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleTodos = (checked: boolean) => {
    if (!checked) return setSeleccionados(new Set());
    setSeleccionados(new Set(lista.map((a) => a.id)));
  };
  const todosVisibles =
    lista.length > 0 && lista.every((a) => seleccionados.has(a.id));

  const onSubmit = async (values: VacunaInput) => {
    if (seleccionados.size === 0) {
      toast.error("Selecciona al menos un animal");
      return;
    }
    const objetivos = (animales ?? [])
      .filter((a) => seleccionados.has(a.id))
      .map((a) => ({ animal_id: a.id, vaca_numero: a.numero }));
    try {
      const n = await bulk.mutateAsync({ animales: objetivos, input: values });
      toast.success(`Registrado en ${n} animales`);
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const err = (k: keyof VacunaInput) =>
    form.formState.errors[k] && (
      <p className="text-sm text-destructive">
        {form.formState.errors[k]?.message as string}
      </p>
    );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base">Animales activos *</Label>
          <Badge variant="secondary">{seleccionados.size} seleccionados</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número o nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9"
          />
          {q && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={() => setQ("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Checkbox
              id="todos-grupal"
              checked={todosVisibles}
              onCheckedChange={(c) => toggleTodos(c === true)}
            />
            <Label htmlFor="todos-grupal" className="cursor-pointer text-sm">
              Seleccionar todos los visibles ({lista.length})
            </Label>
          </div>
          <ScrollArea className="h-56">
            <div className="divide-y divide-border">
              {loadingAnimales && (
                <div className="px-3 py-4 text-sm text-muted-foreground">Cargando animales…</div>
              )}
              {!loadingAnimales && lista.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  Sin animales activos.
                </div>
              )}
              {lista.map((a) => {
                const id = `anim-${a.id}`;
                const checked = seleccionados.has(a.id);
                return (
                  <label
                    key={a.id}
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={() => toggle(a.id)}
                    />
                    <span className="text-sm font-medium">#{a.numero}</span>
                    {a.nombre && (
                      <span className="text-sm text-muted-foreground">— {a.nombre}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
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

        <div className="space-y-2">
          <Label className="text-base">Tipo de tratamiento *</Label>
          <Controller
            control={form.control}
            name="tipo_tratamiento"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v as TipoTratamiento)}
              >
                <SelectTrigger className="h-11">
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

        <div className="space-y-2">
          <Label htmlFor="gasto-grupal" className="text-base">Gasto por animal ($)</Label>
          <Input
            id="gasto-grupal"
            type="number"
            min="0"
            step="0.01"
            className="h-11"
            {...form.register("gasto", { valueAsNumber: true })}
          />
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

        {estado === "aplicado" && (
          <div className="space-y-2">
            <Label htmlFor="fecha-grupal" className="text-base">Fecha de aplicación *</Label>
            <Controller
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <DatePicker
                  id="fecha-grupal"
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

        <div className={cn("space-y-2", estado === "programado" && "sm:col-span-2")}>
          <Label className="text-base">
            {estado === "programado"
              ? "Fecha programada *"
              : "Próxima dosis (opcional)"}
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
          <Label htmlFor="obs-grupal" className="text-base">Observaciones</Label>
          <Textarea id="obs-grupal" rows={2} {...form.register("observaciones")} />
        </div>
      </section>

      <div className="flex justify-end gap-2 pt-2">
        <OfflineAwareSubmit
          label={`Registrar en ${seleccionados.size || 0} animales`}
          submitting={form.formState.isSubmitting || bulk.isPending}
        />
      </div>
    </form>
  );
}
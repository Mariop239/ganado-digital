import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { AlertTriangle, Search, X, Layers } from "lucide-react";
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
import {
  useCreateVacunasBulk,
  useResolverAlertasBulk,
  useVacunasGlobal,
} from "../hooks/useVacunas";

type Props = {
  onDone: () => void;
  alertasIds?: string[];
  modoResolucion?: boolean;
  animalesIdsPreseleccionados?: string[];
  modoResolucionTipo?: "update" | "create_and_clear";
  prefill?: {
    tipo_tratamiento?: TipoTratamiento;
    vacuna_aplicada?: string;
    enfermedad_a_prevenir?: string;
    fecha_proxima_dosis?: string | null;
  };
};

export function FormControlSanitarioGrupal({
  onDone,
  alertasIds,
  modoResolucion = false,
  animalesIdsPreseleccionados,
  modoResolucionTipo = "update",
  prefill,
}: Props) {
  const { data: animales, isLoading: loadingAnimales } = useAnimals({ estado_actual: "activa" });
  const { data: globales } = useVacunasGlobal();
  const productoOptions = (globales ?? []).map((g) => g.vacuna_aplicada).filter(Boolean);

  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    () => new Set(animalesIdsPreseleccionados ?? []),
  );
  const [q, setQ] = useState("");
  const [loteFiltro, setLoteFiltro] = useState<string>("todos");

  const form = useForm<VacunaInput>({
    resolver: zodResolver(vacunaSchema),
    defaultValues: {
      tipo_tratamiento: (prefill?.tipo_tratamiento as TipoTratamiento) ?? "vacuna",
      estado_tratamiento: "aplicado",
      fecha: format(new Date(), "yyyy-MM-dd"),
      vacuna_aplicada: prefill?.vacuna_aplicada ?? "",
      enfermedad_a_prevenir: prefill?.enfermedad_a_prevenir ?? "",
      gasto: 0,
      observaciones: "",
      fecha_proxima_dosis: prefill?.fecha_proxima_dosis ?? null,
    },
  });
  const estado = form.watch("estado_tratamiento");
  const bulk = useCreateVacunasBulk();
  const resolver = useResolverAlertasBulk();

  // Obtener lista de lotes únicos de los animales activos
  const lotesDisponibles = useMemo(() => {
    const set = new Set<string>();
    (animales ?? []).forEach((a) => {
      if (a.lote_actual?.trim()) set.add(a.lote_actual.trim());
    });
    return Array.from(set).sort();
  }, [animales]);

  // Mantén la pre-selección sincronizada cuando lleguen los animales
  useEffect(() => {
    if (modoResolucion && animalesIdsPreseleccionados?.length) {
      setSeleccionados(new Set(animalesIdsPreseleccionados));
    }
  }, [modoResolucion, animalesIdsPreseleccionados]);

  const lista = useMemo(() => {
    let rows = animales ?? [];
    if (modoResolucion && animalesIdsPreseleccionados?.length) {
      const set = new Set(animalesIdsPreseleccionados);
      return rows.filter((a) => set.has(a.id));
    }
    
    // Filtro por lote
    if (loteFiltro !== "todos") {
      rows = rows.filter((a) => a.lote_actual === loteFiltro);
    }

    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((a) =>
      [a.numero, a.nombre].filter(Boolean).some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [animales, q, modoResolucion, animalesIdsPreseleccionados, loteFiltro]);

  const toggle = (id: string) => {
    if (modoResolucion) return;
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const toggleTodos = (checked: boolean) => {
    if (modoResolucion) return;
    if (!checked) {
      // Si estamos filtrando por lote, solo deseleccionamos los del lote visible
      if (loteFiltro !== "todos") {
        setSeleccionados((prev) => {
          const next = new Set(prev);
          lista.forEach((a) => next.delete(a.id));
          return next;
        });
      } else {
        setSeleccionados(new Set());
      }
      return;
    }
    setSeleccionados((prev) => {
      const next = new Set(prev);
      lista.forEach((a) => next.add(a.id));
      return next;
    });
  };

  const selectPorLote = (lote: string) => {
    setLoteFiltro(lote);
    if (lote !== "todos") {
      const idsDelLote = (animales ?? [])
        .filter((a) => a.lote_actual === lote)
        .map((a) => a.id);
      setSeleccionados((prev) => {
        const next = new Set(prev);
        idsDelLote.forEach((id) => next.add(id));
        return next;
      });
      toast.info(`Lote "${lote}" seleccionado (${idsDelLote.length} animales)`);
    }
  };

  const todosVisibles =
    lista.length > 0 && lista.every((a) => seleccionados.has(a.id));

  const onSubmit = async (values: VacunaInput) => {
    if (modoResolucion) {
      if (!alertasIds?.length) {
        toast.error("No hay alertas para resolver");
        return;
      }
      try {
        const { count } = await resolver.mutateAsync({
          ids: alertasIds,
          input: values,
          modo: modoResolucionTipo,
        });
        toast.success(`Lote resuelto en ${count} animales`);
        onDone();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Error al resolver el lote");
      }
      return;
    }
    if (seleccionados.size === 0) {
      toast.error("Selecciona al menos un animal");
      return;
    }
    const objetivos = (animales ?? [])
      .filter((a) => seleccionados.has(a.id))
      .map((a) => ({ animal_id: a.id }));
    try {
      const { count } = await bulk.mutateAsync({ animales: objetivos, input: values });
      toast.success(`Registrado en ${count} animales`);
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
      {modoResolucion && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Resolviendo {alertasIds?.length ?? 0} alertas pendientes del lote.
            Los animales del lote original están bloqueados para mantener la
            consistencia.
          </p>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            {modoResolucion ? "Animales del lote" : "Selección de animales *"}
          </Label>
          <Badge variant="secondary" className="h-6">{seleccionados.size} seleccionados</Badge>
        </div>

        {!modoResolucion && (
          <div className="grid gap-3 sm:grid-cols-2">
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

            <div className="relative">
              <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Select value={loteFiltro} onValueChange={selectPorLote}>
                <SelectTrigger className="h-11 pl-9">
                  <SelectValue placeholder="Seleccionar por lote" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los animales</SelectItem>
                  {lotesDisponibles.map((lote) => (
                    <SelectItem key={lote} value={lote}>
                      Lote: {lote}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {!modoResolucion && (
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
              <Checkbox
                id="todos-grupal"
                checked={todosVisibles}
                onCheckedChange={(c) => toggleTodos(c === true)}
              />
              <Label htmlFor="todos-grupal" className="cursor-pointer text-sm font-medium">
                {loteFiltro === "todos" 
                  ? `Seleccionar todos (${lista.length})` 
                  : `Seleccionar todo el lote "${loteFiltro}" (${lista.length})`}
              </Label>
            </div>
          )}
          <ScrollArea className="h-56">
            <div className="divide-y divide-border">
              {loadingAnimales && (
                <div className="px-3 py-4 text-sm text-muted-foreground">Cargando animales…</div>
              )}
              {!loadingAnimales && lista.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No se encontraron animales {loteFiltro !== "todos" ? `en el lote "${loteFiltro}"` : ""}.
                </div>
              )}
              {lista.map((a) => {
                const id = `anim-${a.id}`;
                const checked = seleccionados.has(a.id);
                return (
                  <label
                    key={a.id}
                    htmlFor={id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 transition-colors",
                      modoResolucion
                        ? "cursor-not-allowed opacity-90"
                        : "cursor-pointer hover:bg-muted/50",
                      checked && !modoResolucion && "bg-primary/5"
                    )}
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      disabled={modoResolucion}
                      onCheckedChange={() => toggle(a.id)}
                    />
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-semibold text-foreground">#{a.numero}</span>
                      {a.nombre && (
                        <span className="text-xs text-muted-foreground">{a.nombre}</span>
                      )}
                    </div>
                    {a.lote_actual && loteFiltro === "todos" && (
                      <Badge variant="outline" className="text-[10px] font-normal px-1.5 h-5">
                        {a.lote_actual}
                      </Badge>
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
          <Label className="text-base font-semibold">Estado del tratamiento *</Label>
          <Controller
            control={form.control}
            name="estado_tratamiento"
            render={({ field }) => (
              <Tabs
                value={field.value}
                onValueChange={(v) => field.onChange(v as EstadoTratamiento)}
              >
                <TabsList className="grid w-full grid-cols-2 h-11">
                  <TabsTrigger value="aplicado" className="text-sm">Aplicado</TabsTrigger>
                  <TabsTrigger value="programado" className="text-sm">Programado</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Tipo de tratamiento *</Label>
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
          <Label htmlFor="gasto-grupal" className="text-base font-semibold">Gasto por animal ($)</Label>
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
          <Label className="text-base font-semibold">Producto / medicamento *</Label>
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
            <Label htmlFor="fecha-grupal" className="text-base font-semibold">Fecha de aplicación *</Label>
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
          <Label className="text-base font-semibold">
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
                toYear={new Date().getFullYear() + 5}
              />
            )}
          />
          {err("fecha_proxima_dosis")}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="obs-grupal" className="text-base font-semibold">Observaciones</Label>
          <Textarea id="obs-grupal" rows={2} {...form.register("observaciones")} />
        </div>
      </section>

      <div className="flex justify-end gap-2 pt-2">
        <OfflineAwareSubmit
          label={
            modoResolucion
              ? `Resolver ${alertasIds?.length ?? 0} alertas`
              : `Registrar en ${seleccionados.size || 0} animales`
          }
          submitting={
            form.formState.isSubmitting || bulk.isPending || resolver.isPending
          }
        />
      </div>
    </form>
  );
}

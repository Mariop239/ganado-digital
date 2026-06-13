import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Layers, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { ComboboxFree } from "@/components/ui/combobox-free";
import { cn } from "@/lib/utils";
import { useAnimals } from "@/modules/animals/hooks/useAnimals";
import { useCreateBulkEvent } from "../hooks/useAnimalEvents";
import { useCreateBulkServicio } from "@/modules/breeding";
import type { AnimalEventInput } from "../types/domain";

type Modulo = "general" | "reproductivo";
type TipoGeneral = "venta" | "traslado" | "otro";
type TipoRepro = "inseminacion" | "palpacion";
type Estado = "hecho" | "programado";

const TIPOS_GENERAL: { value: TipoGeneral; label: string }[] = [
  { value: "venta", label: "Venta" },
  { value: "traslado", label: "Traslado" },
  { value: "otro", label: "Otro" },
];

const TIPOS_REPRO: { value: TipoRepro; label: string }[] = [
  { value: "inseminacion", label: "Inseminación" },
  { value: "palpacion", label: "Palpación" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function MultiAnimalSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const { data: animals = [], isLoading } = useAnimals({ estado_actual: "activa" });
  const [q, setQ] = useState("");
  const [loteFiltro, setLoteFiltro] = useState<string>("todos");
  const selected = useMemo(() => new Set(value), [value]);

  const lotesDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const a of animals) {
      if (a.lote_actual?.trim()) set.add(a.lote_actual.trim());
    }
    return Array.from(set).sort();
  }, [animals]);

  const lista = useMemo(() => {
    let rows = animals;
    if (loteFiltro !== "todos") {
      rows = rows.filter((a) => a.lote_actual === loteFiltro);
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter((a) =>
        [a.numero, a.nombre]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s)),
      );
    }
    return rows;
  }, [animals, q, loteFiltro]);

  const toggle = (id: string) => {
    if (selected.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const toggleVisibles = (checked: boolean) => {
    if (!checked) {
      const visibles = new Set(lista.map((a) => a.id));
      onChange(value.filter((v) => !visibles.has(v)));
      return;
    }
    const next = new Set(value);
    for (const a of lista) next.add(a.id);
    onChange(Array.from(next));
  };

  const seleccionarPorLote = (lote: string) => {
    setLoteFiltro(lote);
    if (lote !== "todos") {
      const ids = animals.filter((a) => a.lote_actual === lote).map((a) => a.id);
      const next = new Set(value);
      ids.forEach((id) => next.add(id));
      onChange(Array.from(next));
      toast.info(`Lote "${lote}" añadido (${ids.length} animales)`);
    }
  };

  const todosVisibles = lista.length > 0 && lista.every((a) => selected.has(a.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Solo animales activos
        </span>
        <Badge variant="secondary" className="h-6">
          {value.length} seleccionado{value.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
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
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="relative">
          <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Select value={loteFiltro} onValueChange={seleccionarPorLote}>
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

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <Checkbox
            id="todos-evento-grupal"
            checked={todosVisibles}
            onCheckedChange={(c) => toggleVisibles(c === true)}
          />
          <Label
            htmlFor="todos-evento-grupal"
            className="cursor-pointer text-sm font-medium"
          >
            {loteFiltro === "todos"
              ? `Seleccionar todos (${lista.length})`
              : `Seleccionar lote "${loteFiltro}" (${lista.length})`}
          </Label>
        </div>
        <ScrollArea className="h-56">
          <div className="divide-y divide-border">
            {isLoading && (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                Cargando animales…
              </div>
            )}
            {!isLoading && lista.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No se encontraron animales activos
                {loteFiltro !== "todos" ? ` en el lote "${loteFiltro}"` : ""}.
              </div>
            )}
            {lista.map((a) => {
              const id = `evt-anim-${a.id}`;
              const checked = selected.has(a.id);
              return (
                <label
                  key={a.id}
                  htmlFor={id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50",
                    checked && "bg-primary/5",
                  )}
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={() => toggle(a.id)}
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      #{a.numero}
                    </span>
                    {a.nombre && (
                      <span className="text-xs text-muted-foreground">
                        {a.nombre}
                      </span>
                    )}
                  </div>
                  {a.lote_actual && loteFiltro === "todos" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal px-1.5 h-5"
                    >
                      {a.lote_actual}
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export function DialogoEventoGrupal() {
  const [open, setOpen] = useState(false);
  const [animalIds, setAnimalIds] = useState<string[]>([]);
  const [modulo, setModulo] = useState<Modulo>("general");

  // General
  const [tipoGeneral, setTipoGeneral] = useState<TipoGeneral>("venta");
  const [estado, setEstado] = useState<Estado>("hecho");
  const [fechaRegistro, setFechaRegistro] = useState<string>(todayISO());
  const [fechaEjecucion, setFechaEjecucion] = useState<string>("");
  const [comprador, setComprador] = useState("");
  const [valor, setValor] = useState<string>("");
  const [destino, setDestino] = useState("");
  const [lote, setLote] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Reproductivo
  const [tipoRepro, setTipoRepro] = useState<TipoRepro>("inseminacion");
  const [fechaMonta, setFechaMonta] = useState<string>(todayISO());
  const [fechaPalpado, setFechaPalpado] = useState<string>("");
  const [toro, setToro] = useState("");

  const { data: animals } = useAnimals();
  const { ubicacionOptions, loteOptions } = useMemo(() => {
    const u = new Set<string>(["Mi rancho"]);
    const l = new Set<string>();
    for (const a of animals ?? []) {
      if (a.ubicacion_actual?.trim()) u.add(a.ubicacion_actual.trim());
      if (a.lote_actual?.trim()) l.add(a.lote_actual.trim());
    }
    return { ubicacionOptions: [...u], loteOptions: [...l] };
  }, [animals]);

  const createBulkEvent = useCreateBulkEvent();
  const createBulkServicio = useCreateBulkServicio();

  const reset = () => {
    setAnimalIds([]);
    setModulo("general");
    setTipoGeneral("venta");
    setEstado("hecho");
    setFechaRegistro(todayISO());
    setFechaEjecucion("");
    setComprador("");
    setValor("");
    setDestino("");
    setLote("");
    setMotivo("");
    setObservaciones("");
    setTipoRepro("inseminacion");
    setFechaMonta(todayISO());
    setFechaPalpado("");
    setToro("");
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const submitGeneral = async () => {
    if (estado === "programado" && !fechaEjecucion) {
      toast.error("Selecciona la fecha de ejecución programada");
      return;
    }
    let payload: Record<string, unknown> = {};
    if (tipoGeneral === "venta") {
      if (!comprador.trim()) {
        toast.error("Comprador requerido");
        return;
      }
      const v = Number(valor);
      if (Number.isNaN(v) || v < 0) {
        toast.error("Valor inválido");
        return;
      }
      payload = { comprador: comprador.trim(), valor: v };
    } else if (tipoGeneral === "traslado") {
      if (!destino.trim()) {
        toast.error("Destino requerido");
        return;
      }
      payload = { destino: destino.trim(), ...(lote.trim() ? { lote: lote.trim() } : {}) };
    } else {
      if (!motivo.trim()) {
        toast.error("Motivo requerido");
        return;
      }
      payload = { motivo: motivo.trim() };
    }

    const input: AnimalEventInput = {
      tipo: tipoGeneral,
      fecha: fechaRegistro,
      payload: payload as never,
      observaciones: observaciones.trim() || null,
      estado,
      fecha_ejecucion: estado === "programado" ? fechaEjecucion : null,
    };
    await createBulkEvent.mutateAsync({ animalIds, input });
    toast.success(
      `${TIPOS_GENERAL.find((t) => t.value === tipoGeneral)?.label} registrado en ${animalIds.length} animales`,
    );
    handleOpenChange(false);
  };

  const submitReproductivo = async () => {
    if (!toro.trim()) {
      toast.error("Toro requerido");
      return;
    }
    if (tipoRepro === "palpacion" && !fechaPalpado) {
      toast.error("Fecha de palpación requerida");
      return;
    }
    await createBulkServicio.mutateAsync({
      animalIds,
      input: {
        tipo_servicio: "inseminacion",
        toro: toro.trim(),
        fecha_monta: fechaMonta,
        fecha_palpado: tipoRepro === "palpacion" ? fechaPalpado : null,
        observaciones: observaciones.trim() || null,
      },
    });
    toast.success(
      `${tipoRepro === "inseminacion" ? "Inseminación" : "Palpación"} registrada en ${animalIds.length} animales`,
    );
    handleOpenChange(false);
  };

  const onSubmit = async () => {
    if (animalIds.length === 0) {
      toast.error("Selecciona al menos un animal");
      return;
    }
    try {
      if (modulo === "general") await submitGeneral();
      else await submitReproductivo();
    } catch (e) {
      console.error("[DialogoEventoGrupal] save failed", e);
      const msg =
        e instanceof Error ? e.message : "Error al guardar el evento grupal";
      toast.error(msg, { duration: 10000 });
    }
  };

  const isSubmitting =
    createBulkEvent.isPending || createBulkServicio.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="min-h-12">
          <Layers className="mr-2 h-5 w-5" />
          Registrar Evento Grupal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Evento Grupal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base">Animales *</Label>
            <MultiAnimalSelector value={animalIds} onChange={setAnimalIds} />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Módulo *</Label>
            <Select value={modulo} onValueChange={(v) => setModulo(v as Modulo)}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="reproductivo">Reproductivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {modulo === "general" ? (
            <>
              <div className="space-y-2">
                <Label className="text-base">Tipo *</Label>
                <Select
                  value={tipoGeneral}
                  onValueChange={(v) => setTipoGeneral(v as TipoGeneral)}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_GENERAL.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Estado *</Label>
                <Select value={estado} onValueChange={(v) => setEstado(v as Estado)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hecho">Hecho</SelectItem>
                    <SelectItem value="programado">Programado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Fecha de registro *</Label>
                <DatePicker
                  value={fechaRegistro || null}
                  onChange={(v) => setFechaRegistro(v ?? "")}
                  disableFuture
                  clearable={false}
                />
              </div>

              {estado === "programado" && (
                <div className="space-y-2">
                  <Label className="text-base">Fecha de ejecución *</Label>
                  <DatePicker
                    value={fechaEjecucion || null}
                    onChange={(v) => setFechaEjecucion(v ?? "")}
                    disablePast
                    placeholder="Fecha futura del evento"
                  />
                </div>
              )}

              {tipoGeneral === "venta" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-base">Comprador *</Label>
                    <Input
                      className="h-12 text-base"
                      value={comprador}
                      onChange={(e) => setComprador(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base">Valor *</Label>
                    <Input
                      type="number"
                      step="any"
                      className="h-12 text-base"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                    />
                  </div>
                </>
              )}

              {tipoGeneral === "traslado" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-base">Destino *</Label>
                    <ComboboxFree
                      value={destino}
                      onChange={setDestino}
                      options={ubicacionOptions}
                      placeholder="Seleccionar o escribir ubicación…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base">Lote</Label>
                    <ComboboxFree
                      value={lote}
                      onChange={setLote}
                      options={loteOptions}
                      placeholder="Seleccionar o escribir lote…"
                    />
                  </div>
                </>
              )}

              {tipoGeneral === "otro" && (
                <div className="space-y-2">
                  <Label className="text-base">Motivo *</Label>
                  <Textarea
                    rows={3}
                    className="text-base"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-base">Tipo *</Label>
                <Select
                  value={tipoRepro}
                  onValueChange={(v) => setTipoRepro(v as TipoRepro)}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_REPRO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se registrará como servicio en estado "pendiente".
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Toro / Semen *</Label>
                <Input
                  className="h-12 text-base"
                  value={toro}
                  onChange={(e) => setToro(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Fecha de servicio *</Label>
                <DatePicker
                  value={fechaMonta || null}
                  onChange={(v) => setFechaMonta(v ?? "")}
                  disableFuture
                  clearable={false}
                />
              </div>

              {tipoRepro === "palpacion" && (
                <div className="space-y-2">
                  <Label className="text-base">Fecha de palpación *</Label>
                  <DatePicker
                    value={fechaPalpado || null}
                    onChange={(v) => setFechaPalpado(v ?? "")}
                    placeholder="Cuándo se palpó / se palpará"
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label className="text-base">Observaciones</Label>
            <Textarea
              rows={2}
              className="text-base"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="lg"
              className="min-h-12"
              onClick={onSubmit}
              disabled={isSubmitting || animalIds.length === 0}
            >
              {isSubmitting ? "Guardando…" : "Registrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Layers, X } from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const { data: animals = [] } = useAnimals();
  const activos = useMemo(
    () => animals.filter((a) => a.estado_actual === "activa"),
    [animals],
  );
  const [open, setOpen] = useState(false);
  const selected = new Set(value);

  const toggle = (id: string) => {
    if (selected.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "min-h-12 w-full justify-between text-base font-normal",
              value.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate">
              {value.length === 0
                ? "Seleccionar animales…"
                : `${value.length} animal${value.length === 1 ? "" : "es"} seleccionado${value.length === 1 ? "" : "s"}`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar por número o nombre…" />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {activos.map((a) => {
                  const isSel = selected.has(a.id);
                  return (
                    <CommandItem
                      key={a.id}
                      value={`${a.numero} ${a.nombre ?? ""}`}
                      onSelect={() => toggle(a.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSel ? "opacity-100" : "opacity-0",
                        )}
                      />
                      #{a.numero}
                      {a.nombre ? ` · ${a.nombre}` : ""}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const a = activos.find((x) => x.id === id);
            if (!a) return null;
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                #{a.numero}
                {a.nombre ? ` · ${a.nombre}` : ""}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                  aria-label={`Quitar ${a.numero}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
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
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Search,
  Activity,
  Baby,
  HeartPulse,
  ArrowDownRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAnimals } from "../hooks/useAnimals";
import { FormAnimal } from "./FormAnimal";
import { CATEGORIA_LABELS, SEXO_LABELS } from "../constants/categorias";
import { ESTADO_ACTUAL_LABELS, ESTADO_REPRODUCTIVO_LABELS } from "../constants/estados";
import type { Sexo, Categoria, AnimalView } from "../types/domain";

type KpiKey = "activos" | "gestantes" | "crianza" | "egresados";

type KpiDef = {
  key: KpiKey;
  label: string;
  icon: LucideIcon;
  match: (a: AnimalView) => boolean;
  accent: string; // tailwind text color for icon
};

const CRIANZA_CATS: Categoria[] = ["ternero", "ternera", "novilla"];

const KPIS: KpiDef[] = [
  {
    key: "activos",
    label: "Total activos",
    icon: Activity,
    match: (a) => a.estado_actual === "activa",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "gestantes",
    label: "Gestantes",
    icon: HeartPulse,
    match: (a) =>
      a.estado_actual === "activa" &&
      a.sexo === "hembra" &&
      a.estado_reproductivo === "gestante",
    accent: "text-pink-600 dark:text-pink-400",
  },
  {
    key: "crianza",
    label: "Crianza",
    icon: Baby,
    match: (a) =>
      a.estado_actual === "activa" && CRIANZA_CATS.includes(a.categoria_view),
    accent: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "egresados",
    label: "Egresados",
    icon: ArrowDownRight,
    match: (a) => a.estado_actual !== "activa",
    accent: "text-destructive",
  },
];

export function ListaAnimales() {
  const [q, setQ] = useState("");
  const [kpi, setKpi] = useState<KpiKey>("activos");
  const [sexo, setSexo] = useState<Sexo | "todos">("todos");
  const [categoria, setCategoria] = useState<Categoria | "todas">("todas");
  const [ubicacion, setUbicacion] = useState<string>("todas");
  const [lote, setLote] = useState<string>("todos");
  const [dueno, setDueno] = useState<string>("todos");
  const [causa, setCausa] = useState<"todas" | "vendida" | "fallecida">("todas");
  const [open, setOpen] = useState(false);
  // Traemos TODO el catálogo y filtramos en cliente para que los KPIs
  // (incluido "Egresados") reflejen la realidad completa del rancho.
  const { data, isLoading } = useAnimals({
    sexo: sexo === "todos" ? undefined : sexo,
  });

  const isEgresados = kpi === "egresados";

  // Animales que pasan los filtros contextuales (ubicación/lote para activos,
  // causa para egresados). Los KPI cards cuentan sobre esta base para ser
  // reactivos al contexto seleccionado.
  const contextScoped = useMemo(() => {
    if (!data) return [];
    return data.filter((a) => {
      if (isEgresados) {
        if (causa !== "todas" && a.estado_actual !== causa) return false;
      } else {
        if (ubicacion !== "todas") {
          const u = (a.ubicacion_actual ?? "").trim() || "Mi rancho";
          if (u !== ubicacion) return false;
        }
        if (lote !== "todos") {
          const l = (a.lote_actual ?? "").trim();
          if (l !== lote) return false;
        }
      }
      if (dueno !== "todos") {
        const owners = (a.dueno ?? []).map((d) => d.trim()).filter(Boolean);
        if (!owners.some((o) => o.toLowerCase() === dueno.toLowerCase())) return false;
      }
      return true;
    });
  }, [data, ubicacion, lote, causa, dueno, isEgresados]);

  const counts = useMemo(() => {
    const base = Object.fromEntries(KPIS.map((k) => [k.key, 0])) as Record<KpiKey, number>;
    for (const a of contextScoped) {
      for (const k of KPIS) if (k.match(a)) base[k.key]++;
    }
    return base;
  }, [contextScoped]);

  const ubicaciones = useMemo(() => {
    const set = new Set<string>();
    for (const a of data ?? []) {
      const u = (a.ubicacion_actual ?? "").trim() || "Mi rancho";
      set.add(u);
    }
    return Array.from(set).sort();
  }, [data]);

  const lotes = useMemo(() => {
    const set = new Set<string>();
    for (const a of data ?? []) {
      const l = (a.lote_actual ?? "").trim();
      if (l) set.add(l);
    }
    return Array.from(set).sort();
  }, [data]);

  const duenos = useMemo(() => {
    const set = new Set<string>();
    for (const a of data ?? []) {
      for (const d of a.dueno ?? []) {
        const t = d?.trim();
        if (t) set.add(t);
      }
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const kpiDef = KPIS.find((k) => k.key === kpi)!;
    return contextScoped.filter((a) => {
      if (!kpiDef.match(a)) return false;
      if (categoria !== "todas" && a.categoria_view !== categoria) return false;
      if (!term) return true;
      return a.numero.toLowerCase().includes(term) || a.nombre.toLowerCase().includes(term);
    });
  }, [contextScoped, q, categoria, kpi]);

  const totalKpi = counts[kpi] ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Animales</h1>
          <p className="text-sm text-muted-foreground">Resumen del rancho</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-12">
              <Plus className="mr-2 h-5 w-5" /> Crear animal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo animal</DialogTitle>
            </DialogHeader>
            <FormAnimal onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI dashboard */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPIS.map(({ key, label, icon: Icon, accent }) => {
          const active = kpi === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setKpi(key)}
              aria-pressed={active}
              className={cn(
                "group rounded-lg border bg-card p-4 text-left transition-all",
                "hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary ring-2 ring-primary/30 bg-primary/5 shadow-sm"
                  : "border-border",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
                <Icon
                  className={cn(
                    "h-4 w-4 transition-transform group-hover:scale-110",
                    active ? "text-primary" : accent,
                  )}
                />
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">
                {isLoading ? "—" : counts[key]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtros de ubicación / lote */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {isEgresados ? (
          <>
            <Select value={causa} onValueChange={(v) => setCausa(v as typeof causa)}>
              <SelectTrigger className="h-11 w-full sm:w-56">
                <SelectValue placeholder="Filtrar por causa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las causas</SelectItem>
                <SelectItem value="vendida">Vendido</SelectItem>
                <SelectItem value="fallecida">Fallecido</SelectItem>
              </SelectContent>
            </Select>
            {causa !== "todas" && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start sm:self-auto"
                onClick={() => setCausa("todas")}
              >
                Limpiar filtro
              </Button>
            )}
          </>
        ) : (
          <>
            <Select value={ubicacion} onValueChange={setUbicacion}>
              <SelectTrigger className="h-11 w-full sm:w-56">
                <SelectValue placeholder="Filtrar por ubicación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las ubicaciones</SelectItem>
                {ubicaciones.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lote} onValueChange={setLote}>
              <SelectTrigger className="h-11 w-full sm:w-56">
                <SelectValue placeholder="Filtrar por lote" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los lotes</SelectItem>
                {lotes.length === 0 ? (
                  <SelectItem value="__none" disabled>Sin lotes registrados</SelectItem>
                ) : (
                  lotes.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Select value={dueno} onValueChange={setDueno}>
              <SelectTrigger className="h-11 w-full sm:w-56">
                <SelectValue placeholder="Filtrar por dueño" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los dueños</SelectItem>
                {duenos.length === 0 ? (
                  <SelectItem value="__none" disabled>Sin dueños registrados</SelectItem>
                ) : (
                  duenos.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {(ubicacion !== "todas" || lote !== "todos" || dueno !== "todos") && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start sm:self-auto"
                onClick={() => {
                  setUbicacion("todas");
                  setLote("todos");
                  setDueno("todos");
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número o nombre…"
            className="h-12 pl-11 text-base"
          />
        </div>
        <Select value={sexo} onValueChange={(v) => setSexo(v as Sexo | "todos")}>
          <SelectTrigger className="h-12 w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los sexos</SelectItem>
            <SelectItem value="hembra">{SEXO_LABELS.hembra}</SelectItem>
            <SelectItem value="macho">{SEXO_LABELS.macho}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoria} onValueChange={(v) => setCategoria(v as Categoria | "todas")}>
          <SelectTrigger className="h-12 w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {(Object.keys(CATEGORIA_LABELS) as Categoria[]).map((c) => (
              <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {q ? "Sin resultados para esa búsqueda." : "Aún no hay animales registrados."}
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">{filtered.length}</span> animales de{" "}
            <span className="font-medium text-foreground">{totalKpi}</span> en total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selected.size === filtered.length ? clearSelection : selectAllVisible}
            >
              {selected.size === filtered.length ? "Limpiar selección" : "Seleccionar todos"}
            </Button>
            {selected.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selected.size} seleccionados
              </span>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const isSel = selected.has(a.id);
            return (
              <Card
                key={a.id}
                className={cn(
                  "relative h-full transition-colors hover:bg-secondary/50",
                  isSel && "ring-2 ring-primary",
                )}
              >
                <div className="absolute left-3 top-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSel}
                    onCheckedChange={() => toggleSelect(a.id)}
                    aria-label={`Seleccionar ${a.numero}`}
                  />
                </div>
                <Link
                  to="/animales/$numero"
                  params={{ numero: a.numero }}
                  search={a.estado_actual !== "activa" ? { id: a.id } : {}}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                >
                  <CardContent className="space-y-1 p-4 pl-10">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-lg font-semibold text-foreground">#{a.numero}</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {a.requiere_clasificacion && (
                          <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                            Requiere clasificación
                          </span>
                        )}
                        {a.estado_actual !== "activa" && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                            {ESTADO_ACTUAL_LABELS[a.estado_actual]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-base text-foreground">{a.nombre || "Sin nombre"}</div>
                    <div className="text-sm text-muted-foreground">
                      {SEXO_LABELS[a.sexo]} · {CATEGORIA_LABELS[a.categoria_view]}
                      {a.estado_reproductivo ? ` · ${ESTADO_REPRODUCTIVO_LABELS[a.estado_reproductivo]}` : ""}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
        </>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border bg-card shadow-lg">
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="text-sm font-medium">
              {selected.size} animal{selected.size === 1 ? "" : "es"} seleccionado{selected.size === 1 ? "" : "s"}
            </span>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Limpiar
            </Button>
            <Button size="sm" onClick={() => setBulkOpen(true)}>
              <Layers className="mr-2 h-4 w-4" /> Acción Grupal
            </Button>
          </div>
        </div>
      )}

      <EventDialog
        animalIds={selectedIds}
        open={bulkOpen}
        onOpenChange={(v) => {
          setBulkOpen(v);
          if (!v) clearSelection();
        }}
        hideTrigger
      />
    </div>
  );
}
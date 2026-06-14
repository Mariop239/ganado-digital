import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronRight, Layers, CheckCircle2, CalendarClock, HeartPulse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EVENT_REGISTRY } from "../registry";
import {
  useAllAnimalEvents,
  useProgramadosEvents,
  useMarcarEventoHecho,
} from "../hooks/useAnimalEvents";
import {
  useHistorialPendientes,
  useMarcarServicioCompletado,
} from "@/modules/breeding";
import type { Historial } from "@/modules/breeding";
import { useAnimals } from "@/modules/animals/hooks/useAnimals";
import { DialogoEventoGrupal } from "../components/DialogoEventoGrupal";
import type { AnimalEvent, AnimalEventType, EventPayloadMap } from "../types/domain";

function summarize<T extends AnimalEventType>(ev: AnimalEvent<T>): string {
  const def = EVENT_REGISTRY[ev.tipo as T];
  if (!def) return "—";
  try {
    return def.summarize(ev.payload as EventPayloadMap[T]);
  } catch {
    return "—";
  }
}

type Group =
  | { kind: "batch"; key: string; tipo: AnimalEventType; fecha: string; events: AnimalEvent[] }
  | { kind: "single"; key: string; event: AnimalEvent };

type ProximoItem =
  | { kind: "event"; id: string; fecha: string; event: AnimalEvent }
  | { kind: "servicio"; id: string; fecha: string; servicio: Historial };

function combinarProximos(
  events: AnimalEvent[],
  servicios: Historial[],
): ProximoItem[] {
  const items: ProximoItem[] = [];
  for (const ev of events) {
    if (!ev.fecha_ejecucion) continue;
    items.push({ kind: "event", id: ev.id, fecha: ev.fecha_ejecucion, event: ev });
  }
  for (const s of servicios) {
    const fecha = s.fecha_palpado ?? s.fecha_probable_parto ?? s.fecha_monta;
    items.push({ kind: "servicio", id: s.id, fecha, servicio: s });
  }
  items.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return items;
}

export function EventosGlobales() {
  const { data: events, isLoading } = useAllAnimalEvents();
  const { data: programados, isLoading: loadingProgramados } = useProgramadosEvents();
  const { data: pendientes, isLoading: loadingPendientes } = useHistorialPendientes();
  const { data: animals } = useAnimals();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const marcarEvento = useMarcarEventoHecho();
  const marcarServicio = useMarcarServicioCompletado();

  const animalById = useMemo(() => {
    const map = new Map<string, { numero: string; nombre: string }>();
    for (const a of animals ?? []) map.set(a.id, { numero: a.numero, nombre: a.nombre });
    return map;
  }, [animals]);

  const groups: Group[] = useMemo(() => {
    const base = (events ?? []).filter((e) => e.estado !== "programado");
    if (!base.length) return [];
    const result: Group[] = [];
    const batches = new Map<string, AnimalEvent[]>();
    const order: string[] = [];
    for (const ev of base) {
      if (ev.batch_id) {
        if (!batches.has(ev.batch_id)) {
          batches.set(ev.batch_id, []);
          order.push(ev.batch_id);
        }
        batches.get(ev.batch_id)!.push(ev);
      } else {
        order.push(`single:${ev.id}`);
      }
    }
    for (const key of order) {
      if (key.startsWith("single:")) {
        const id = key.slice("single:".length);
        const ev = base.find((e) => e.id === id);
        if (ev) result.push({ kind: "single", key, event: ev });
      } else {
        const evs = batches.get(key) ?? [];
        if (evs.length === 1) {
          result.push({ kind: "single", key: `single:${evs[0].id}`, event: evs[0] });
        } else if (evs.length > 1) {
          result.push({
            kind: "batch",
            key,
            tipo: evs[0].tipo,
            fecha: evs[0].fecha,
            events: evs,
          });
        }
      }
    }
    return result;
  }, [events]);

  const proximos = useMemo(
    () => combinarProximos(programados ?? [], pendientes ?? []),
    [programados, pendientes],
  );

  const toggle = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Historial Global</h1>
          <p className="text-sm text-muted-foreground">
            Todos los eventos operacionales del rancho, agrupados por lote cuando aplica.
          </p>
        </div>
        <DialogoEventoGrupal />
      </div>

      <Tabs defaultValue="historial" className="w-full">
        <TabsList>
          <TabsTrigger value="historial">Historial (Hechos)</TabsTrigger>
          <TabsTrigger value="proximos">
            Próximos (Programados)
            {proximos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {proximos.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historial" className="mt-4">
          {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aún no hay eventos registrados.
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-3">
          {groups.map((g) => {
            if (g.kind === "single") {
              const ev = g.event;
              const def = EVENT_REGISTRY[ev.tipo];
              if (!def) return null;
              const Icon = def.icon;
              const a = ev.animal_id ? animalById.get(ev.animal_id) : null;
              return (
                <li key={g.key}>
                  <Card>
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="mt-1 rounded-md bg-muted p-2">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{def.label}</span>
                          {ev.is_terminal && <Badge variant="destructive">Terminal</Badge>}
                          <span className="text-sm text-muted-foreground">
                            {format(parseISO(ev.fecha), "d MMM yyyy", { locale: es })}
                          </span>
                          {a && (
                            <Link
                              to="/animales/$numero"
                              params={{ numero: a.numero }}
                              className="text-sm text-primary hover:underline"
                            >
                              #{a.numero} {a.nombre}
                            </Link>
                          )}
                        </div>
                        <p className="text-sm">{summarize(ev)}</p>
                        {ev.observaciones && (
                          <p className="text-sm text-muted-foreground">{ev.observaciones}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            }
            const def = EVENT_REGISTRY[g.tipo];
            if (!def) return null;
            const Icon = def.icon;
            const isOpen = expanded.has(g.key);
            const first = g.events[0];
            return (
              <li key={g.key}>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-md bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" />
                          <span className="font-medium">
                            {def.label} masivo · {g.events.length} animales
                          </span>
                          {first.is_terminal && <Badge variant="destructive">Terminal</Badge>}
                          <span className="text-sm text-muted-foreground">
                            {format(parseISO(g.fecha), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                        <p className="text-sm">{summarize(first)}</p>
                        {first.observaciones && (
                          <p className="text-sm text-muted-foreground">{first.observaciones}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggle(g.key)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <>
                            <ChevronDown className="mr-1 h-4 w-4" /> Ocultar
                          </>
                        ) : (
                          <>
                            <ChevronRight className="mr-1 h-4 w-4" /> Ver detalles
                          </>
                        )}
                      </Button>
                    </div>
                    {isOpen && (
                      <ul className="ml-12 grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-3 md:grid-cols-4">
                        {g.events.map((ev) => {
                          const a = ev.animal_id ? animalById.get(ev.animal_id) : null;
                          if (!a) {
                            return (
                              <li key={ev.id} className="text-sm text-muted-foreground">
                                (animal removido)
                              </li>
                            );
                          }
                          return (
                            <li key={ev.id}>
                              <Link
                                to="/animales/$numero"
                                params={{ numero: a.numero }}
                                className="text-sm text-primary hover:underline"
                              >
                                #{a.numero} {a.nombre}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
          )}
        </TabsContent>

        <TabsContent value="proximos" className="mt-4">
          {loadingProgramados || loadingPendientes ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : proximos.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No hay eventos programados ni servicios pendientes.
              </CardContent>
            </Card>
          ) : (
            <ol className="space-y-3">
              {proximos.map((item) => {
                if (item.kind === "event") {
                  const ev = item.event;
                  const def = EVENT_REGISTRY[ev.tipo];
                  const Icon = def?.icon ?? CalendarClock;
                  const a = ev.animal_id ? animalById.get(ev.animal_id) : null;
                  return (
                    <li key={`ev-${item.id}`}>
                      <Card>
                        <CardContent className="flex items-start gap-4 p-4">
                          <div className="mt-1 rounded-md bg-amber-500/10 p-2">
                            <Icon className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{def?.label ?? ev.tipo}</span>
                              <Badge variant="outline">Programado</Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(parseISO(item.fecha), "d MMM yyyy", { locale: es })}
                              </span>
                              {a && (
                                <Link
                                  to="/animales/$numero"
                                  params={{ numero: a.numero }}
                                  className="text-sm text-primary hover:underline"
                                >
                                  #{a.numero} {a.nombre}
                                </Link>
                              )}
                            </div>
                            <p className="text-sm">{summarize(ev)}</p>
                            {ev.observaciones && (
                              <p className="text-sm text-muted-foreground">{ev.observaciones}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={marcarEvento.isPending}
                            onClick={() => marcarEvento.mutate(item.id)}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Completar
                          </Button>
                        </CardContent>
                      </Card>
                    </li>
                  );
                }
                const s = item.servicio;
                const a = s.animal_id ? animalById.get(s.animal_id) : null;
                const tipoLabel =
                  s.tipo_servicio === "inseminacion" ? "Inseminación" : "Monta natural";
                const isPalpacion = !!s.fecha_palpado;
                return (
                  <li key={`s-${item.id}`}>
                    <Card>
                      <CardContent className="flex items-start gap-4 p-4">
                        <div className="mt-1 rounded-md bg-pink-500/10 p-2">
                          <HeartPulse className="h-5 w-5 text-pink-600" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {isPalpacion ? "Palpación" : tipoLabel}
                            </span>
                            <Badge variant="outline">Pendiente</Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(item.fecha), "d MMM yyyy", { locale: es })}
                            </span>
                            {a && (
                              <Link
                                to="/animales/$numero"
                                params={{ numero: a.numero }}
                                className="text-sm text-primary hover:underline"
                              >
                                #{a.numero} {a.nombre}
                              </Link>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Monta: {format(parseISO(s.fecha_monta), "d MMM yyyy", { locale: es })}
                            {s.toro ? ` · Toro: ${s.toro}` : ""}
                          </p>
                          {s.observaciones && (
                            <p className="text-sm text-muted-foreground">{s.observaciones}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={marcarServicio.isPending}
                          onClick={() => marcarServicio.mutate(item.id)}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Completar
                        </Button>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EVENT_REGISTRY } from "../registry";
import { useAllAnimalEvents } from "../hooks/useAnimalEvents";
import { useAnimals } from "@/modules/animals/hooks/useAnimals";
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

export function EventosGlobales() {
  const { data: events, isLoading } = useAllAnimalEvents();
  const { data: animals } = useAnimals();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const animalById = useMemo(() => {
    const map = new Map<string, { numero: string; nombre: string }>();
    for (const a of animals ?? []) map.set(a.id, { numero: a.numero, nombre: a.nombre });
    return map;
  }, [animals]);

  const groups: Group[] = useMemo(() => {
    if (!events) return [];
    const result: Group[] = [];
    const batches = new Map<string, AnimalEvent[]>();
    const order: string[] = [];
    for (const ev of events) {
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
        const ev = events.find((e) => e.id === id);
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

  const toggle = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Historial Global</h1>
        <p className="text-sm text-muted-foreground">
          Todos los eventos operacionales del rancho, agrupados por lote cuando aplica.
        </p>
      </div>

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
    </div>
  );
}
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { EVENT_REGISTRY } from "../registry";
import {
  useAnimalEvents,
  useDeleteAnimalEvent,
} from "../hooks/useAnimalEvents";
import type { AnimalEvent, AnimalEventType, EventPayloadMap } from "../types/domain";

function summarize<T extends AnimalEventType>(ev: AnimalEvent<T>): string {
  const def = EVENT_REGISTRY[ev.tipo];
  try {
    return def.summarize(ev.payload as EventPayloadMap[T]);
  } catch {
    return "—";
  }
}

export function EventTimeline({ animalId }: { animalId: string }) {
  const { data, isLoading } = useAnimalEvents(animalId);
  const del = useDeleteAnimalEvent(animalId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
        Sin eventos registrados.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {data.map((ev) => {
        const def = EVENT_REGISTRY[ev.tipo];
        const Icon = def.icon;
        return (
          <li key={ev.id}>
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
                  </div>
                  <p className="text-sm">{summarize(ev)}</p>
                  {ev.observaciones && (
                    <p className="text-sm text-muted-foreground">{ev.observaciones}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-10 min-w-10"
                  onClick={async () => {
                    if (!confirm("¿Eliminar este evento?")) return;
                    try {
                      await del.mutateAsync(ev.id);
                      toast.success("Evento eliminado");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Error");
                    }
                  }}
                  aria-label="Eliminar evento"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Pencil, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormAnimal } from "./FormAnimal";
import { EstadoAnimalDialog } from "./EstadoAnimalDialog";
import { FamiliaTab } from "./FamiliaTab";
import { ClasificacionAdultaDialog } from "./ClasificacionAdultaDialog";
import { useReactivarAnimal } from "../hooks/useAnimals";
import type { AnimalView } from "../types/domain";
import { CATEGORIA_LABELS, SEXO_LABELS, aplicaEstadoReproductivo } from "../constants/categorias";
import { ESTADO_ACTUAL_LABELS, ESTADO_REPRODUCTIVO_LABELS } from "../constants/estados";
import { HistorialTabla } from "@/modules/breeding";
import { VacunasTablaVaca } from "@/modules/vaccinations";
import { EventTimeline, EventDialog } from "@/modules/cows/events";
import { toast } from "sonner";

const fmt = (d: string | null) => (d ? format(parseISO(d), "d MMM yyyy", { locale: es }) : "—");

const rows = (a: AnimalView): Array<[string, string]> => [
  ["Número", a.numero],
  ["Nombre", a.nombre || "—"],
  ["Sexo", SEXO_LABELS[a.sexo]],
  [
    "Categoría",
    a.calculada
      ? `${CATEGORIA_LABELS[a.categoria_view]} (calculada por edad)`
      : CATEGORIA_LABELS[a.categoria_view],
  ],
  ["Fecha de nacimiento", fmt(a.fecha_nacimiento)],
  ["Dueño", a.dueno || "—"],
  ["Ubicación actual", a.ubicacion_actual || "Por definir"],
  ["Lote/Grupo", a.lote_actual || "Sin lote"],
  ["Color", a.color || "—"],
  ["Raza", a.raza || "—"],
];

export function PerfilAnimal({ animal }: { animal: AnimalView }) {
  const [editOpen, setEditOpen] = useState(false);
  const [clasifOpen, setClasifOpen] = useState(false);
  const reactivar = useReactivarAnimal(animal.numero);
  const egresada = animal.estado_actual !== "activa";
  const esHembraAdulta = aplicaEstadoReproductivo(animal.sexo, animal.categoria);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="lg" className="min-h-12 -ml-3">
          <Link to="/"><ArrowLeft className="mr-2 h-5 w-5" /> Volver</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-2xl">
              {animal.nombre || `Animal #${animal.numero}`}
            </CardTitle>
            <Badge variant="secondary">{SEXO_LABELS[animal.sexo]}</Badge>
            {animal.requiere_clasificacion ? (
              <Badge
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setClasifOpen(true)}
              >
                Requiere clasificación adulta
              </Badge>
            ) : (
              <Badge variant="outline">{CATEGORIA_LABELS[animal.categoria_view]}</Badge>
            )}
            {animal.estado_reproductivo && (
              <Badge variant="outline">{ESTADO_REPRODUCTIVO_LABELS[animal.estado_reproductivo]}</Badge>
            )}
            {egresada && <Badge variant="destructive">{ESTADO_ACTUAL_LABELS[animal.estado_actual]}</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" className="min-h-12" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-5 w-5" /> Editar
            </Button>
            {egresada ? (
              <Button variant="outline" size="lg" className="min-h-12" onClick={async () => {
                try { await reactivar.mutateAsync(); toast.success("Animal reactivado"); }
                catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
              }}>
                <RotateCcw className="mr-2 h-5 w-5" /> Reactivar
              </Button>
            ) : (
              <EstadoAnimalDialog numero={animal.numero} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows(animal).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border/60 py-2">
                <dt className="font-medium text-muted-foreground">{k}</dt>
                <dd className="text-right text-foreground">{v}</dd>
              </div>
            ))}
            {egresada && (
              <>
                <div className="flex justify-between gap-4 border-b border-border/60 py-2">
                  <dt className="font-medium text-muted-foreground">Fecha de egreso</dt>
                  <dd className="text-right">{fmt(animal.fecha_egreso)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/60 py-2 sm:col-span-2">
                  <dt className="font-medium text-muted-foreground">Motivo</dt>
                  <dd className="text-right">{animal.motivo_egreso || "—"}</dd>
                </div>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue={esHembraAdulta ? "reproduccion" : "eventos"} className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
          {esHembraAdulta && (
            <TabsTrigger value="reproduccion" className="min-h-11">Reproducción</TabsTrigger>
          )}
          <TabsTrigger value="vacunas" className="min-h-11">Vacunas y Médico</TabsTrigger>
          <TabsTrigger value="eventos" className="min-h-11">Eventos</TabsTrigger>
          <TabsTrigger value="familia" className="min-h-11">Familia</TabsTrigger>
        </TabsList>
        {esHembraAdulta && (
          <TabsContent value="reproduccion" className="mt-4">
            <HistorialTabla vacaNumero={animal.numero} />
          </TabsContent>
        )}
        <TabsContent value="vacunas" className="mt-4">
          <VacunasTablaVaca vacaNumero={animal.numero} />
        </TabsContent>
        <TabsContent value="eventos" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <EventDialog vacaNumero={animal.numero} />
          </div>
          <EventTimeline vacaNumero={animal.numero} />
        </TabsContent>
        <TabsContent value="familia" className="mt-4">
          <FamiliaTab animal={animal} />
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar animal</DialogTitle>
          </DialogHeader>
          <FormAnimal animal={animal} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <ClasificacionAdultaDialog
        open={clasifOpen}
        onOpenChange={setClasifOpen}
        animal={animal}
      />
    </div>
  );
}
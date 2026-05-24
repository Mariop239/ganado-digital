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
import { FormVaca } from "./FormVaca";
import { EgresoDialog } from "./EgresoDialog";
import { useReactivarVaca } from "@/hooks/useVacas";
import { HistorialTabla } from "./HistorialTabla";
import { VacunasTablaVaca } from "@/components/vacunas/VacunasTablaVaca";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Vaca } from "@/lib/vacas-repository";
import { toast } from "sonner";

const fmt = (d: string | null) => (d ? format(parseISO(d), "d MMM yyyy", { locale: es }) : "—");

const rows = (v: Vaca): Array<[string, string]> => [
  ["Número", v.numero],
  ["Nombre", v.nombre || "—"],
  ["Dueño", v.dueno || "—"],
  ["Color", v.color || "—"],
  ["Raza", v.raza || "—"],
  ["Padre", v.padre || "—"],
  ["Madre", v.madre || "—"],
];

export function PerfilVaca({ vaca }: { vaca: Vaca }) {
  const [editOpen, setEditOpen] = useState(false);
  const reactivar = useReactivarVaca(vaca.numero);
  const egresada = !!vaca.fecha_egreso;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="lg" className="min-h-12 -ml-3">
          <Link to="/"><ArrowLeft className="mr-2 h-5 w-5" /> Volver</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-2xl">
              {vaca.nombre || `Vaca #${vaca.numero}`}
            </CardTitle>
            {egresada && <Badge variant="destructive">Egresada</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" className="min-h-12" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-5 w-5" /> Editar
            </Button>
            {egresada ? (
              <Button variant="outline" size="lg" className="min-h-12" onClick={async () => {
                try { await reactivar.mutateAsync(); toast.success("Vaca reactivada"); }
                catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
              }}>
                <RotateCcw className="mr-2 h-5 w-5" /> Reactivar
              </Button>
            ) : (
              <EgresoDialog numero={vaca.numero} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows(vaca).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border/60 py-2">
                <dt className="font-medium text-muted-foreground">{k}</dt>
                <dd className="text-right text-foreground">{v}</dd>
              </div>
            ))}
            {egresada && (
              <>
                <div className="flex justify-between gap-4 border-b border-border/60 py-2">
                  <dt className="font-medium text-muted-foreground">Fecha de egreso</dt>
                  <dd className="text-right">{fmt(vaca.fecha_egreso)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/60 py-2 sm:col-span-2">
                  <dt className="font-medium text-muted-foreground">Motivo</dt>
                  <dd className="text-right">{vaca.motivo_egreso || "—"}</dd>
                </div>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="reproduccion" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="reproduccion" className="min-h-11">Reproducción</TabsTrigger>
          <TabsTrigger value="vacunas" className="min-h-11">Vacunas y Médico</TabsTrigger>
        </TabsList>
        <TabsContent value="reproduccion" className="mt-4">
          <HistorialTabla vacaNumero={vaca.numero} />
        </TabsContent>
        <TabsContent value="vacunas" className="mt-4">
          <VacunasTablaVaca vacaNumero={vaca.numero} />
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar vaca</DialogTitle>
          </DialogHeader>
          <FormVaca vaca={vaca} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
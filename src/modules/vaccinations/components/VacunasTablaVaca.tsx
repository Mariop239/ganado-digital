import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteVacuna, useVacunasPorAnimal } from "../hooks/useVacunas";
import { FormVacuna } from "./FormVacuna";
import {
  TIPO_TRATAMIENTO_LABELS,
  ESTADO_TRATAMIENTO_LABELS,
  type TipoTratamiento,
  type EstadoTratamiento,
} from "../schemas";
import { toast } from "sonner";

const fmt = (d: string | null) => (d ? format(parseISO(d), "d MMM yyyy", { locale: es }) : "—");

function EstadoBadge({ estado }: { estado: EstadoTratamiento }) {
  if (estado === "programado") {
    return (
      <Badge className="border-transparent bg-amber-500 text-white hover:bg-amber-500/90">
        {ESTADO_TRATAMIENTO_LABELS.programado}
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90">
      {ESTADO_TRATAMIENTO_LABELS.aplicado}
    </Badge>
  );
}
const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

function ProximaDosisBadge({ fecha }: { fecha: string | null }) {
  if (!fecha) return <span className="text-muted-foreground">—</span>;
  const date = parseISO(fecha);
  const diff = differenceInCalendarDays(date, new Date());
  const label = format(date, "d MMM yyyy", { locale: es });
  if (diff < 0) {
    return <Badge variant="destructive">Atrasado: {label}</Badge>;
  }
  if (diff <= 15) {
    return (
      <Badge className="border-transparent bg-amber-500 text-white hover:bg-amber-500/90">
        Pronto: {label}
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90">
      {label}
    </Badge>
  );
}

type Props = { animalId: string; vacaNumero: string };

export function VacunasTablaVaca({ animalId, vacaNumero }: Props) {
  const { data, isLoading } = useVacunasPorAnimal(animalId);
  const del = useDeleteVacuna();
  const [openCreate, setOpenCreate] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Tratamientos sanitarios</h2>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-12">
              <Plus className="mr-2 h-5 w-5" /> Registrar tratamiento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Tratamiento Sanitario — #{vacaNumero}</DialogTitle>
            </DialogHeader>
            <FormVacuna animalId={animalId} vacaNumero={vacaNumero} onDone={() => setOpenCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Producto / Medicamento</TableHead>
              <TableHead>Fecha aplicación</TableHead>
              <TableHead>Próxima dosis</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Cargando…</TableCell></TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sin tratamientos registrados.</TableCell></TableRow>
            )}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Badge variant="secondary">
                    {TIPO_TRATAMIENTO_LABELS[r.tipo_tratamiento as TipoTratamiento] ?? r.tipo_tratamiento}
                  </Badge>
                </TableCell>
                <TableCell><EstadoBadge estado={r.estado_tratamiento} /></TableCell>
                <TableCell className="font-medium">{r.vacuna_aplicada}</TableCell>
                <TableCell>{fmt(r.fecha)}</TableCell>
                <TableCell><ProximaDosisBadge fecha={r.fecha_proxima_dosis} /></TableCell>
                <TableCell className="text-right">{money(r.gasto)}</TableCell>
                <TableCell className="max-w-xs truncate" title={r.observaciones ?? ""}>{r.observaciones || "—"}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar tratamiento?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                          try { await del.mutateAsync(r.id); toast.success("Tratamiento eliminado"); }
                          catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
                        }}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, Plus, Eye, Pencil } from "lucide-react";
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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteVacuna, useVacunasPorAnimal } from "../hooks/useVacunas";
import { FormVacuna } from "./FormVacuna";
import {
  TIPO_TRATAMIENTO_LABELS,
  ESTADO_TRATAMIENTO_LABELS,
  type TipoTratamiento,
  type EstadoTratamiento,
} from "../schemas";
import type { Vacuna, VacunaInput } from "../types/domain";
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

type Props = { animalId: string };

export function VacunasTablaVaca({ animalId }: Props) {
  const { data, isLoading } = useVacunasPorAnimal(animalId);
  const del = useDeleteVacuna();
  const [openCreate, setOpenCreate] = useState(false);
  const [detail, setDetail] = useState<Vacuna | null>(null);
  const [editing, setEditing] = useState<Vacuna | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Vacuna | null>(null);

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
              <DialogTitle>Registrar Tratamiento Sanitario</DialogTitle>
            </DialogHeader>
            <FormVacuna animalId={animalId} onDone={() => setOpenCreate(false)} />
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
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setDetail(r)}
              >
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
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setDetail(r)}
                    aria-label="Ver detalles"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Sheet de detalle */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalle del tratamiento</SheetTitle>
            <SheetDescription>
              Información completa del registro sanitario.
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-6 space-y-4 text-sm">
              <DetailField label="Tipo">
                <Badge variant="secondary">
                  {TIPO_TRATAMIENTO_LABELS[detail.tipo_tratamiento as TipoTratamiento] ?? detail.tipo_tratamiento}
                </Badge>
              </DetailField>
              <DetailField label="Estado">
                <EstadoBadge estado={detail.estado_tratamiento} />
              </DetailField>
              <DetailField label="Producto / Medicamento">
                <span className="font-medium">{detail.vacuna_aplicada}</span>
              </DetailField>
              <DetailField label="Enfermedad o motivo">
                {detail.enfermedad_a_prevenir || "—"}
              </DetailField>
              <DetailField label="Fecha de aplicación">{fmt(detail.fecha)}</DetailField>
              <DetailField label="Próxima dosis">
                <ProximaDosisBadge fecha={detail.fecha_proxima_dosis} />
              </DetailField>
              <DetailField label="Gasto">{money(detail.gasto)}</DetailField>
              <DetailField label="Observaciones">
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {detail.observaciones || "—"}
                </p>
              </DetailField>
              <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDelete(detail)}
                  className="min-h-11"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
                <Button
                  onClick={() => {
                    setEditing(detail);
                    setDetail(null);
                  }}
                  className="min-h-11"
                >
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de edición */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar tratamiento</DialogTitle>
          </DialogHeader>
          {editing && (
            <FormVacuna
              animalId={animalId}
              editId={editing.id}
              initialValues={vacunaToInput(editing)}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tratamiento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return;
                try {
                  await del.mutateAsync(confirmDelete.id);
                  toast.success("Tratamiento eliminado");
                  setConfirmDelete(null);
                  setDetail(null);
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Error");
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function vacunaToInput(v: Vacuna): Partial<VacunaInput> {
  return {
    tipo_tratamiento: v.tipo_tratamiento,
    estado_tratamiento: v.estado_tratamiento,
    fecha: v.fecha ?? "",
    vacuna_aplicada: v.vacuna_aplicada,
    enfermedad_a_prevenir: v.enfermedad_a_prevenir ?? "",
    gasto: Number(v.gasto) || 0,
    observaciones: v.observaciones ?? "",
    fecha_proxima_dosis: v.fecha_proxima_dosis ?? null,
  };
}
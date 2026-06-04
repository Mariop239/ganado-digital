import { useState } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteVacuna } from "../hooks/useVacunas";
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
const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

function EstadoBadge({ estado }: { estado: EstadoTratamiento }) {
  const cls = estado === "programado"
    ? "border-transparent bg-amber-500 text-white hover:bg-amber-500/90"
    : "border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90";
  return <Badge className={cls}>{ESTADO_TRATAMIENTO_LABELS[estado]}</Badge>;
}

function ProximaDosisBadge({ fecha }: { fecha: string | null }) {
  if (!fecha) return <span className="text-muted-foreground">—</span>;
  const date = parseISO(fecha);
  const diff = differenceInCalendarDays(date, new Date());
  const label = format(date, "d MMM yyyy", { locale: es });
  if (diff < 0) return <Badge variant="destructive">Atrasado: {label}</Badge>;
  if (diff <= 15) return (
    <Badge className="border-transparent bg-amber-500 text-white hover:bg-amber-500/90">Pronto: {label}</Badge>
  );
  return (
    <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90">{label}</Badge>
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

type Props = {
  vacuna: Vacuna | null;
  onClose: () => void;
  /** Optional label shown in the sheet header (e.g. animal number). */
  headerExtra?: React.ReactNode;
};

export function VacunaDetailSheet({ vacuna, onClose, headerExtra }: Props) {
  const del = useDeleteVacuna();
  const [editing, setEditing] = useState<Vacuna | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Vacuna | null>(null);

  return (
    <>
      <Sheet open={!!vacuna} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalle del tratamiento</SheetTitle>
            <SheetDescription>
              {headerExtra ?? "Información completa del registro sanitario."}
            </SheetDescription>
          </SheetHeader>
          {vacuna && (
            <div className="mt-6 space-y-4 text-sm">
              <DetailField label="Tipo">
                <Badge variant="secondary">
                  {TIPO_TRATAMIENTO_LABELS[vacuna.tipo_tratamiento as TipoTratamiento] ?? vacuna.tipo_tratamiento}
                </Badge>
              </DetailField>
              <DetailField label="Estado">
                <EstadoBadge estado={vacuna.estado_tratamiento} />
              </DetailField>
              <DetailField label="Producto / Medicamento">
                <span className="font-medium">{vacuna.vacuna_aplicada}</span>
              </DetailField>
              <DetailField label="Enfermedad o motivo">
                {vacuna.enfermedad_a_prevenir || "—"}
              </DetailField>
              <DetailField label="Fecha de aplicación">{fmt(vacuna.fecha)}</DetailField>
              <DetailField label="Próxima dosis">
                <ProximaDosisBadge fecha={vacuna.fecha_proxima_dosis} />
              </DetailField>
              <DetailField label="Gasto">{money(vacuna.gasto)}</DetailField>
              <DetailField label="Observaciones">
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {vacuna.observaciones || "—"}
                </p>
              </DetailField>
              <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDelete(vacuna)}
                  className="min-h-11"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
                <Button
                  onClick={() => {
                    setEditing(vacuna);
                    onClose();
                  }}
                  className="min-h-11"
                  disabled={!vacuna.animal_id}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar tratamiento</DialogTitle>
          </DialogHeader>
          {editing && editing.animal_id && (
            <FormVacuna
              animalId={editing.animal_id}
              editId={editing.id}
              initialValues={vacunaToInput(editing)}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

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
                  onClose();
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
    </>
  );
}
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

const fmt = (d: string | null) => (d ? format(parseISO(d), "d MMM yyyy", { locale: es }) : "—");
const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

type Props = { animalId: string; vacaNumero: string };

export function VacunasTablaVaca({ animalId, vacaNumero }: Props) {
  const { data, isLoading } = useVacunasPorAnimal(animalId);
  const del = useDeleteVacuna();
  const [openCreate, setOpenCreate] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Vacunas aplicadas</h2>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-12">
              <Plus className="mr-2 h-5 w-5" /> Registrar vacuna
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva vacuna para vaca #{vacaNumero}</DialogTitle>
            </DialogHeader>
            <FormVacuna animalId={animalId} vacaNumero={vacaNumero} onDone={() => setOpenCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Vacuna</TableHead>
              <TableHead>Enfermedad</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Cargando…</TableCell></TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin vacunas registradas.</TableCell></TableRow>
            )}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{fmt(r.fecha)}</TableCell>
                <TableCell>{r.vacuna_aplicada}</TableCell>
                <TableCell>{r.enfermedad_a_prevenir || "—"}</TableCell>
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
                        <AlertDialogTitle>¿Eliminar vacuna?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                          try { await del.mutateAsync(r.id); toast.success("Vacuna eliminada"); }
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
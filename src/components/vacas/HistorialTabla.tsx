import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil, Trash2, Plus } from "lucide-react";
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
import { useDeleteHistorial, useHistorial } from "@/hooks/useHistorial";
import type { Historial } from "@/lib/historial-repository";
import { FormHistorial } from "./FormHistorial";
import { toast } from "sonner";

const fmt = (d: string | null) => (d ? format(parseISO(d), "d MMM yyyy", { locale: es }) : "—");

export function HistorialTabla({ vacaNumero }: { vacaNumero: string }) {
  const { data, isLoading } = useHistorial(vacaNumero);
  const del = useDeleteHistorial(vacaNumero);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Historial | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Historial reproductivo</h2>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-12">
              <Plus className="mr-2 h-5 w-5" /> Añadir registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo registro de monta / parto</DialogTitle>
            </DialogHeader>
            <FormHistorial vacaNumero={vacaNumero} onDone={() => setOpenCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha monta</TableHead>
              <TableHead>Toro</TableHead>
              <TableHead>Fecha parto</TableHead>
              <TableHead>Sexo cría</TableHead>
              <TableHead>Fecha destete</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Cargando…</TableCell></TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sin registros todavía.</TableCell></TableRow>
            )}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{fmt(r.fecha_monta)}</TableCell>
                <TableCell>{r.toro || "—"}</TableCell>
                <TableCell>{fmt(r.fecha_parto)}</TableCell>
                <TableCell>{r.sexo_cria ?? "—"}</TableCell>
                <TableCell>{fmt(r.fecha_destete)}</TableCell>
                <TableCell className="max-w-xs truncate" title={r.observaciones ?? ""}>{r.observaciones || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setEditing(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
                          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            try { await del.mutateAsync(r.id); toast.success("Registro eliminado"); }
                            catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
                          }}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar registro</DialogTitle>
          </DialogHeader>
          {editing && (
            <FormHistorial vacaNumero={vacaNumero} registro={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
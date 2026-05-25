import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil, Trash2, Plus, Baby } from "lucide-react";
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
import { useDeleteHistorial, useHistorial, useMarcarParida } from "../hooks/useHistorial";
import type { Historial, EstadoServicio, TipoServicio } from "../types/domain";
import { FormHistorial } from "./FormHistorial";
import { FormAnimal, useAnimal } from "@/modules/animals";
import { toast } from "sonner";

const fmt = (d: string | null) => (d ? format(parseISO(d), "d MMM yyyy", { locale: es }) : "—");

const TIPO_LABELS: Record<TipoServicio, string> = {
  monta_natural: "Monta natural",
  inseminacion: "Inseminación",
};

const ESTADO_LABELS: Record<EstadoServicio, string> = {
  pendiente: "Pendiente",
  prenada: "Preñada",
  vacia: "Vacía",
  parida: "Parida",
};

const ESTADO_VARIANT: Record<EstadoServicio, "secondary" | "default" | "destructive" | "outline"> = {
  pendiente: "secondary",
  prenada: "default",
  vacia: "destructive",
  parida: "outline",
};

export function HistorialTabla({ vacaNumero }: { vacaNumero: string }) {
  const { data, isLoading } = useHistorial(vacaNumero);
  const del = useDeleteHistorial(vacaNumero);
  const marcarParida = useMarcarParida(vacaNumero);
  const { data: madre } = useAnimal(vacaNumero);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Historial | null>(null);
  const [nacimientoDe, setNacimientoDe] = useState<Historial | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Servicios reproductivos</h2>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-12">
              <Plus className="mr-2 h-5 w-5" /> Registrar servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo servicio reproductivo</DialogTitle>
            </DialogHeader>
            <FormHistorial vacaNumero={vacaNumero} onDone={() => setOpenCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Toro</TableHead>
              <TableHead>Fecha servicio</TableHead>
              <TableHead>Confirmación</TableHead>
              <TableHead>Fecha probable parto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Cargando…</TableCell></TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sin servicios todavía.</TableCell></TableRow>
            )}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{TIPO_LABELS[r.tipo_servicio]}</TableCell>
                <TableCell>{r.toro || "—"}</TableCell>
                <TableCell>{fmt(r.fecha_monta)}</TableCell>
                <TableCell>{fmt(r.fecha_confirmacion)}</TableCell>
                <TableCell>
                  {r.estado_servicio === "vacia" ? "—" : fmt(r.fecha_probable_parto)}
                </TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANT[r.estado_servicio]}>
                    {ESTADO_LABELS[r.estado_servicio]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex flex-wrap items-center justify-end gap-2">
                    {r.estado_servicio === "prenada" && (
                      <Button
                        size="lg"
                        className="min-h-12 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => setNacimientoDe(r)}
                      >
                        <Baby className="mr-2 h-5 w-5" /> Registrar nacimiento
                      </Button>
                    )}
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
            <DialogTitle>Editar servicio</DialogTitle>
          </DialogHeader>
          {editing && (
            <FormHistorial vacaNumero={vacaNumero} registro={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!nacimientoDe} onOpenChange={(o) => !o && setNacimientoDe(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar nacimiento</DialogTitle>
          </DialogHeader>
          {nacimientoDe && (
            <FormAnimal
              defaults={{
                mother_id: madre?.id ?? null,
                madre_texto: madre?.nombre || madre?.numero || "",
                padre_texto: nacimientoDe.toro,
                fecha_nacimiento: new Date().toISOString().slice(0, 10),
                sexo: "hembra",
                categoria: "ternera",
              }}
              lockedFields={["mother_id", "madre_texto", "padre_texto"]}
              onDone={() => setNacimientoDe(null)}
              onAfterCreate={async (created) => {
                try {
                  await marcarParida.mutateAsync({
                    id: nacimientoDe.id,
                    input: {
                      fecha_parto: created.fecha_nacimiento ?? new Date().toISOString().slice(0, 10),
                      sexo_cria: created.sexo === "macho" ? "Macho" : "Hembra",
                      cria_animal_id: created.id,
                    },
                  });
                  toast.success("Nacimiento registrado y servicio marcado como parida");
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Error al actualizar servicio");
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
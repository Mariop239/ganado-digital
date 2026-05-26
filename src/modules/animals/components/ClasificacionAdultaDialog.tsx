import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateAnimal } from "../hooks/useAnimals";
import { CATEGORIA_LABELS } from "../constants/categorias";
import { adultasPorSexo, type CategoriaAdulta } from "../utils/categorias";
import type { AnimalView } from "../types/domain";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animal: AnimalView;
};

export function ClasificacionAdultaDialog({ open, onOpenChange, animal }: Props) {
  const opciones = adultasPorSexo(animal.sexo);
  const [value, setValue] = useState<CategoriaAdulta>(opciones[0]);
  const update = useUpdateAnimal(animal.id);

  const onSave = async () => {
    try {
      // Persistimos el valor real en `categoria` (campo persistido).
      await update.mutateAsync({ categoria: value });
      toast.success("Clasificación adulta guardada");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clasificación adulta</DialogTitle>
          <DialogDescription>
            Este animal superó los 15 meses. Selecciona su categoría adulta definitiva.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Categoría</Label>
          <Select value={value} onValueChange={(v) => setValue(v as CategoriaAdulta)}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORIA_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" className="min-h-12" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="lg" className="min-h-12" onClick={onSave} disabled={update.isPending}>
            {update.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAnimal } from "../hooks/useAnimal";
import { useAnimalById } from "../hooks/useAnimalById";
import { useHijos } from "../hooks/useHijos";
import { useUpdateRelaciones } from "../hooks/useUpdateRelaciones";
import { SelectorAnimal } from "./SelectorAnimal";
import type { Animal } from "../types/domain";

type Props = { numero: string };

export function FamiliaTab({ numero }: Props) {
  const { data: animal, isLoading } = useAnimal(numero);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!animal) {
    return (
      <p className="text-sm text-muted-foreground">
        Este animal aún no está registrado en el catálogo unificado.
      </p>
    );
  }
  return <FamiliaEditor animalId={animal.id} numero={animal.numero} />;
}

function FamiliaEditor({ animalId, numero }: { animalId: string; numero: string }) {
  const { data: animal } = useAnimal(numero);
  const { data: hijos = [] } = useHijos(animalId);
  const { data: madre } = useAnimalById(animal?.mother_id);
  const { data: padre } = useAnimalById(animal?.father_id);
  const [editOpen, setEditOpen] = useState(false);

  if (!animal) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Padres</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="min-h-10"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            Editar genealogía
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border/60">
            <PadreRow label="Madre" animal={madre ?? null} texto={animal.madre_texto} />
            <PadreRow label="Padre" animal={padre ?? null} texto={animal.padre_texto} />
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hijos ({hijos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {hijos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay hijos registrados con este animal como madre o padre.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {hijos.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">
                      #{h.numero}
                      {h.nombre ? ` · ${h.nombre}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {h.sexo} · {h.categoria}
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="min-h-10">
                    <Link to="/animales/$numero" params={{ numero: h.numero }}>
                      Ver
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <EditarGenealogiaDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        animalId={animalId}
        numero={numero}
        initial={{
          mother_id: animal.mother_id,
          father_id: animal.father_id,
          madre_texto: animal.madre_texto ?? "",
          padre_texto: animal.padre_texto ?? "",
        }}
      />
    </div>
  );
}

function PadreRow({
  label,
  animal,
  texto,
}: {
  label: string;
  animal: Animal | null;
  texto: string;
}) {
  if (animal) {
    return (
      <li className="py-1">
        <Link
          to="/animales/$numero"
          params={{ numero: animal.numero }}
          className="flex items-center justify-between min-h-14 px-2 -mx-2 rounded-md hover:bg-accent/50 transition-colors"
        >
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="font-medium">
              #{animal.numero}
              {animal.nombre ? ` · ${animal.nombre}` : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              {animal.sexo} · {animal.categoria}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </li>
    );
  }
  return (
    <li className="py-3 px-2 -mx-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {texto ? (
        <div className="text-sm">
          {texto}{" "}
          <span className="text-xs text-muted-foreground">(sin vincular)</span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Sin registrar</div>
      )}
    </li>
  );
}

type EditInitial = {
  mother_id: string | null;
  father_id: string | null;
  madre_texto: string;
  padre_texto: string;
};

function EditarGenealogiaDialog({
  open,
  onOpenChange,
  animalId,
  numero,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  animalId: string;
  numero: string;
  initial: EditInitial;
}) {
  const update = useUpdateRelaciones(animalId, numero);
  const [motherId, setMotherId] = useState<string | null>(initial.mother_id);
  const [fatherId, setFatherId] = useState<string | null>(initial.father_id);
  const [madreTexto, setMadreTexto] = useState(initial.madre_texto);
  const [padreTexto, setPadreTexto] = useState(initial.padre_texto);

  useEffect(() => {
    if (open) {
      setMotherId(initial.mother_id);
      setFatherId(initial.father_id);
      setMadreTexto(initial.madre_texto);
      setPadreTexto(initial.padre_texto);
    }
  }, [open, initial.mother_id, initial.father_id, initial.madre_texto, initial.padre_texto]);

  const onGuardar = async () => {
    try {
      await update.mutateAsync({
        mother_id: motherId,
        father_id: fatherId,
        madre_texto: madreTexto,
        padre_texto: padreTexto,
      });
      toast.success("Relaciones actualizadas");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar genealogía</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Madre</Label>
            <SelectorAnimal
              value={motherId}
              onChange={setMotherId}
              sexo="hembra"
              excludeId={animalId}
              placeholder="Seleccionar madre del catálogo…"
            />
            <Input
              value={madreTexto}
              onChange={(e) => setMadreTexto(e.target.value)}
              placeholder="Texto libre (si no está en el catálogo)"
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>Padre</Label>
            <SelectorAnimal
              value={fatherId}
              onChange={setFatherId}
              sexo="macho"
              excludeId={animalId}
              placeholder="Seleccionar padre del catálogo…"
            />
            <Input
              value={padreTexto}
              onChange={(e) => setPadreTexto(e.target.value)}
              placeholder="Texto libre (si no está en el catálogo)"
              className="min-h-11"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-11"
          >
            Cancelar
          </Button>
          <Button
            onClick={onGuardar}
            disabled={update.isPending}
            className="min-h-11"
          >
            {update.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAnimal } from "../hooks/useAnimal";
import { useHijos } from "../hooks/useHijos";
import { useUpdateRelaciones } from "../hooks/useUpdateRelaciones";
import { SelectorAnimal } from "./SelectorAnimal";

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
  const update = useUpdateRelaciones(animalId, numero);

  const [motherId, setMotherId] = useState<string | null>(null);
  const [fatherId, setFatherId] = useState<string | null>(null);
  const [madreTexto, setMadreTexto] = useState("");
  const [padreTexto, setPadreTexto] = useState("");

  useEffect(() => {
    if (!animal) return;
    setMotherId(animal.mother_id);
    setFatherId(animal.father_id);
    setMadreTexto(animal.madre_texto ?? "");
    setPadreTexto(animal.padre_texto ?? "");
  }, [animal]);

  const onGuardar = async () => {
    try {
      await update.mutateAsync({
        mother_id: motherId,
        father_id: fatherId,
        madre_texto: madreTexto,
        padre_texto: padreTexto,
      });
      toast.success("Relaciones actualizadas");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Padres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="flex justify-end">
            <Button
              onClick={onGuardar}
              disabled={update.isPending}
              className="min-h-11"
            >
              {update.isPending ? "Guardando…" : "Guardar relaciones"}
            </Button>
          </div>
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
                  {h.sexo === "hembra" ? (
                    <Button asChild variant="ghost" size="sm" className="min-h-10">
                      <Link to="/vacas/$numero" params={{ numero: h.numero }}>
                        Ver
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      (sin perfil aún)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
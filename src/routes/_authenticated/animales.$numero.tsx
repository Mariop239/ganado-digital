import { createFileRoute, Link } from "@tanstack/react-router";
import { PerfilAnimal, useAnimal } from "@/modules/animals";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/animales/$numero")({
  component: AnimalDetalle,
});

function AnimalDetalle() {
  const { numero } = Route.useParams();
  const { data, isLoading, error } = useAnimal(numero);

  if (isLoading) return <p className="py-10 text-center text-muted-foreground">Cargando…</p>;
  if (error) return <p className="py-10 text-center text-destructive">Error al cargar el animal.</p>;
  if (!data) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">No se encontró el animal #{numero}.</p>
        <Button asChild><Link to="/">Volver al listado</Link></Button>
      </div>
    );
  }
  return <PerfilAnimal animal={data} />;
}
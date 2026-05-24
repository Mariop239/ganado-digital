import { createFileRoute, Link } from "@tanstack/react-router";
import { PerfilVaca } from "@/components/vacas/PerfilVaca";
import { useVaca } from "@/hooks/useVacas";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/vacas/$numero")({
  component: VacaDetalle,
});

function VacaDetalle() {
  const { numero } = Route.useParams();
  const { data, isLoading, error } = useVaca(numero);

  if (isLoading) return <p className="py-10 text-center text-muted-foreground">Cargando…</p>;
  if (error) return <p className="py-10 text-center text-destructive">Error al cargar la vaca.</p>;
  if (!data) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">No se encontró la vaca #{numero}.</p>
        <Button asChild><Link to="/">Volver al listado</Link></Button>
      </div>
    );
  }
  return <PerfilVaca vaca={data} />;
}
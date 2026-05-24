import { createFileRoute } from "@tanstack/react-router";
import { ListaVacas } from "@/modules/cows";

export const Route = createFileRoute("/_authenticated/")({
  component: ListaVacas,
});
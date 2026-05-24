import { createFileRoute } from "@tanstack/react-router";
import { ListaVacas } from "@/components/vacas/ListaVacas";

export const Route = createFileRoute("/_authenticated/")({
  component: ListaVacas,
});
import { createFileRoute } from "@tanstack/react-router";
import { ListaAnimales } from "@/modules/animals";

export const Route = createFileRoute("/_authenticated/animales/")({
  component: ListaAnimales,
});
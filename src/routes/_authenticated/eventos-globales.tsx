import { createFileRoute } from "@tanstack/react-router";
import { EventosGlobales } from "@/modules/animals/events";

export const Route = createFileRoute("/_authenticated/eventos-globales")({
  component: EventosGlobales,
});
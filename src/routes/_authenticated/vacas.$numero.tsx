import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias legacy: /vacas/$numero → /animales/$numero
export const Route = createFileRoute("/_authenticated/vacas/$numero")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/animales/$numero", params: { numero: params.numero } });
  },
});
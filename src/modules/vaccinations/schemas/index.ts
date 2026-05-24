import { z } from "zod";

export const vacunaSchema = z.object({
  fecha: z.string().min(1, "Requerida").refine((d) => new Date(d) <= new Date(), {
    message: "La fecha no puede ser futura",
  }),
  vacuna_aplicada: z.string().trim().min(1, "Requerida").max(150),
  enfermedad_a_prevenir: z.string().trim().max(150),
  gasto: z.number({ message: "Debe ser un número" }).min(0, "Debe ser ≥ 0"),
  observaciones: z.string().trim().max(1000),
});

export type VacunaInput = z.infer<typeof vacunaSchema>;
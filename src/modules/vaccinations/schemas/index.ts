import { z } from "zod";

export const tipoTratamientoEnum = z.enum([
  "vacuna",
  "vitamina",
  "desparasitante",
  "tratamiento_medico",
]);

export type TipoTratamiento = z.infer<typeof tipoTratamientoEnum>;

export const TIPO_TRATAMIENTO_LABELS: Record<TipoTratamiento, string> = {
  vacuna: "Vacuna",
  vitamina: "Vitamina",
  desparasitante: "Desparasitante",
  tratamiento_medico: "Tratamiento Médico",
};

export const vacunaSchema = z.object({
  tipo_tratamiento: tipoTratamientoEnum,
  fecha: z.string().min(1, "Requerida").refine((d) => new Date(d) <= new Date(), {
    message: "La fecha no puede ser futura",
  }),
  vacuna_aplicada: z.string().trim().min(1, "Requerida").max(150),
  enfermedad_a_prevenir: z.string().trim().max(150),
  gasto: z.number({ message: "Debe ser un número" }).min(0, "Debe ser ≥ 0"),
  observaciones: z.string().trim().max(1000),
  fecha_proxima_dosis: z.string().nullable().optional(),
});

export type VacunaInput = z.infer<typeof vacunaSchema>;
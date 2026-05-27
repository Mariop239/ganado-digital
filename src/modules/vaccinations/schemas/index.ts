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

export const estadoTratamientoEnum = z.enum(["aplicado", "programado"]);
export type EstadoTratamiento = z.infer<typeof estadoTratamientoEnum>;

export const ESTADO_TRATAMIENTO_LABELS: Record<EstadoTratamiento, string> = {
  aplicado: "Aplicado",
  programado: "Programado",
};

export const vacunaSchema = z
  .object({
    tipo_tratamiento: tipoTratamientoEnum,
    estado_tratamiento: estadoTratamientoEnum,
    fecha: z.string().nullable(),
    vacuna_aplicada: z.string().trim().min(1, "Requerida").max(150),
    enfermedad_a_prevenir: z.string().trim().max(150),
    gasto: z.number({ message: "Debe ser un número" }).min(0, "Debe ser ≥ 0"),
    observaciones: z.string().trim().max(1000),
    fecha_proxima_dosis: z.string().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.estado_tratamiento === "aplicado") {
      if (!val.fecha?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fecha"],
          message: "La fecha de aplicación es obligatoria",
        });
      } else if (new Date(val.fecha) > new Date()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fecha"],
          message: "La fecha de aplicación no puede ser futura",
        });
      }
    } else {
      if (!val.fecha_proxima_dosis?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fecha_proxima_dosis"],
          message: "La fecha programada es obligatoria",
        });
      }
    }
  });

export type VacunaInput = z.infer<typeof vacunaSchema>;
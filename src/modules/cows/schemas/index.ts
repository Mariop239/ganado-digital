import { z } from "zod";

export const vacaSchema = z.object({
  numero: z.string().trim().min(1, "Requerido").max(50),
  dueno: z.string().trim().max(100),
  nombre: z.string().trim().max(100),
  color: z.string().trim().max(50),
  raza: z.string().trim().max(50),
  padre: z.string().trim().max(100),
  madre: z.string().trim().max(100),
});

export type VacaInput = z.infer<typeof vacaSchema>;

export const egresoSchema = z.object({
  fecha_egreso: z.string().min(1, "Requerida"),
  motivo_egreso: z.string().trim().min(1, "Requerido").max(300),
}).refine((d) => new Date(d.fecha_egreso) <= new Date(), {
  message: "La fecha no puede ser futura",
  path: ["fecha_egreso"],
});

export type EgresoInput = z.infer<typeof egresoSchema>;
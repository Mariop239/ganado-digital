import { z } from "zod";

export const vacaSchema = z.object({
  numero: z.string().trim().min(1, "Requerido").max(50),
  dueno: z.string().trim().max(100).default(""),
  nombre: z.string().trim().max(100).default(""),
  color: z.string().trim().max(50).default(""),
  raza: z.string().trim().max(50).default(""),
  padre: z.string().trim().max(100).default(""),
  madre: z.string().trim().max(100).default(""),
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

export const historialSchema = z.object({
  fecha_monta: z.string().min(1, "Requerida"),
  toro: z.string().trim().max(100).default(""),
  fecha_parto: z.string().optional().or(z.literal("")),
  sexo_cria: z.enum(["Macho", "Hembra"]).optional().or(z.literal("")),
  fecha_destete: z.string().optional().or(z.literal("")),
  observaciones: z.string().trim().max(1000).optional().or(z.literal("")),
}).superRefine((d, ctx) => {
  if (d.fecha_parto) {
    if (d.fecha_parto < d.fecha_monta) {
      ctx.addIssue({ code: "custom", path: ["fecha_parto"], message: "Debe ser posterior a la monta" });
    }
    const monta = new Date(d.fecha_monta);
    const limite = new Date(monta.getTime() + 320 * 86400000);
    if (new Date(d.fecha_parto) > limite) {
      ctx.addIssue({ code: "custom", path: ["fecha_parto"], message: "Demasiado lejos de la monta (>320 días)" });
    }
    if (!d.sexo_cria) {
      ctx.addIssue({ code: "custom", path: ["sexo_cria"], message: "Requerido cuando hay parto" });
    }
  }
  if (d.fecha_destete) {
    if (!d.fecha_parto) {
      ctx.addIssue({ code: "custom", path: ["fecha_destete"], message: "Requiere fecha de parto" });
    } else if (d.fecha_destete < d.fecha_parto) {
      ctx.addIssue({ code: "custom", path: ["fecha_destete"], message: "Debe ser posterior al parto" });
    }
  }
});

export type HistorialInput = z.infer<typeof historialSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
export type LoginInput = z.infer<typeof loginSchema>;
import { z } from "zod";

export const tipoServicioSchema = z.enum(["monta_natural", "inseminacion"]);
export const estadoServicioSchema = z.enum(["pendiente", "prenada", "vacia", "parida"]);

export const servicioSchema = z.object({
  tipo_servicio: tipoServicioSchema,
  toro: z.string().trim().max(100).default(""),
  fecha_monta: z.string().min(1, "Requerida"),
  estado_servicio: estadoServicioSchema.default("pendiente"),
  observaciones: z.string().trim().max(1000).default(""),
});

export type ServicioFormInput = z.input<typeof servicioSchema>;
export type ServicioInput = z.output<typeof servicioSchema>;

export const historialSchema = z.object({
  fecha_monta: z.string().min(1, "Requerida"),
  toro: z.string().trim().max(100),
  fecha_parto: z.string().max(20),
  sexo_cria: z.union([z.literal(""), z.literal("Macho"), z.literal("Hembra")]),
  fecha_destete: z.string().max(20),
  observaciones: z.string().trim().max(1000),
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
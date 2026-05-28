import { z } from "zod";

export const ventaPayloadSchema = z.object({
  comprador: z.string().trim().min(1, "Requerido").max(150),
  valor: z.number({ message: "Debe ser un número" }).min(0, "Debe ser ≥ 0"),
  notas: z.string().trim().max(500).optional(),
});

export const fallecimientoPayloadSchema = z.object({
  causa: z.string().trim().min(1, "Requerida").max(300),
});

export const trasladoPayloadSchema = z.object({
  destino: z.string().trim().min(1, "Requerido").max(200),
  lote: z.string().trim().max(100).optional(),
});

export const observacionPayloadSchema = z.object({
  texto: z.string().trim().min(1, "Requerido").max(1000),
});

export const tratamientoPayloadSchema = z.object({
  tratamiento: z.string().trim().min(1, "Requerido").max(200),
  dosis: z.string().trim().max(100).optional(),
});

export const otroPayloadSchema = z.object({
  motivo: z.string().trim().min(1, "Requerido").max(300),
});

export type VentaPayload = z.infer<typeof ventaPayloadSchema>;
export type FallecimientoPayload = z.infer<typeof fallecimientoPayloadSchema>;
export type TrasladoPayload = z.infer<typeof trasladoPayloadSchema>;
export type ObservacionPayload = z.infer<typeof observacionPayloadSchema>;
export type TratamientoPayload = z.infer<typeof tratamientoPayloadSchema>;
export type OtroPayload = z.infer<typeof otroPayloadSchema>;
import { z } from "zod";

export const sexoSchema = z.enum(["hembra", "macho"]);

export const categoriaSchema = z.enum([
  "ternero",
  "ternera",
  "novilla",
  "vaca",
  "toro",
  "novillo",
]);

export const estadoReproductivoSchema = z.enum([
  "soltera",
  "gestante",
  "parida",
  "seca",
]);

export const estadoActualSchema = z.enum(["activa", "vendida", "fallecida"]);

export const relacionarPadresSchema = z.object({
  mother_id: z.string().uuid().nullable().optional(),
  father_id: z.string().uuid().nullable().optional(),
  madre_texto: z.string().max(120).optional(),
  padre_texto: z.string().max(120).optional(),
});

export type RelacionarPadresInput = z.infer<typeof relacionarPadresSchema>;
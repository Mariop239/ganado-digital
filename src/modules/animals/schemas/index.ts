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

export const CATEGORIAS_HEMBRA = ["ternera", "novilla", "vaca"] as const;
export const CATEGORIAS_MACHO = ["ternero", "toro", "novillo"] as const;
export const CATEGORIAS_ADULTAS_HEMBRA = ["novilla", "vaca"] as const;

export const animalSchema = z
  .object({
    numero: z.string().trim().min(1, "Requerido").max(50),
    nombre: z.string().trim().max(100).default(""),
    sexo: sexoSchema,
    categoria: categoriaSchema,
    estado_actual: estadoActualSchema.default("activa"),
    estado_reproductivo: estadoReproductivoSchema.nullable().optional(),
    fecha_nacimiento: z.string().nullable().optional(),
    color: z.string().trim().max(50).default(""),
    raza: z.string().trim().max(50).default(""),
    dueno: z.string().trim().max(100).default(""),
    mother_id: z.string().uuid().nullable().optional(),
    father_id: z.string().uuid().nullable().optional(),
    madre_texto: z.string().trim().max(120).default(""),
    padre_texto: z.string().trim().max(120).default(""),
  })
  .superRefine((data, ctx) => {
    // Validación cruzada sexo ↔ categoría
    if (data.sexo === "hembra" && !CATEGORIAS_HEMBRA.includes(data.categoria as typeof CATEGORIAS_HEMBRA[number])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoria"],
        message: "Categoría inválida para hembra (usa ternera, novilla o vaca)",
      });
    }
    if (data.sexo === "macho" && !CATEGORIAS_MACHO.includes(data.categoria as typeof CATEGORIAS_MACHO[number])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoria"],
        message: "Categoría inválida para macho (usa ternero, toro o novillo)",
      });
    }
    // estado_reproductivo solo en hembras adultas
    if (
      data.estado_reproductivo &&
      !(data.sexo === "hembra" && CATEGORIAS_ADULTAS_HEMBRA.includes(data.categoria as typeof CATEGORIAS_ADULTAS_HEMBRA[number]))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estado_reproductivo"],
        message: "Solo aplica a hembras adultas (novilla o vaca)",
      });
    }
  })
  .transform((data) => ({
    ...data,
    // Reset implícito: machos nunca tienen estado_reproductivo
    estado_reproductivo: data.sexo === "macho" ? null : data.estado_reproductivo ?? null,
  }));

export type AnimalFormInput = z.input<typeof animalSchema>;
export type AnimalFormOutput = z.output<typeof animalSchema>;
import { differenceInMonths, parseISO } from "date-fns";
import type { Animal, Categoria, Sexo } from "../types/domain";

export const CATEGORIAS_ADULTAS = ["vaca", "toro"] as const;
export const CATEGORIAS_JUVENILES = [
  "ternero",
  "ternera",
  "novillo",
  "novilla",
] as const;

export type CategoriaAdulta = (typeof CATEGORIAS_ADULTAS)[number];

export function edadEnMeses(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  try {
    return differenceInMonths(new Date(), parseISO(fechaNacimiento));
  } catch {
    return null;
  }
}

type DerivarInput = Pick<Animal, "fecha_nacimiento" | "sexo" | "categoria">;

export type DerivarResult = {
  categoria_view: Categoria;
  requiere_clasificacion: boolean;
  calculada: boolean;
};

/**
 * Pure: NO muta el input. Devuelve únicamente los campos derivados para la UI.
 * `categoria` (persistido) sigue siendo la única fuente de verdad para mutaciones.
 */
export function derivarCategoria(input: DerivarInput): DerivarResult {
  const meses = edadEnMeses(input.fecha_nacimiento);
  const sexo: Sexo = input.sexo;

  // Sin fecha → no se calcula nada.
  if (meses === null) {
    return {
      categoria_view: input.categoria,
      requiere_clasificacion: false,
      calculada: false,
    };
  }

  // 0–9 meses: cría
  if (meses <= 9) {
    const categoria_view: Categoria = sexo === "hembra" ? "ternera" : "ternero";
    return {
      categoria_view,
      requiere_clasificacion: false,
      calculada: true,
    };
  }

  // 9–15 meses: juvenil
  if (meses <= 15) {
    const categoria_view: Categoria = sexo === "hembra" ? "novilla" : "novillo";
    return {
      categoria_view,
      requiere_clasificacion: false,
      calculada: true,
    };
  }

  // > 15 meses: debe ser adulto.
  const esAdultaPersistida = (CATEGORIAS_ADULTAS as readonly string[]).includes(
    input.categoria,
  );
  if (esAdultaPersistida) {
    return {
      categoria_view: input.categoria,
      requiere_clasificacion: false,
      calculada: false,
    };
  }

  // Persistida sigue juvenil (o vacía) → requiere intervención humana.
  return {
    categoria_view: input.categoria,
    requiere_clasificacion: true,
    calculada: false,
  };
}

export function adultasPorSexo(sexo: Sexo): CategoriaAdulta[] {
  return sexo === "hembra" ? ["vaca"] : ["toro"];
}
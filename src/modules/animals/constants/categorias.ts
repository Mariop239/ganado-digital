import type { Categoria, Sexo } from "../types/domain";

export const CATEGORIAS: Categoria[] = [
  "ternero",
  "ternera",
  "novilla",
  "vaca",
  "toro",
  "novillo",
];

export const CATEGORIA_LABELS: Record<Categoria, string> = {
  ternero: "Ternero",
  ternera: "Ternera",
  novilla: "Novilla",
  vaca: "Vaca",
  toro: "Toro",
  novillo: "Novillo",
};

export const SEXO_LABELS: Record<Sexo, string> = {
  hembra: "Hembra",
  macho: "Macho",
};

export const isHembra = (s: Sexo): boolean => s === "hembra";
export const isMacho = (s: Sexo): boolean => s === "macho";
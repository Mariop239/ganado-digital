import type { VacaInput, EgresoInput } from "../schemas";

export type Vaca = {
  numero: string;
  dueno: string;
  nombre: string;
  color: string;
  raza: string;
  padre: string;
  madre: string;
  fecha_egreso: string | null;
  motivo_egreso: string | null;
  created_at: string;
  updated_at: string;
};

export type { VacaInput, EgresoInput };
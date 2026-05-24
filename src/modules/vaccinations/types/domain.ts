import type { VacunaInput } from "../schemas";

export type Vacuna = {
  id: string;
  vaca_numero: string;
  fecha: string;
  vacuna_aplicada: string;
  enfermedad_a_prevenir: string;
  gasto: number;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
};

export type VacunaConVaca = Vacuna & {
  vacas: { numero: string; nombre: string } | null;
};

export type { VacunaInput };
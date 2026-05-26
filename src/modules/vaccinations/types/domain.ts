import type { VacunaInput, TipoTratamiento } from "../schemas";

export type Vacuna = {
  id: string;
  animal_id: string | null;
  vaca_numero: string;
  tipo_tratamiento: TipoTratamiento;
  fecha: string;
  vacuna_aplicada: string;
  enfermedad_a_prevenir: string;
  gasto: number;
  observaciones: string | null;
  fecha_proxima_dosis: string | null;
  created_at: string;
  updated_at: string;
};

export type VacunaConVaca = Vacuna & {
  vacas: { numero: string; nombre: string } | null;
};

export type { VacunaInput, TipoTratamiento };
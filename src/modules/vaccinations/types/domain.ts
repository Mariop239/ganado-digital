import type { VacunaInput, TipoTratamiento, EstadoTratamiento } from "../schemas";

export type Vacuna = {
  id: string;
  animal_id: string | null;
  tipo_tratamiento: TipoTratamiento;
  estado_tratamiento: EstadoTratamiento;
  fecha: string | null;
  vacuna_aplicada: string;
  enfermedad_a_prevenir: string;
  gasto: number;
  observaciones: string | null;
  fecha_proxima_dosis: string | null;
  batch_id: string | null;
  created_at: string;
  updated_at: string;
};

export type VacunaConVaca = Vacuna & {
  animals: { numero: string; nombre: string } | null;
};

export type { VacunaInput, TipoTratamiento, EstadoTratamiento };
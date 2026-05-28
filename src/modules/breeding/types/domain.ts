import type { HistorialInput, ServicioInput, ServicioFormInput } from "../schemas";

export type TipoServicio = "monta_natural" | "inseminacion";
export type EstadoServicio = "pendiente" | "prenada" | "vacia" | "parida";

export type Historial = {
  id: string;
  animal_id: string | null;
  fecha_monta: string;
  toro: string;
  tipo_servicio: TipoServicio;
  estado_servicio: EstadoServicio;
  fecha_probable_parto: string | null;
  fecha_confirmacion: string | null;
  fecha_palpado: string | null;
  cria_animal_id: string | null;
  fecha_parto: string | null;
  sexo_cria: "Macho" | "Hembra" | null;
  fecha_destete: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
};

export type { HistorialInput, ServicioInput, ServicioFormInput };
import type { HistorialInput } from "../schemas";

export type Historial = {
  id: string;
  vaca_numero: string;
  fecha_monta: string;
  toro: string;
  fecha_parto: string | null;
  sexo_cria: "Macho" | "Hembra" | null;
  fecha_destete: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
};

export type { HistorialInput };
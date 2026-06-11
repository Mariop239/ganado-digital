import type {
  VentaPayload,
  FallecimientoPayload,
  TrasladoPayload,
  ObservacionPayload,
  OtroPayload,
} from "../schemas/payloads";

export type AnimalEventType =
  | "venta"
  | "fallecimiento"
  | "traslado"
  | "observacion"
  | "otro";

export type EventPayloadMap = {
  venta: VentaPayload;
  fallecimiento: FallecimientoPayload;
  traslado: TrasladoPayload;
  observacion: ObservacionPayload;
  otro: OtroPayload;
};

export type AnimalEventEstado = "hecho" | "programado";

export type AnimalEvent<T extends AnimalEventType = AnimalEventType> = {
  id: string;
  animal_id: string | null;
  tipo: T;
  fecha: string;
  payload: EventPayloadMap[T];
  observaciones: string | null;
  is_terminal: boolean;
  batch_id: string | null;
  estado: AnimalEventEstado;
  fecha_ejecucion: string | null;
  created_at: string;
  updated_at: string;
};

export type AnimalEventInput<T extends AnimalEventType = AnimalEventType> = {
  tipo: T;
  fecha: string;
  payload: EventPayloadMap[T];
  observaciones?: string | null;
  /** Default 'hecho'. Si es 'programado' se requiere `fecha_ejecucion`. */
  estado?: AnimalEventEstado;
  /** Fecha futura (>= hoy) en que se ejecutará el evento programado. */
  fecha_ejecucion?: string | null;
};
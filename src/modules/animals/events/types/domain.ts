import type {
  VentaPayload,
  FallecimientoPayload,
  TrasladoPayload,
  ObservacionPayload,
  TratamientoPayload,
  OtroPayload,
} from "../schemas/payloads";

export type AnimalEventType =
  | "venta"
  | "fallecimiento"
  | "traslado"
  | "observacion"
  | "tratamiento"
  | "otro";

export type EventPayloadMap = {
  venta: VentaPayload;
  fallecimiento: FallecimientoPayload;
  traslado: TrasladoPayload;
  observacion: ObservacionPayload;
  tratamiento: TratamientoPayload;
  otro: OtroPayload;
};

export type AnimalEvent<T extends AnimalEventType = AnimalEventType> = {
  id: string;
  animal_id: string | null;
  vaca_numero: string;
  tipo: T;
  fecha: string;
  payload: EventPayloadMap[T];
  observaciones: string | null;
  is_terminal: boolean;
  created_at: string;
  updated_at: string;
};

export type AnimalEventInput<T extends AnimalEventType = AnimalEventType> = {
  tipo: T;
  fecha: string;
  payload: EventPayloadMap[T];
  observaciones?: string | null;
};
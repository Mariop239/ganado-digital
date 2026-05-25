import type { EstadoActual, EstadoReproductivo } from "../types/domain";

export const ESTADOS_REPRODUCTIVOS: EstadoReproductivo[] = [
  "soltera",
  "gestante",
  "parida",
  "seca",
];

export const ESTADO_REPRODUCTIVO_LABELS: Record<EstadoReproductivo, string> = {
  soltera: "Soltera",
  gestante: "Gestante",
  parida: "Parida",
  seca: "Seca",
};

export const ESTADOS_ACTUALES: EstadoActual[] = [
  "activa",
  "vendida",
  "fallecida",
];

export const ESTADO_ACTUAL_LABELS: Record<EstadoActual, string> = {
  activa: "Activa",
  vendida: "Vendida",
  fallecida: "Fallecida",
};
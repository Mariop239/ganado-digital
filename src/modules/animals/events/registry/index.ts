import {
  Banknote,
  Skull,
  Truck,
  Eye,
  Stethoscope,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { ZodTypeAny } from "zod";
import {
  ventaPayloadSchema,
  fallecimientoPayloadSchema,
  trasladoPayloadSchema,
  observacionPayloadSchema,
  tratamientoPayloadSchema,
  otroPayloadSchema,
} from "../schemas/payloads";
import type { AnimalEventType, EventPayloadMap } from "../types/domain";

export type FieldKind = "text" | "textarea" | "number";

export type EventField<T extends AnimalEventType> = {
  name: keyof EventPayloadMap[T] & string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
};

export type EventDefinition<T extends AnimalEventType> = {
  tipo: T;
  label: string;
  description: string;
  icon: LucideIcon;
  isTerminal: boolean;
  schema: ZodTypeAny;
  fields: ReadonlyArray<EventField<T>>;
  summarize: (payload: EventPayloadMap[T]) => string;
};

type Registry = { [K in AnimalEventType]: EventDefinition<K> };

export const EVENT_REGISTRY: Registry = {
  venta: {
    tipo: "venta",
    label: "Venta",
    description: "Registra la venta del animal. Marca a la vaca como egresada.",
    icon: Banknote,
    isTerminal: true,
    schema: ventaPayloadSchema,
    fields: [
      { name: "comprador", label: "Comprador", kind: "text", required: true },
      { name: "valor", label: "Valor de venta", kind: "number", required: true },
      { name: "notas", label: "Notas", kind: "textarea" },
    ],
    summarize: (p) => `${p.comprador} — $${p.valor.toLocaleString()}`,
  },
  fallecimiento: {
    tipo: "fallecimiento",
    label: "Fallecimiento",
    description: "Registra el fallecimiento del animal. Marca a la vaca como egresada.",
    icon: Skull,
    isTerminal: true,
    schema: fallecimientoPayloadSchema,
    fields: [{ name: "causa", label: "Causa", kind: "textarea", required: true }],
    summarize: (p) => p.causa,
  },
  traslado: {
    tipo: "traslado",
    label: "Traslado",
    description: "Movimiento del animal a otra ubicación.",
    icon: Truck,
    isTerminal: false,
    schema: trasladoPayloadSchema,
    fields: [
      { name: "destino", label: "Destino", kind: "text", required: true },
      { name: "lote", label: "Lote/Grupo", kind: "text", placeholder: "Ej: Lote A" },
    ],
    summarize: (p) => `→ ${p.destino}${p.lote ? ` · Lote ${p.lote}` : ""}`,
  },
  observacion: {
    tipo: "observacion",
    label: "Observación",
    description: "Anotación general sobre el animal.",
    icon: Eye,
    isTerminal: false,
    schema: observacionPayloadSchema,
    fields: [{ name: "texto", label: "Observación", kind: "textarea", required: true }],
    summarize: (p) => p.texto,
  },
  tratamiento: {
    tipo: "tratamiento",
    label: "Tratamiento médico",
    description: "Aplicación de tratamiento médico (no vacuna).",
    icon: Stethoscope,
    isTerminal: false,
    schema: tratamientoPayloadSchema,
    fields: [
      { name: "tratamiento", label: "Tratamiento", kind: "text", required: true },
      { name: "dosis", label: "Dosis", kind: "text" },
    ],
    summarize: (p) => (p.dosis ? `${p.tratamiento} (${p.dosis})` : p.tratamiento),
  },
  otro: {
    tipo: "otro",
    label: "Otro",
    description: "Otro tipo de evento. Marca a la vaca como egresada.",
    icon: FileText,
    isTerminal: true,
    schema: otroPayloadSchema,
    fields: [{ name: "motivo", label: "Motivo", kind: "textarea", required: true }],
    summarize: (p) => p.motivo,
  },
};

export const EVENT_TYPES = Object.keys(EVENT_REGISTRY) as AnimalEventType[];
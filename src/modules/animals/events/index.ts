export { EventTimeline } from "./components/EventTimeline";
export { EventDialog } from "./components/EventDialog";
export { DynamicEventForm } from "./components/DynamicEventForm";
export { EventosGlobales } from "./pages/EventosGlobales";
export {
  useAnimalEvents,
  useCreateAnimalEvent,
  useDeleteAnimalEvent,
  useAllAnimalEvents,
  useCreateBulkEvent,
} from "./hooks/useAnimalEvents";
export { EVENT_REGISTRY, EVENT_TYPES } from "./registry";
export type {
  AnimalEvent,
  AnimalEventInput,
  AnimalEventType,
  EventPayloadMap,
} from "./types/domain";
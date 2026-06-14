export { HistorialTabla } from "./components/HistorialTabla";
export { FormHistorial } from "./components/FormHistorial";
export {
  useHistorial,
  useCreateServicio,
  useUpdateServicio,
  useDeleteHistorial,
  useMarcarParida,
  useCreateBulkServicio,
  useHistorialPendientes,
  useMarcarServicioCompletado,
} from "./hooks/useHistorial";
export { useNacimientosMes } from "./hooks/useNacimientosMes";
export { useAlertasCrianza } from "./hooks/useAlertasCrianza";
export type { AlertaCrianza, AlertaCrianzaTipo } from "./hooks/useAlertasCrianza";
export { useMarcarDestetado } from "./hooks/useMarcarDestetado";
export { servicioSchema } from "./schemas";
export type {
  Historial,
  ServicioInput,
  ServicioFormInput,
  TipoServicio,
  EstadoServicio,
} from "./types/domain";
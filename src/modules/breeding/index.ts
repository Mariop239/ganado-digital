export { HistorialTabla } from "./components/HistorialTabla";
export { FormHistorial } from "./components/FormHistorial";
export {
  useHistorial,
  useCreateServicio,
  useUpdateServicio,
  useDeleteHistorial,
  useMarcarParida,
} from "./hooks/useHistorial";
export { useNacimientosMes } from "./hooks/useNacimientosMes";
export { servicioSchema } from "./schemas";
export type {
  Historial,
  ServicioInput,
  ServicioFormInput,
  TipoServicio,
  EstadoServicio,
} from "./types/domain";
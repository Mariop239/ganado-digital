/**
 * @deprecated Módulo legacy. La UI ahora vive en `@/modules/animals`.
 * Solo se mantiene como capa interna: repositorio + hooks usados por
 * `breeding`, `vaccinations` y `events` mientras siguen referenciando
 * `vaca_numero`.
 */
export {
  useVacas,
  useVaca,
  useCreateVaca,
  useUpdateVaca,
  useMarcarEgreso,
  useReactivarVaca,
  useDeleteVaca,
} from "./hooks/useVacas";
export { vacaSchema, egresoSchema } from "./schemas";
export type { Vaca, VacaInput, EgresoInput } from "./types/domain";
export { ListaVacas } from "./components/ListaVacas";
export { PerfilVaca } from "./components/PerfilVaca";
export { FormVaca } from "./components/FormVaca";
export { EgresoDialog } from "./components/EgresoDialog";
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
export { useAnimal } from "./hooks/useAnimal";
export { useAnimalById } from "./hooks/useAnimalById";
export {
  useAnimals,
  useCreateAnimal,
  useUpdateAnimal,
  useMarcarEgresoAnimal,
  useReactivarAnimal,
  useDeleteAnimal,
} from "./hooks/useAnimals";
export { useHijos } from "./hooks/useHijos";
export { useUpdateRelaciones } from "./hooks/useUpdateRelaciones";
export { SelectorAnimal } from "./components/SelectorAnimal";
export { FamiliaTab } from "./components/FamiliaTab";
export { FormAnimal } from "./components/FormAnimal";
export { ListaAnimales } from "./components/ListaAnimales";
export { PerfilAnimal } from "./components/PerfilAnimal";
export { EstadoAnimalDialog } from "./components/EstadoAnimalDialog";
export { ClasificacionAdultaDialog } from "./components/ClasificacionAdultaDialog";
export { animalSchema } from "./schemas";
export type { AnimalFormInput, AnimalFormOutput } from "./schemas";
export type {
  Animal,
  AnimalView,
  Sexo,
  Categoria,
  EstadoActual,
  EstadoReproductivo,
  AnimalFiltros,
  AnimalRelacionInput,
} from "./types/domain";
export {
  derivarCategoria,
  edadEnMeses,
  CATEGORIAS_ADULTAS,
  CATEGORIAS_JUVENILES,
  adultasPorSexo,
} from "./utils/categorias";
export {
  CATEGORIAS,
  CATEGORIA_LABELS,
  SEXO_LABELS,
  isHembra,
  isMacho,
  categoriasPorSexo,
  aplicaEstadoReproductivo,
} from "./constants/categorias";
export {
  ESTADOS_REPRODUCTIVOS,
  ESTADO_REPRODUCTIVO_LABELS,
  ESTADOS_ACTUALES,
  ESTADO_ACTUAL_LABELS,
} from "./constants/estados";
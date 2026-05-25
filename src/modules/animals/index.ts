export { useAnimal } from "./hooks/useAnimal";
export { useAnimals } from "./hooks/useAnimals";
export { useHijos } from "./hooks/useHijos";
export { useUpdateRelaciones } from "./hooks/useUpdateRelaciones";
export { SelectorAnimal } from "./components/SelectorAnimal";
export { FamiliaTab } from "./components/FamiliaTab";
export type {
  Animal,
  Sexo,
  Categoria,
  EstadoActual,
  EstadoReproductivo,
  AnimalFiltros,
  AnimalRelacionInput,
} from "./types/domain";
export {
  CATEGORIAS,
  CATEGORIA_LABELS,
  SEXO_LABELS,
  isHembra,
  isMacho,
} from "./constants/categorias";
export {
  ESTADOS_REPRODUCTIVOS,
  ESTADO_REPRODUCTIVO_LABELS,
  ESTADOS_ACTUALES,
  ESTADO_ACTUAL_LABELS,
} from "./constants/estados";
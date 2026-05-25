import { useQuery } from "@tanstack/react-query";
import { listAnimals } from "../repositories/animals.repository";
import type { AnimalFiltros } from "../types/domain";

export function useAnimals(filtros: AnimalFiltros = {}) {
  return useQuery({
    queryKey: ["animals", filtros],
    queryFn: () => listAnimals(filtros),
  });
}
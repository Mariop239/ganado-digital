import { useQuery } from "@tanstack/react-query";
import { getAnimalByNumero, getAnimalById } from "../repositories/animals.repository";

export function useAnimal(numero: string, id?: string) {
  return useQuery({
    queryKey: id ? ["animal-by-id", id] : ["animal", numero],
    queryFn: () => (id ? getAnimalById(id) : getAnimalByNumero(numero)),
    enabled: !!(id || numero),
  });
}
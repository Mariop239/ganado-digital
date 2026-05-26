import { useQuery } from "@tanstack/react-query";
import { getAnimalByNumero, getAnimalById } from "../repositories/animals.repository";

export function useAnimal(numero: string, id?: string) {
  if (id) {
    return useQuery({
      queryKey: ["animal-by-id", id],
      queryFn: () => getAnimalById(id),
      enabled: !!id,
    });
  }
  return useQuery({
    queryKey: ["animal", numero],
    queryFn: () => getAnimalByNumero(numero),
    enabled: !!numero,
  });
}
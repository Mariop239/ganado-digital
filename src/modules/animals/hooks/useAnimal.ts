import { useQuery } from "@tanstack/react-query";
import { getAnimalByNumero } from "../repositories/animals.repository";

export function useAnimal(numero: string) {
  return useQuery({
    queryKey: ["animal", numero],
    queryFn: () => getAnimalByNumero(numero),
    enabled: !!numero,
  });
}
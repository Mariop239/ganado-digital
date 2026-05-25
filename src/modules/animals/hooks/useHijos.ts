import { useQuery } from "@tanstack/react-query";
import { listHijos } from "../repositories/animals.repository";

export function useHijos(animalId: string | null | undefined) {
  return useQuery({
    queryKey: ["animal-hijos", animalId],
    queryFn: () => listHijos(animalId as string),
    enabled: !!animalId,
  });
}
import { useQuery } from "@tanstack/react-query";
import { getAnimalById } from "../repositories/animals.repository";

export function useAnimalById(id: string | null | undefined) {
  return useQuery({
    queryKey: ["animal-by-id", id],
    queryFn: () => getAnimalById(id as string),
    enabled: !!id,
  });
}
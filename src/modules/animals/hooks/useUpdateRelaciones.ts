import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateRelaciones } from "../repositories/animals.repository";
import type { AnimalRelacionInput } from "../types/domain";

export function useUpdateRelaciones(animalId: string, numero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AnimalRelacionInput) => updateRelaciones(animalId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animal", numero] });
      qc.invalidateQueries({ queryKey: ["animals"] });
      qc.invalidateQueries({ queryKey: ["animal-hijos"] });
    },
  });
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVacuna, deleteVacuna, listVacunasGlobal, listVacunasPorVaca,
} from "../repositories/vacunas.repository";
import type { VacunaInput } from "../types/domain";

export function useVacunasGlobal() {
  return useQuery({ queryKey: ["vacunas", "global"], queryFn: listVacunasGlobal });
}

export function useVacunasPorVaca(vacaNumero: string) {
  return useQuery({
    queryKey: ["vacunas", "por-vaca", vacaNumero],
    queryFn: () => listVacunasPorVaca(vacaNumero),
    enabled: !!vacaNumero,
  });
}

export function useCreateVacuna(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VacunaInput) => createVacuna(vacaNumero, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacunas"] });
    },
  });
}

export function useDeleteVacuna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVacuna(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vacunas"] }),
  });
}
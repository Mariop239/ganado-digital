import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVaca,
  deleteVaca,
  getVaca,
  listVacas,
  marcarEgreso,
  reactivarVaca,
  updateVaca,
} from "@/lib/vacas-repository";
import type { EgresoInput, VacaInput } from "@/lib/schemas";

export function useVacas(soloActivas = true) {
  return useQuery({
    queryKey: ["vacas", { soloActivas }],
    queryFn: () => listVacas(soloActivas),
  });
}

export function useVaca(numero: string) {
  return useQuery({
    queryKey: ["vaca", numero],
    queryFn: () => getVaca(numero),
    enabled: !!numero,
  });
}

export function useCreateVaca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VacaInput) => createVaca(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vacas"] }),
  });
}

export function useUpdateVaca(numero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<VacaInput>) => updateVaca(numero, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacas"] });
      qc.invalidateQueries({ queryKey: ["vaca", numero] });
    },
  });
}

export function useMarcarEgreso(numero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EgresoInput) => marcarEgreso(numero, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacas"] });
      qc.invalidateQueries({ queryKey: ["vaca", numero] });
    },
  });
}

export function useReactivarVaca(numero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reactivarVaca(numero),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacas"] });
      qc.invalidateQueries({ queryKey: ["vaca", numero] });
    },
  });
}

export function useDeleteVaca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (numero: string) => deleteVaca(numero),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vacas"] }),
  });
}
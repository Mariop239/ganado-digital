import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHistorial,
  deleteHistorial,
  listHistorial,
  updateHistorial,
} from "@/lib/historial-repository";
import type { HistorialInput } from "@/lib/schemas";

export function useHistorial(vacaNumero: string) {
  return useQuery({
    queryKey: ["historial", vacaNumero],
    queryFn: () => listHistorial(vacaNumero),
    enabled: !!vacaNumero,
  });
}

export function useCreateHistorial(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HistorialInput) => createHistorial(vacaNumero, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["historial", vacaNumero] }),
  });
}

export function useUpdateHistorial(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: HistorialInput }) => updateHistorial(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["historial", vacaNumero] }),
  });
}

export function useDeleteHistorial(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHistorial(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["historial", vacaNumero] }),
  });
}
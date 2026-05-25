import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createServicio,
  deleteHistorial,
  listHistorial,
  updateServicio,
  marcarParida,
  type MarcarParidaInput,
} from "../repositories/historial.repository";
import type { ServicioInput } from "../types/domain";

export function useHistorial(vacaNumero: string) {
  return useQuery({
    queryKey: ["historial", vacaNumero],
    queryFn: () => listHistorial(vacaNumero),
    enabled: !!vacaNumero,
  });
}

export function useCreateServicio(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ServicioInput) => createServicio(vacaNumero, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["historial", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["animal", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["animals"] });
      qc.invalidateQueries({ queryKey: ["vaca", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["vacas"] });
    },
  });
}

export function useUpdateServicio(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServicioInput }) => updateServicio(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["historial", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["animal", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["animals"] });
      qc.invalidateQueries({ queryKey: ["vaca", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["vacas"] });
    },
  });
}

export function useDeleteHistorial(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHistorial(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["historial", vacaNumero] }),
  });
}

export function useMarcarParida(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MarcarParidaInput }) =>
      marcarParida(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["historial", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["animal", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["animals"] });
      qc.invalidateQueries({ queryKey: ["vaca", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["vacas"] });
    },
  });
}
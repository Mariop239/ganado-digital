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

export function useHistorial(animalId: string) {
  return useQuery({
    queryKey: ["historial", animalId],
    queryFn: () => listHistorial(animalId),
    enabled: !!animalId,
  });
}

export function useCreateServicio(animalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ServicioInput) => createServicio(animalId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["historial", animalId] });
      qc.invalidateQueries({ queryKey: ["animal-by-id", animalId] });
      qc.invalidateQueries({ queryKey: ["animals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateServicio(animalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServicioInput }) => updateServicio(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["historial", animalId] });
      qc.invalidateQueries({ queryKey: ["animal-by-id", animalId] });
      qc.invalidateQueries({ queryKey: ["animals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteHistorial(animalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHistorial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["historial", animalId] });
      qc.invalidateQueries({ queryKey: ["animals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarcarParida(animalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MarcarParidaInput }) =>
      marcarParida(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["historial", animalId] });
      qc.invalidateQueries({ queryKey: ["animal-by-id", animalId] });
      qc.invalidateQueries({ queryKey: ["animals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvent,
  deleteEvent,
  listEventsPorVaca,
} from "../repositories/events.repository";
import type { AnimalEventInput, AnimalEventType } from "../types/domain";

export function useAnimalEvents(vacaNumero: string) {
  return useQuery({
    queryKey: ["animal-events", vacaNumero],
    queryFn: () => listEventsPorVaca(vacaNumero),
    enabled: !!vacaNumero,
  });
}

export function useCreateAnimalEvent(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: <T extends AnimalEventType>(input: AnimalEventInput<T>) =>
      createEvent(vacaNumero, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animal-events", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["vaca", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["vacas"] });
    },
  });
}

export function useDeleteAnimalEvent(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animal-events", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["vaca", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["vacas"] });
    },
  });
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvent,
  deleteEvent,
  listEventsPorVaca,
} from "../repositories/events.repository";
import type { AnimalEventInput } from "../types/domain";
import { updateUbicacionLote } from "@/modules/animals/repositories/animals.repository";

export function useAnimalEvents(vacaNumero: string) {
  return useQuery({
    queryKey: ["animal-events", vacaNumero],
    queryFn: () => listEventsPorVaca(vacaNumero),
    enabled: !!vacaNumero,
  });
}

export function useCreateAnimalEvent(vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, AnimalEventInput>({
    mutationFn: async (input) => {
      const evt = await createEvent(vacaNumero, input);
      if (input.tipo === "traslado") {
        const payload = input.payload as { destino: string; lote?: string };
        try {
          await updateUbicacionLote(vacaNumero, {
            ubicacion_actual: payload.destino,
            lote_actual: payload.lote ?? null,
          });
        } catch (e) {
          console.error("No se pudo actualizar ubicación/lote del animal", e);
        }
      }
      return evt;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animal-events", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["vaca", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["vacas"] });
      qc.invalidateQueries({ queryKey: ["animal", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["animals"] });
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
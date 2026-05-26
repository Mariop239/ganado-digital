import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvent,
  deleteEvent,
  listEventsPorAnimal,
} from "../repositories/events.repository";
import type { AnimalEventInput } from "../types/domain";
import {
  updateUbicacionLote,
  aplicarEgresoSinEvento,
} from "@/modules/animals/repositories/animals.repository";

export function useAnimalEvents(animalId: string) {
  return useQuery({
    queryKey: ["animal-events", animalId],
    queryFn: () => listEventsPorAnimal(animalId),
    enabled: !!animalId,
  });
}

export function useCreateAnimalEvent(animalId: string, vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, AnimalEventInput>({
    mutationFn: async (input) => {
      const evt = await createEvent(animalId, vacaNumero, input);
      if (input.tipo === "traslado") {
        const payload = input.payload as { destino: string; lote?: string };
        try {
          await updateUbicacionLote(animalId, {
            ubicacion_actual: payload.destino,
            lote_actual: payload.lote ?? null,
          });
        } catch (e) {
          console.error("No se pudo actualizar ubicación/lote del animal", e);
        }
      }
      if (input.tipo === "venta" || input.tipo === "fallecimiento") {
        const estado = input.tipo === "venta" ? "vendida" : "fallecida";
        const payload = input.payload as { comprador?: string; causa?: string };
        const motivo =
          input.tipo === "venta"
            ? `Venta: ${payload.comprador ?? ""}`.trim()
            : `Fallecimiento: ${payload.causa ?? ""}`.trim();
        try {
          await aplicarEgresoSinEvento(animalId, {
            fecha: input.fecha,
            motivo,
            estado,
          });
        } catch (e) {
          console.error("No se pudo actualizar el estado del animal", e);
        }
      }
      return evt;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animal-events", animalId] });
      qc.invalidateQueries({ queryKey: ["vaca", vacaNumero] });
      qc.invalidateQueries({ queryKey: ["vacas"] });
      qc.invalidateQueries({ queryKey: ["animal-by-id", animalId] });
      qc.invalidateQueries({ queryKey: ["animals"] });
    },
  });
}

export function useDeleteAnimalEvent(animalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animal-events", animalId] });
      qc.invalidateQueries({ queryKey: ["animal-by-id", animalId] });
      qc.invalidateQueries({ queryKey: ["vacas"] });
    },
  });
}
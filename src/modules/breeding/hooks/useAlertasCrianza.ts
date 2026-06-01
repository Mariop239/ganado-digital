import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AlertaCrianzaTipo = "parto" | "destete";

export type AlertaCrianza = {
  id: string;
  tipo: AlertaCrianzaTipo;
  /** id real del registro de historial (sin prefijo) */
  historial_id: string;
  animal_id: string;
  animal_numero: string;
  animal_nombre: string;
  /** Toro registrado en el servicio (solo informativo para parto) */
  toro: string | null;
  /** Fecha clave de la alerta (probable parto o fecha estimada de destete) en ISO YYYY-MM-DD */
  fecha_clave: string;
  /** Para destete: fecha real de parto */
  fecha_parto: string | null;
};

// Gestación bovina ≈ 283 días.
const GESTACION_DIAS = 283;
// Destete típico ≈ 7 meses.
const DESTETE_DIAS = 210;

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function useAlertasCrianza() {
  return useQuery({
    queryKey: ["dashboard", "alertas-crianza"],
    queryFn: async (): Promise<AlertaCrianza[]> => {
      const { data, error } = await supabase
        .from("historial")
        .select(
          "id, animal_id, toro, estado_servicio, fecha_monta, fecha_probable_parto, fecha_parto, fecha_destete, animals!inner(numero, nombre, estado_actual)",
        )
        .eq("animals.estado_actual", "activa")
        .in("estado_servicio", ["pendiente", "prenada", "parida"]);
      if (error) throw error;

      const alertas: AlertaCrianza[] = [];
      for (const r of (data ?? []) as any[]) {
        const base = {
          historial_id: r.id as string,
          animal_id: r.animal_id as string,
          animal_numero: r.animals?.numero ?? "",
          animal_nombre: r.animals?.nombre ?? "",
          toro: (r.toro ?? null) as string | null,
        };
        if (r.estado_servicio === "vacia") {
          continue;
        }
        if (!r.fecha_parto) {
          if (r.estado_servicio !== "pendiente" && r.estado_servicio !== "prenada") {
            continue;
          }
          const fecha =
            r.fecha_probable_parto ??
            (r.fecha_monta ? addDays(r.fecha_monta, GESTACION_DIAS) : null);
          if (fecha) {
            alertas.push({
              id: `parto-${r.id}`,
              tipo: "parto",
              fecha_clave: fecha,
              fecha_parto: null,
              ...base,
            });
          }
        } else if (!r.fecha_destete) {
          alertas.push({
            id: `destete-${r.id}`,
            tipo: "destete",
            fecha_clave: addDays(r.fecha_parto, DESTETE_DIAS),
            fecha_parto: r.fecha_parto,
            ...base,
          });
        }
      }

      alertas.sort((a, b) => a.fecha_clave.localeCompare(b.fecha_clave));
      return alertas;
    },
  });
}
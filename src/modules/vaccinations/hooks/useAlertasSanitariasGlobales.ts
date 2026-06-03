import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AlertaSanitaria = {
  id: string;
  animal_id: string;
  animal_numero: string;
  animal_nombre: string;
  vacuna_aplicada: string;
  tipo_tratamiento: string;
  fecha_proxima_dosis: string;
};

export function useAlertasSanitariasGlobales() {
  return useQuery({
    queryKey: ["dashboard", "alertas-sanitarias-globales"],
    queryFn: async (): Promise<AlertaSanitaria[]> => {
      const { data, error } = await supabase
        .from("control_vacunas")
        .select(
          "id, animal_id, vacuna_aplicada, tipo_tratamiento, fecha_proxima_dosis, animals!inner(numero, nombre, estado_actual)",
        )
        .not("fecha_proxima_dosis", "is", null)
        .eq("animals.estado_actual", "activa")
        .order("fecha_proxima_dosis", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        animal_id: r.animal_id,
        animal_numero: r.animals?.numero ?? "",
        animal_nombre: r.animals?.nombre ?? "",
        vacuna_aplicada: r.vacuna_aplicada,
        tipo_tratamiento: r.tipo_tratamiento,
        fecha_proxima_dosis: r.fecha_proxima_dosis,
      }));
    },
  });
}
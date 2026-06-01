import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMarcarDestetado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (historialId: string) => {
      const hoy = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("historial")
        .update({ fecha_destete: hoy })
        .eq("id", historialId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      qc.invalidateQueries({ queryKey: ["animals"] });
    },
  });
}
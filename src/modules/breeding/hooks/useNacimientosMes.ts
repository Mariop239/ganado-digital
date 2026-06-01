import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const toISO = (x: Date) => x.toISOString().slice(0, 10);
  return { start: toISO(start), end: toISO(end) };
}

export function useNacimientosMes() {
  return useQuery({
    queryKey: ["dashboard", "nacimientos-mes"],
    queryFn: async () => {
      const { start, end } = monthRange();
      const { count, error } = await supabase
        .from("historial")
        .select("id", { count: "exact", head: true })
        .gte("fecha_parto", start)
        .lt("fecha_parto", end);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
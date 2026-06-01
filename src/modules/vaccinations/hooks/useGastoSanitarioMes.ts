import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const toISO = (x: Date) => x.toISOString().slice(0, 10);
  return { start: toISO(start), end: toISO(end) };
}

export function useGastoSanitarioMes() {
  return useQuery({
    queryKey: ["dashboard", "gasto-sanitario-mes"],
    queryFn: async () => {
      const { start, end } = monthRange();
      const { data, error } = await supabase
        .from("control_vacunas")
        .select("gasto")
        .gte("fecha", start)
        .lt("fecha", end);
      if (error) throw error;
      return (data ?? []).reduce((sum, r) => sum + Number(r.gasto ?? 0), 0);
    },
  });
}
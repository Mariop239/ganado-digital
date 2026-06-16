import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

// Devuelve YYYY-MM-DD en zona horaria America/Guayaquil (UTC-5, sin DST).
function ecuadorDate(offsetDays = 0): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  // Ecuador es UTC-5 fijo (no observa DST). Restamos 5h para obtener la fecha local.
  const local = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

type Offset = "15d" | "5d" | "0d";

const OFFSETS: { offset: number; tipo: Offset }[] = [
  { offset: 15, tipo: "15d" },
  { offset: 5, tipo: "5d" },
  { offset: 0, tipo: "0d" },
];

function buildMessage(
  tipo: Offset,
  vacuna: string,
  animalLabel: string,
): { title: string; body: string } {
  switch (tipo) {
    case "15d":
      return {
        title: "Logística sanitaria",
        body: `Faltan 15 días para la dosis de ${vacuna} en ${animalLabel}. Prepara medicamentos.`,
      };
    case "5d":
      return {
        title: "Recordatorio sanitario",
        body: `En 5 días toca ${vacuna} a ${animalLabel}.`,
      };
    case "0d":
      return {
        title: "¡Hoy toca aplicar!",
        body: `Aplicar tratamiento de ${vacuna} a ${animalLabel} ahora.`,
      };
  }
}

export const Route = createFileRoute("/api/public/hooks/vacunas-recordatorios")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
        // Autenticación con la publishable/anon key.
        // Fuente única de verdad: la clave configurada en el cliente Supabase
        // (@/integrations/supabase/client). Así emisor (botón de diagnóstico)
        // y receptor (esta API) comparten exactamente el mismo valor sin
        // depender de variables sueltas que Cloudflare/Vite puedan omitir.
        const apikey = request.headers.get("apikey");
        const expected =
          (supabase as unknown as { supabaseKey?: string }).supabaseKey ||
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response(
            JSON.stringify({ ok: false, error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        // Lovable Cloud no permite el prefijo SUPABASE_ en secretos custom,
        // así que la service role key vive bajo RANCHO_SERVICE_ROLE_KEY.
        // Construimos el admin client inline para no depender de
        // @/integrations/supabase/client.server (que lee SUPABASE_SERVICE_ROLE_KEY).
        const SUPABASE_URL =
          (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
          (process.env.SUPABASE_URL as string);
        const SERVICE_ROLE =
          (process.env.RANCHO_SERVICE_ROLE_KEY as string | undefined) ||
          (process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined);

        if (!SUPABASE_URL || !SERVICE_ROLE) {
          return new Response(
            JSON.stringify({
              ok: false,
              error:
                "Server misconfigured: falta SUPABASE_URL o RANCHO_SERVICE_ROLE_KEY",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const summary = {
          processed: 0,
          sent: 0,
          skipped_duplicate: 0,
          errors: [] as string[],
          by_tipo: { "15d": 0, "5d": 0, "0d": 0 } as Record<Offset, number>,
        };

        for (const { offset, tipo } of OFFSETS) {
          const fechaObjetivo = ecuadorDate(offset);

          // Importante (Principio #10 — eventos como historial):
          // No filtramos por estado_tratamiento. Una vacuna "aplicada" puede
          // tener una `fecha_proxima_dosis` programada para el siguiente ciclo;
          // esos recordatorios también deben dispararse. La unicidad por
          // (vacuna_id, tipo_alerta, fecha_objetivo) en scheduled_notifications
          // garantiza idempotencia para cada ciclo.
          const { data: rows, error } = await supabaseAdmin
            .from("control_vacunas")
            .select(
              "id, animal_id, user_id, vacuna_aplicada, fecha_proxima_dosis, estado_tratamiento, animals!inner(numero, nombre, estado_actual)",
            )
            .eq("fecha_proxima_dosis", fechaObjetivo)
            .not("user_id", "is", null)
            .eq("animals.estado_actual", "activa");

          if (error) {
            summary.errors.push(`select ${tipo}: ${error.message}`);
            continue;
          }

          for (const row of rows ?? []) {
            summary.processed++;
            const animals = (row as { animals: { numero: string; nombre: string } }).animals;
            const animalLabel = animals?.nombre?.trim()
              ? `${animals.nombre} (#${animals.numero})`
              : `#${animals?.numero ?? "?"}`;

            // Idempotencia: registrar antes de enviar; si ya existe, saltar.
            const { error: insErr } = await supabaseAdmin
              .from("scheduled_notifications")
              .insert({
                user_id: row.user_id as string,
                animal_id: row.animal_id as string,
                vacuna_id: row.id,
                tipo_alerta: tipo,
                fecha_objetivo: fechaObjetivo,
              });

            if (insErr) {
              // 23505 = unique_violation → ya se envió este recordatorio
              if (insErr.code === "23505") {
                summary.skipped_duplicate++;
                continue;
              }
              summary.errors.push(`insert ${tipo} ${row.id}: ${insErr.message}`);
              continue;
            }

            const { title, body } = buildMessage(
              tipo,
              row.vacuna_aplicada,
              animalLabel,
            );

            try {
              const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SERVICE_ROLE}`,
                  apikey: SERVICE_ROLE,
                },
                body: JSON.stringify({
                  user_id: row.user_id,
                  title,
                  body,
                  url: "/vacunas",
                  data: { vacuna_id: row.id, tipo_alerta: tipo },
                }),
              });

              if (!res.ok) {
                const txt = await res.text();
                summary.errors.push(`send-push ${tipo} ${row.id}: ${res.status} ${txt}`);
                // Revertir el registro de idempotencia para permitir reintento
                await supabaseAdmin
                  .from("scheduled_notifications")
                  .delete()
                  .eq("vacuna_id", row.id)
                  .eq("tipo_alerta", tipo)
                  .eq("fecha_objetivo", fechaObjetivo);
                continue;
              }
              summary.sent++;
              summary.by_tipo[tipo]++;
            } catch (e) {
              summary.errors.push(
                `send-push ${tipo} ${row.id}: ${(e as Error).message}`,
              );
              await supabaseAdmin
                .from("scheduled_notifications")
                .delete()
                .eq("vacuna_id", row.id)
                .eq("tipo_alerta", tipo)
                .eq("fecha_objetivo", fechaObjetivo);
            }
          }
        }

        return Response.json({
          ok: true,
          ran_at_ecuador: ecuadorDate(0),
          ...summary,
        });
        } catch (error) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});

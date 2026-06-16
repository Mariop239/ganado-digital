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

function buildBatchMessage(
  tipo: Offset,
  vacuna: string,
  count: number,
): { title: string; body: string } {
  switch (tipo) {
    case "15d":
      return {
        title: "Alerta de Vacunación Grupal",
        body: `En 15 días toca tratamiento de ${vacuna} para un lote de ${count} animales. Asegúrate de tener listos todos los materiales.`,
      };
    case "5d":
      return {
        title: "Recordatorio de Lote",
        body: `En 5 días toca tratamiento de ${vacuna} para un lote de ${count} animales. Asegúrate de tener listos todos los materiales.`,
      };
    case "0d":
      return {
        title: "¡Hoy toca aplicar al lote!",
        body: `Hoy toca tratamiento de ${vacuna} para un lote de ${count} animales. Asegúrate de tener listos todos los materiales.`,
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
              "id, animal_id, user_id, vacuna_aplicada, fecha_proxima_dosis, estado_tratamiento, batch_id, animals!inner(numero, nombre, estado_actual)",
            )
            .eq("fecha_proxima_dosis", fechaObjetivo)
            .not("user_id", "is", null)
            .eq("animals.estado_actual", "activa");

          if (error) {
            summary.errors.push(`select ${tipo}: ${error.message}`);
            continue;
          }

          // Agrupación inteligente por (user_id, batch_id, vacuna_aplicada).
          // Filas con batch_id null se tratan como grupos individuales
          // usando el propio id como clave única → notificación individual.
          type Row = {
            id: string;
            animal_id: string;
            user_id: string;
            vacuna_aplicada: string;
            batch_id: string | null;
            animals:
              | { numero: string; nombre: string }
              | { numero: string; nombre: string }[];
          };
          const groups = new Map<string, Row[]>();
          for (const r of (rows ?? []) as unknown as Row[]) {
            const key = r.batch_id
              ? `batch:${r.user_id}:${r.batch_id}:${r.vacuna_aplicada}`
              : `single:${r.id}`;
            const arr = groups.get(key) ?? [];
            arr.push(r);
            groups.set(key, arr);
          }

          for (const [, groupRows] of groups) {
            summary.processed += groupRows.length;
            const first = groupRows[0];
            const isBatch = !!first.batch_id && groupRows.length > 1;

            // Idempotencia: registrar todas las filas del grupo antes de enviar.
            // Si TODAS están duplicadas → ya se notificó, saltar.
            // Si alguna es nueva → enviar una sola notificación consolidada.
            const insertedRowIds: string[] = [];
            let insertError: string | null = null;
            for (const r of groupRows) {
              const { error: insErr } = await supabaseAdmin
                .from("scheduled_notifications")
                .insert({
                  user_id: r.user_id,
                  animal_id: r.animal_id,
                  vacuna_id: r.id,
                  tipo_alerta: tipo,
                  fecha_objetivo: fechaObjetivo,
                });
              if (insErr) {
                if (insErr.code === "23505") {
                  summary.skipped_duplicate++;
                  continue;
                }
                insertError = `insert ${tipo} ${r.id}: ${insErr.message}`;
                break;
              }
              insertedRowIds.push(r.id);
            }

            if (insertError) {
              summary.errors.push(insertError);
              continue;
            }
            // Nada nuevo que notificar para este grupo.
            if (insertedRowIds.length === 0) continue;

            let title: string;
            let body: string;
            let pushData: Record<string, unknown>;
            let tag: string;

            if (isBatch) {
              ({ title, body } = buildBatchMessage(
                tipo,
                first.vacuna_aplicada,
                groupRows.length,
              ));
              // Colapsado en el dispositivo: una sola alerta viva por lote+tipo.
              tag = `recordatorio.${first.batch_id}.${tipo}`;
              pushData = {
                batch_id: first.batch_id,
                tipo_alerta: tipo,
                count: groupRows.length,
                vacuna_ids: groupRows.map((r) => r.id),
              };
            } else {
              const animalsRaw = first.animals;
              const animals = Array.isArray(animalsRaw) ? animalsRaw[0] : animalsRaw;
              const animalLabel = animals?.nombre?.trim()
                ? `${animals.nombre} (#${animals.numero})`
                : `#${animals?.numero ?? "?"}`;
              ({ title, body } = buildMessage(
                tipo,
                first.vacuna_aplicada,
                animalLabel,
              ));
              tag = `recordatorio.${first.id}.${tipo}`;
              pushData = { vacuna_id: first.id, tipo_alerta: tipo };
            }

            try {
              const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SERVICE_ROLE}`,
                  apikey: SERVICE_ROLE,
                },
                body: JSON.stringify({
                  user_id: first.user_id,
                  title,
                  body,
                  url: "/vacunas",
                  tag,
                  data: { ...pushData, tag },
                }),
              });

              if (!res.ok) {
                const txt = await res.text();
                summary.errors.push(
                  `send-push ${tipo} ${isBatch ? `batch:${first.batch_id}` : first.id}: ${res.status} ${txt}`,
                );
                // Revertir SOLO los registros recién insertados para permitir reintento.
                await supabaseAdmin
                  .from("scheduled_notifications")
                  .delete()
                  .in("vacuna_id", insertedRowIds)
                  .eq("tipo_alerta", tipo)
                  .eq("fecha_objetivo", fechaObjetivo);
                continue;
              }
              summary.sent++;
              summary.by_tipo[tipo]++;
            } catch (e) {
              summary.errors.push(
                `send-push ${tipo} ${isBatch ? `batch:${first.batch_id}` : first.id}: ${(e as Error).message}`,
              );
              await supabaseAdmin
                .from("scheduled_notifications")
                .delete()
                .in("vacuna_id", insertedRowIds)
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

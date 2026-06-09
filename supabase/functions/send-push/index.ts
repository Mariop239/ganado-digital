// Edge Function: send-push
// Envía notificaciones Web Push a todas las suscripciones de un usuario.
// Limpia automáticamente suscripciones inválidas (404/410).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  const subject = VAPID_SUBJECT.startsWith("mailto:")
    ? VAPID_SUBJECT
    : `mailto:${VAPID_SUBJECT}`;
  webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

type Payload = {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
};

type PushSubRow = {
  id: string;
  endpoint: string;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return json({ error: "VAPID keys not configured" }, 500);
    }

    const payload = (await req.json()) as Payload;
    if (!payload?.title || !payload?.body) {
      return json({ error: "title and body are required" }, 400);
    }

    const userIds = payload.user_ids ??
      (payload.user_id ? [payload.user_id] : []);
    if (userIds.length === 0) {
      return json({ error: "user_id or user_ids required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, subscription")
      .in("user_id", userIds);

    if (error) return json({ error: error.message }, 500);
    if (!subs || subs.length === 0) {
      return json({ sent: 0, removed: 0, total: 0 });
    }

    const notification = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/vacunas",
      data: payload.data ?? {},
    });

    const toRemove: string[] = [];
    let sent = 0;

    await Promise.all(
      (subs as PushSubRow[]).map(async (row) => {
        try {
          await webpush.sendNotification(row.subscription, notification);
          sent++;
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          // 404 = Not Found, 410 = Gone → suscripción inválida, eliminar.
          if (statusCode === 404 || statusCode === 410) {
            toRemove.push(row.endpoint);
          } else {
            console.error("push error", statusCode, (err as Error).message);
          }
        }
      }),
    );

    let removed = 0;
    if (toRemove.length > 0) {
      const { error: delErr, count } = await admin
        .from("push_subscriptions")
        .delete({ count: "exact" })
        .in("endpoint", toRemove);
      if (delErr) console.error("cleanup error", delErr.message);
      else removed = count ?? toRemove.length;
    }

    return json({ sent, removed, total: subs.length });
  } catch (e) {
    console.error("send-push fatal", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
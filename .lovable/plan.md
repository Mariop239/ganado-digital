
# Fase A — Infraestructura de DB para Notificaciones Push

Alcance acotado a la **Fase A.1** del prompt maestro: crear la tabla `push_subscriptions` en Supabase con RLS y permisos. Las VAPID keys (A.2) y la Edge Function `send-push` (A.3) quedan fuera de este paso y se ejecutarán en prompts siguientes una vez la tabla esté aprobada.

## Qué se crea

Tabla `public.push_subscriptions` para almacenar las suscripciones Web Push de cada usuario (un usuario puede tener varias: móvil, escritorio, navegadores distintos).

### Columnas

- `id` — UUID, PK, default `gen_random_uuid()`
- `user_id` — UUID, NOT NULL, FK a `auth.users(id) ON DELETE CASCADE`
- `subscription` — JSONB, NOT NULL — objeto `PushSubscription` serializado del navegador (`endpoint`, `keys.p256dh`, `keys.auth`)
- `endpoint` — TEXT, NOT NULL, **UNIQUE** — extraído desde `subscription->>'endpoint'`. Evita duplicar la misma suscripción si el usuario vuelve a permitir notificaciones en el mismo navegador (permite `upsert` por endpoint).
- `user_agent` — TEXT, NULL — útil para que el usuario identifique sus dispositivos en una futura UI de gestión.
- `created_at` — TIMESTAMPTZ, NOT NULL, default `now()`
- `updated_at` — TIMESTAMPTZ, NOT NULL, default `now()` (con trigger usando `public.update_updated_at_column()` ya existente)

### Índices

- `idx_push_subscriptions_user_id` sobre `user_id` (lookup en `send-push` por usuario).

### Seguridad

- `ENABLE ROW LEVEL SECURITY`.
- Políticas (todas scoped a `auth.uid() = user_id`, rol `authenticated`):
  - SELECT propias
  - INSERT propias (`WITH CHECK`)
  - UPDATE propias
  - DELETE propias
- Grants:
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;`
  - `GRANT ALL ON public.push_subscriptions TO service_role;` (la futura Edge Function `send-push` leerá con service role para enviar a todos los dispositivos del usuario sin depender del JWT del cliente).
  - Sin grant a `anon`.

## Lo que NO se hace en este paso

- No se generan ni guardan VAPID keys (Fase A.2 — siguiente prompt).
- No se crea la Edge Function `send-push` (Fase A.3).
- No se toca código del frontend, service worker, ni hooks de suscripción (Fase B).
- No se modifica `control_vacunas` ni la lógica de alertas existente.

## Riesgos / decisiones explícitas

- **Endpoint UNIQUE**: decisión deliberada para soportar upsert idempotente desde el cliente (`onsubscriptionchange` del SW puede re-suscribir y reenviar). Si se prefiere permitir duplicados, se quita después; es más fácil aflojar que endurecer.
- **CASCADE en `user_id`**: si se elimina el usuario en `auth.users`, sus suscripciones se borran automáticamente — coherente con el resto del esquema.
- **service_role grant**: necesario porque la Edge Function envía pushes en nombre del usuario sin sesión activa. RLS sigue protegiendo el acceso desde el cliente.

## Siguiente paso (tras aprobar esta migración)

Confirmar y pasar a Fase A.2: generar par VAPID y registrar `VITE_APP_VAPID_PUBLIC_KEY` + secreto `VAPID_PRIVATE_KEY`.

## Objetivo

Que un evento de "Traslado" actualice automáticamente `ubicacion_actual` y `lote_actual` del animal, y que la ficha técnica muestre ambos campos de forma prominente.

## Fase A — Esquema y migración

1. **Migración SQL (reversible)** sobre `public.animals`:
  - `ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS ubicacion_actual text;`
  - `ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS lote_actual text;`
  - Ambos opcionales (`NULL` permitido), sin default — los animales existentes quedan intactos.
  - No se tocan triggers de sincronización `vacas` ↔ `animals` (esos campos no existen en `vacas`, así que se ignoran de forma natural).
2. `**src/modules/animals/types/domain.ts**`: añadir a `Animal`:
  ```ts
   ubicacion_actual: string | null;
   lote_actual: string | null;
  ```
3. Regenerar `src/integrations/supabase/types.ts` (lo hace la plataforma tras la migración).

## Fase B — Captura del lote en el evento Traslado

Una sola fuente de verdad: el payload del traslado pasa a tener `destino` + `lote` opcional.

1. `**src/modules/cows/events/schemas/payloads/index.ts**`:
  ```ts
   export const trasladoPayloadSchema = z.object({
     destino: z.string().trim().min(1, "Requerido").max(200),
     lote: z.string().trim().max(100).optional(),
   });
  ```
2. `**src/modules/cows/events/registry/index.ts**`: añadir field `lote` (text, no required, placeholder "Ej: Lote A").
  El `summarize` queda `→ ${p.destino}${p.lote ?`  · Lote ${p.lote} `: ""}`.

## Fase C — Propagación al animal

Mantener la lógica en el hook (no en el componente del form, no duplicar):

1. `**src/modules/animals/repositories/animals.repository.ts**`: añadir helper pequeño
  ```ts
   export async function updateUbicacionLote(
     numero: string,
     input: { ubicacion_actual: string; lote_actual: string | null },
   ): Promise<AnimalView>
  ```
   (reutiliza `toView`, update directo sobre `animals` filtrando por `numero`).
2. `**src/modules/cows/events/hooks/useAnimalEvents.ts**` — `useCreateAnimalEvent`:
  - Tras `createEvent` exitoso, si `input.tipo === "traslado"`, llamar `updateUbicacionLote(vacaNumero, { ubicacion_actual: payload.destino, lote_actual: payload.lote ?? null })`.
  - Si esa segunda llamada falla, registrar con `console.error` pero no romper la mutation (el evento ya quedó guardado; el usuario puede reintentar). Mostrar toast con warning desde el form si se desea — pero por simplicidad lo dejamos en el hook con `console.error`.
  - Invalidar también `["animal", vacaNumero]` y `["animals"]` para refrescar la ficha al instante.
   No se toca `DynamicEventForm.tsx` salvo que el registry ya basta para renderizar el campo `lote`. Cero duplicación de lógica.

## Fase D — Ficha técnica

`**src/modules/animals/components/PerfilAnimal.tsx**`: en el `<dl>` de información general, añadir dos filas justo después de "Dueño":

- "Ubicación actual" → `animal.ubicacion_actual || "Por definir"`
- "Lote/Grupo" → `animal.lote_actual || "Sin lote"`

Reutiliza el patrón existente (`rows()` array). Sin componentes nuevos, sin badges adicionales — coherente con el resto de la ficha y legible en tablet.

## Riesgos y cleanup

- **Eventos de traslado históricos**: no se retroalimentan (no hay backfill). El campo queda vacío hasta el próximo traslado registrado — comportamiento esperado, reversible.
- `**AnimalView**` hereda los nuevos campos automáticamente porque extiende `Animal`. No hay que tocar `toView`.
- Reversible: drop de columnas si se decide revertir; el resto del código tolera `null`.
- No se crean componentes nuevos, no se duplica UI, no se toca `cows/vacas`.

## Archivos a tocar

- `supabase/migrations/<nueva>.sql` (nueva)
- `src/modules/animals/types/domain.ts`
- `src/modules/animals/repositories/animals.repository.ts`
- `src/modules/cows/events/schemas/payloads/index.ts`
- `src/modules/cows/events/registry/index.ts`
- `src/modules/cows/events/hooks/useAnimalEvents.ts`
- `src/modules/animals/components/PerfilAnimal.tsx`  
  
Apruebo el Plan  
El plan es perfecto y respeta la arquitectura al 100%. Procedamos con la implementación. Ojo nada más con verificar si el nombre exacto de la tabla en Supabase es 'animals' o 'animales' antes de lanzar la migración SQL. ¡Ejecútalo!
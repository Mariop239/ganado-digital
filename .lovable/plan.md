
# Fase A — Eventos programados en `animal_events` (v2 con correcciones)

Objetivo: permitir registrar un evento como **programado** para fecha futura, sin tocar `animals` ni `historial`, y dejando la RPC de eventos masivos lista para programación grupal.

## 1. Migración SQL

Una sola migración sobre `public.animal_events` + funciones relacionadas.

### 1.1 Esquema

- `ALTER TABLE public.animal_events ADD COLUMN estado text NOT NULL DEFAULT 'hecho';`
- `ALTER TABLE public.animal_events ADD COLUMN fecha_ejecucion date;`
- `ALTER TABLE public.animal_events ADD CONSTRAINT animal_events_estado_check CHECK (estado IN ('hecho','programado'));`
- `CREATE INDEX animal_events_programados_idx ON public.animal_events (fecha_ejecucion) WHERE estado = 'programado';`

RLS: **no se tocan políticas** (las 4 actuales siguen cubriendo las nuevas columnas).

### 1.2 Trigger `validar_animal_event` (corrección #1 incorporada)

Se **mantiene** la regla actual: `fecha` no puede ser futura, nunca. La fecha programada vive en `fecha_ejecucion`, no en `fecha`.

Reglas nuevas que añade el trigger:

- Si `NEW.estado = 'programado'`:
  - `NEW.fecha_ejecucion IS NOT NULL` (si no, RAISE EXCEPTION `'Un evento programado requiere fecha_ejecucion'`).
  - `NEW.fecha_ejecucion >= CURRENT_DATE` (si no, RAISE EXCEPTION `'fecha_ejecucion no puede ser pasada'`).
  - `NEW.is_terminal := false` (siempre, sobreescribe el cálculo por tipo — un evento programado nunca cierra al animal).
- Si `NEW.estado = 'hecho'`:
  - `NEW.fecha_ejecucion := NULL` (se ignora si llega valor — evita estados ambiguos).
  - El cálculo de `is_terminal` por `CASE NEW.tipo` se mantiene tal cual.
- La validación `fecha > CURRENT_DATE → RAISE` se mantiene intacta para ambos estados.
- Validaciones de payload por tipo (`venta` requiere comprador/valor, etc.) se mantienen idénticas.

### 1.3 RPC `registrar_evento_masivo` (corrección #2 incorporada)

Importante: la RPC actual recibe **un solo evento aplicado a N animales**, no un array `p_eventos`. Para no romper su contrato ni inventar parámetros nuevos a destiempo, la actualización mínima y coherente es:

- Añadir dos parámetros opcionales con default seguro:
  - `p_estado text DEFAULT 'hecho'`
  - `p_fecha_ejecucion date DEFAULT NULL`
- Validar dentro de la RPC:
  - Si `p_estado = 'programado'` → exigir `p_fecha_ejecucion IS NOT NULL` y `>= CURRENT_DATE`.
  - Si `p_estado = 'hecho'` → forzar `p_fecha_ejecucion := NULL`.
- `INSERT INTO animal_events (...)` incluye las dos columnas nuevas.
- Cuando `p_estado = 'programado'`, los `UPDATE` sobre `animals` (traslado/venta/fallecimiento) **no se ejecutan** — el efecto se aplicará cuando el evento transicione a `hecho` (Fase C). Esto preserva Principio #3 (estado del animal no se altera por algo que aún no ocurrió).
- Firma actualizada en `Functions.registrar_evento_masivo.Args` se regenera sola al aprobar la migración.

> Nota al asesor: si en una Fase B+ el grupal necesita N eventos heterogéneos en una sola llamada (`p_eventos jsonb[]`), se agrega una RPC nueva (`registrar_eventos_masivo_v2`) sin romper la actual. Hoy con `p_estado` + `p_fecha_ejecucion` ya queda habilitada la **programación grupal** que el asesor pidió: registrar un mismo evento programado para N animales.

### 1.4 Reversibilidad

DROP CONSTRAINT / INDEX / COLUMN + restaurar cuerpos previos de `validar_animal_event` y `registrar_evento_masivo`. Las 4 políticas RLS y los grants existentes quedan intactos.

## 2. Tipos (`src/modules/animals/events/types/domain.ts`)

```ts
export type AnimalEventEstado = "hecho" | "programado";

export type AnimalEvent<T extends AnimalEventType = AnimalEventType> = {
  // …campos actuales (id, animal_id, tipo, fecha, payload, observaciones,
  // is_terminal, batch_id, created_at, updated_at)
  estado: AnimalEventEstado;
  fecha_ejecucion: string | null;
};

export type AnimalEventInput<T extends AnimalEventType = AnimalEventType> = {
  tipo: T;
  fecha: string;                          // día de registro (no futuro)
  payload: EventPayloadMap[T];
  observaciones?: string | null;
  estado?: AnimalEventEstado;             // default 'hecho'
  fecha_ejecucion?: string | null;        // requerido si estado === 'programado'
};
```

`src/integrations/supabase/types.ts` se regenera tras aprobar la migración — no se edita a mano.

## 3. Lo que **no** entra en esta fase (Principios #6 y #7)

- UI para crear eventos programados (Fase B, próximo prompt): `DynamicEventForm` y `EventDialog` siguen registrando solo `estado='hecho'`. El `refine(fecha ≤ hoy)` del formulario se mantiene.
- Hook `useCreateAnimalEvent`: cuando se habilite la creación de `programado`, deberá **no** llamar a `updateUbicacionLote` / `aplicarEgresoSinEvento` mientras `estado !== 'hecho'`. Documentado para Fase B.
- Vista de "Eventos programados" y job de transición `programado → hecho` al llegar `fecha_ejecucion`: Fase C.

## 4. Riesgos

- Filas existentes quedan con `estado='hecho'`, `fecha_ejecucion=NULL` — correcto, sin migración de datos.
- Cualquier `select('*')` ya tipado recibe dos campos extra opcionales — sin impacto en runtime.
- La RPC, al sumar dos parámetros con default, mantiene compatibilidad con todos los call-sites actuales (`useCreateBulkEvent` no cambia).

¿Procedo a build con esta versión v2?

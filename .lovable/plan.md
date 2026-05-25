
# Evolución a Sistema de Eventos del Animal

## 1. Análisis arquitectónico

El modelo actual acopla `cows` con un único evento ("egreso") mediante columnas planas (`fecha_egreso`, `motivo_egreso`). Esto:

- Mezcla **estado actual** (¿la vaca está activa?) con **historial** (¿qué pasó y cuándo?).
- No escala: agregar "venta", "fallecimiento", "traslado" implicaría N columnas opcionales más, o N tablas paralelas.
- Impide un **timeline unificado** y reportes transversales.

La solución correcta es separar tres responsabilidades:

1. **Catálogo de tipos de evento** (qué eventos existen y qué campos requieren).
2. **Historial de eventos** (qué le pasó al animal, append-only).
3. **Estado derivado** en `cows` (campos calculados/cacheados: `estado_actual`, `fecha_estado`).

### Modelo recomendado: tabla única `animal_events` + payload JSONB tipado por discriminador

Es un EAV ligero ("single-table inheritance" con JSONB), validado en frontend con Zod y en backend con un CHECK + trigger. Es el equilibrio correcto para este dominio:

- **Pros:** una sola tabla, timeline trivial (`SELECT * ORDER BY fecha DESC`), agregar un tipo nuevo = solo añadir entrada al registry + schema Zod (cero migraciones). Compatible con índices GIN sobre JSONB para reportes.
- **Contras / riesgos:** validación de campos vive en aplicación, no en columnas; mitigado con Zod + trigger SQL que valida el JSON contra el discriminador. Queries sobre campos del payload requieren `->>` y posibles índices funcionales.
- **Alternativa descartada:** una tabla por tipo de evento (`ventas`, `fallecimientos`, ...). Da fuerte tipado SQL pero rompe el timeline, multiplica repos/hooks/schemas, y cada tipo nuevo es una migración + módulo nuevo. No escala con la velocidad pedida.

## 2. Modelo de dominio

```text
cows (1) ──< animal_events (N)
                  │
                  ├─ tipo: 'venta' | 'fallecimiento' | 'traslado' | 'observacion' | 'tratamiento' | ...
                  ├─ fecha
                  └─ payload: JSONB (campos específicos del tipo)
```

Reglas:

- `animal_events` es **append-only** desde la UI (editar/borrar permitido solo por correcciones, con auditoría `updated_at`).
- Algunos tipos son **terminales** (venta, fallecimiento) → marcan a la vaca como egresada y actualizan `estado_actual`.
- Otros son **informativos** (observación, tratamiento) → no cambian estado.
- El "egreso" actual se reinterpreta como un **evento terminal genérico** con subtipos.

## 3. SQL propuesto

```sql
-- Enum extensible (alternativa: TEXT + CHECK contra catálogo)
CREATE TYPE public.animal_event_type AS ENUM (
  'venta', 'fallecimiento', 'traslado', 'observacion', 'tratamiento', 'otro'
);

CREATE TABLE public.animal_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaca_numero   TEXT NOT NULL REFERENCES public.vacas(numero) ON DELETE CASCADE ON UPDATE CASCADE,
  tipo          public.animal_event_type NOT NULL,
  fecha         DATE NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  observaciones TEXT,
  is_terminal   BOOLEAN NOT NULL DEFAULT false, -- cacheado: true = cierra la vida activa
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_animal_events_vaca_fecha ON public.animal_events(vaca_numero, fecha DESC);
CREATE INDEX idx_animal_events_tipo ON public.animal_events(tipo);
CREATE INDEX idx_animal_events_payload ON public.animal_events USING GIN (payload);

ALTER TABLE public.animal_events ENABLE ROW LEVEL SECURITY;
-- Policies authenticated CRUD (alineadas con las tablas existentes)

-- Trigger updated_at (reusa update_updated_at_column)

-- Trigger de validación payload por tipo (whitelist mínima en SQL,
-- validación detallada queda en Zod cliente + server fn)
CREATE OR REPLACE FUNCTION public.validar_animal_event() RETURNS trigger AS $$
BEGIN
  IF NEW.fecha > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha del evento no puede ser futura';
  END IF;
  CASE NEW.tipo
    WHEN 'venta' THEN
      IF NOT (NEW.payload ? 'comprador' AND NEW.payload ? 'valor') THEN
        RAISE EXCEPTION 'Venta requiere comprador y valor';
      END IF;
      NEW.is_terminal := true;
    WHEN 'fallecimiento' THEN
      IF NOT (NEW.payload ? 'causa') THEN
        RAISE EXCEPTION 'Fallecimiento requiere causa';
      END IF;
      NEW.is_terminal := true;
    WHEN 'traslado' THEN
      IF NOT (NEW.payload ? 'destino') THEN
        RAISE EXCEPTION 'Traslado requiere destino';
      END IF;
      NEW.is_terminal := false;
    ELSE
      NEW.is_terminal := false;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger que sincroniza estado en vacas cuando el evento es terminal
CREATE OR REPLACE FUNCTION public.sync_vaca_estado() RETURNS trigger AS $$
BEGIN
  IF NEW.is_terminal THEN
    UPDATE public.vacas
       SET fecha_egreso = NEW.fecha,
           motivo_egreso = NEW.tipo::text || COALESCE(': ' || (NEW.payload->>'causa'), ': ' || (NEW.payload->>'comprador'), '')
     WHERE numero = NEW.vaca_numero;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

`fecha_egreso` / `motivo_egreso` se conservan como **caché del estado actual** alimentado por trigger → cero refactor en `cows` y la UI actual sigue funcionando.

## 4. TypeScript + Zod (registry pattern)

```text
modules/cows/events/
  types/
    domain.ts          -> AnimalEvent<T>, EventType union, EventPayloadMap
  schemas/
    payloads/
      venta.schema.ts
      fallecimiento.schema.ts
      traslado.schema.ts
      observacion.schema.ts
      tratamiento.schema.ts
    event.schema.ts    -> z.discriminatedUnion('tipo', [...])
  registry/
    index.ts           -> EVENT_REGISTRY: { tipo, label, icon, schema, fields, isTerminal }
  repositories/
    events.repository.ts
  hooks/
    useAnimalEvents.ts, useCreateAnimalEvent.ts
  components/
    EventTimeline.tsx        (timeline unificado por vaca)
    EventTypeSelector.tsx
    DynamicEventForm.tsx     (renderiza campos según registry[tipo].fields)
    EventDialog.tsx          (wrapper modal)
```

El **registry** es la pieza clave anti-deuda: un solo objeto declara tipo, label, ícono, schema Zod, definición de campos del form y `isTerminal`. Agregar "vacunación masiva" o "pesaje" es:

1. Crear `payloads/pesaje.schema.ts`.
2. Añadir entrada al registry.
3. (Si afecta SQL) añadir valor al enum y rama al trigger.

Cero cambios en `DynamicEventForm`, `EventTimeline`, hooks ni repository.

## 5. Estrategia frontend

- `DynamicEventForm` lee `EVENT_REGISTRY[tipo].fields` y genera inputs (`text`, `number`, `date`, `textarea`, `select`) con `react-hook-form` + `zodResolver(registry[tipo].schema)`.
- `EventTimeline` consume `useAnimalEvents(vacaNumero)` y renderiza cards ordenadas por `fecha DESC`, con badge según `tipo` y resumen derivado del payload.
- Mutaciones invalidan `["animal-events", vacaNumero]` **y** `["vaca", vacaNumero]` (porque eventos terminales mutan el caché de estado).
- `EgresoDialog` actual se reemplaza por `EventDialog` con tipo preseleccionado; legacy se mantiene como atajo visual.

## 6. Convivencia con el sistema actual

- `vacas.fecha_egreso` y `vacas.motivo_egreso` **se conservan** como columnas derivadas mantenidas por trigger. Toda la UI actual (`Badge "Egresada"`, filtro `soloActivas`, `PerfilVaca`) sigue funcionando sin tocarse.
- `useMarcarEgreso` se reimplementa internamente creando un `animal_event` de tipo `venta`/`fallecimiento`/`otro`; la firma del hook se mantiene → cero ruptura.
- `useReactivarVaca` borra el último evento terminal (o inserta un evento `reactivacion` no terminal que limpia el caché). Decisión a confirmar en build.

## 7. Plan de migración seguro

1. **Migración aditiva** (no destructiva): crear enum, tabla, triggers, policies. No tocar `vacas`.
2. **Backfill**: insertar en `animal_events` un registro por cada vaca con `fecha_egreso IS NOT NULL`, tipo `otro` o inferido del texto, marcado `is_terminal=true`. Trigger desactivado durante backfill para no sobrescribir las columnas cache.
3. **Nuevo módulo** `modules/cows/events/` con registry mínimo (los 5 tipos iniciales).
4. **Refactor interno** de `useMarcarEgreso` para escribir en `animal_events`. UI sin cambios visibles.
5. **Nueva UI**: timeline en `PerfilVaca` (tab "Eventos") + botón "Registrar evento" que abre `EventDialog`.
6. **Deprecación** suave del `EgresoDialog` legacy (queda como shortcut, internamente usa el nuevo flujo).
7. **Validación**: comparar count `vacas.fecha_egreso IS NOT NULL` vs `animal_events WHERE is_terminal`. Deben coincidir.

## 8. Cómo evitar deuda técnica futura

- **Single source of truth**: el registry. Si alguien añade un tipo sin pasar por el registry, el form dinámico no lo renderiza → presión natural a hacerlo bien.
- **Trigger SQL valida mínimos**, Zod valida detalle. Doble capa, sin duplicar la lógica de negocio.
- **`is_terminal` cacheado** en columna evita recalcular en cada query y permite índices.
- **Append-only**: history nunca se pierde. Correcciones via nuevo evento "corrección" antes que UPDATE.
- **Payload JSONB con shape estable por tipo**: nunca renombrar claves; añadir nuevas y mantener compatibilidad hacia atrás.
- **Tests del registry**: snapshot test que enumera tipos y verifica que cada uno tiene schema + fields.

## 9. Fuera de alcance de este plan

- Implementación / migraciones / código (siguiente fase, en build mode).
- Permisos finos por rol (todas las policies siguen el patrón actual `authenticated`).
- Reportes y métricas agregadas (habilitados por el modelo, se construyen después).

¿Apruebas este diseño para pasar a build mode e implementar en fases (SQL + backfill primero, registry + módulo después, UI al final)?

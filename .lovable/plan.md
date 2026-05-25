
# Evolución del dominio: `cows` → `animals` (revisado)

## 1. Decisiones de diseño (ajustes incorporados)

- **`categoria` con TEXT + CHECK**, no enum PostgreSQL. Agregar/quitar valores no requiere `ALTER TYPE` ni migraciones destructivas.
- **Tres estados ortogonales**, no uno solo:
  - `categoria` — etapa/tipo: `ternero`, `ternera`, `novilla`, `vaca`, `toro`, `novillo`.
  - `estado_reproductivo` — solo hembras adultas: `soltera`, `gestante`, `parida`, `seca` (nullable para machos/crías).
  - `estado_actual` — ciclo de vida: `activa`, `vendida`, `fallecida` (default `activa`).
- **`fecha_egreso` / `motivo_egreso` se mantienen** como caché de compatibilidad, alimentados por el trigger existente de `animal_events`. `animal_events` queda como fuente de verdad a futuro.
- **Rutas amigables por `numero`**: `/animales/104`. Internamente el `id` es UUID y se usa para FKs (`mother_id`, `father_id`), pero la URL y la UI muestran `numero`.
- **Sin automatización temprana**: no `recompute_categoria` automática, no triggers de transición de estado, no validación anti-ciclo recursiva. Los tres estados se editan manualmente desde el form. Validaciones se agregan cuando el flujo real lo justifique.
- **Genealogía mínima**: madre, padre, hijos directos. Sin árbol multinivel, sin RPC recursiva, sin `GenealogiaTree`.

## 2. Modelo SQL

```sql
CREATE TABLE public.animals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero               TEXT NOT NULL UNIQUE,
  nombre               TEXT NOT NULL DEFAULT '',
  sexo                 TEXT NOT NULL CHECK (sexo IN ('hembra','macho')),
  categoria            TEXT NOT NULL CHECK (categoria IN
                         ('ternero','ternera','novilla','vaca','toro','novillo')),
  estado_reproductivo  TEXT CHECK (estado_reproductivo IS NULL OR estado_reproductivo IN
                         ('soltera','gestante','parida','seca')),
  estado_actual        TEXT NOT NULL DEFAULT 'activa' CHECK (estado_actual IN
                         ('activa','vendida','fallecida')),
  fecha_nacimiento     DATE,
  color                TEXT NOT NULL DEFAULT '',
  raza                 TEXT NOT NULL DEFAULT '',
  dueno                TEXT NOT NULL DEFAULT '',
  mother_id            UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  father_id            UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  -- compatibilidad: textos libres heredados de vacas.madre / vacas.padre
  madre_texto          TEXT NOT NULL DEFAULT '',
  padre_texto          TEXT NOT NULL DEFAULT '',
  -- caché alimentado por el trigger ya existente sync_vaca_estado
  fecha_egreso         DATE,
  motivo_egreso        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_animals_categoria ON public.animals(categoria);
CREATE INDEX idx_animals_sexo ON public.animals(sexo);
CREATE INDEX idx_animals_mother ON public.animals(mother_id);
CREATE INDEX idx_animals_father ON public.animals(father_id);
CREATE INDEX idx_animals_activos ON public.animals(numero) WHERE estado_actual = 'activa';

-- RLS espejo de las tablas existentes
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
-- 4 policies authenticated (select/insert/update/delete) USING true
```

**Vista de compatibilidad** para que el código actual siga funcionando sin tocar repos/hooks/tablas hijas:

```sql
-- Renombrar tabla vacas → _vacas_legacy y exponer vista vacas
CREATE VIEW public.vacas AS
  SELECT numero, nombre, color, raza, dueno,
         madre_texto AS madre, padre_texto AS padre,
         fecha_egreso, motivo_egreso, created_at, updated_at
    FROM public.animals
   WHERE sexo = 'hembra';
```

`animal_events`, `control_vacunas`, `historial` siguen referenciando `vaca_numero TEXT`. No se tocan: `numero` sigue siendo UNIQUE en `animals`, y la vista preserva la columna. Renombrar a `animal_numero` queda como tarea posterior opcional.

## 3. TypeScript + Zod

```text
modules/animals/
  types/domain.ts       -> Animal, Sexo, Categoria, EstadoReproductivo, EstadoActual
  schemas/index.ts      -> animalSchema, animalInputSchema, relacionarPadresSchema
  constants/
    categorias.ts       -> CATEGORIAS, CATEGORIA_LABELS, helpers (isHembra, etc.)
    estados.ts          -> ESTADOS_REPRODUCTIVOS, ESTADOS_ACTUALES + labels
  repositories/animals.repository.ts
  hooks/
    useAnimals.ts       -> lista con filtros { categoria?, sexo?, estado_actual? }
    useAnimal.ts        -> detalle por numero
    useHijos.ts         -> SELECT * FROM animals WHERE mother_id = $ OR father_id = $
  components/
    ListaAnimales.tsx
    PerfilAnimal.tsx    -> tabs: Datos, Familia, Reproducción, Vacunas, Eventos
    FamiliaTab.tsx      -> links a madre, padre, lista de hijos
    SelectorAnimal.tsx  -> combobox filtrable por sexo (para asignar madre/padre)
    FormAnimal.tsx
```

Zod refleja los CHECK constraints (unions literales). `estado_reproductivo` es `.optional().nullable()`.

`modules/cows/` queda como re-export thin → `animals/` durante la transición, y luego se elimina.

## 4. Frontend — navegación relacional mínima

- Ruta nueva `/_authenticated/animales.$numero.tsx`. Las rutas `/vacas/*` se mantienen como alias (la vista `vacas` las sostiene).
- `PerfilAnimal` agrega tab **"Familia"**:
  - Madre: link a `/animales/{numero_madre}` o el texto libre `madre_texto` si no hay FK.
  - Padre: idem.
  - Hijos: lista con link por hijo (consulta `useHijos`).
- `FormAnimal` permite asignar `mother_id`/`father_id` vía `SelectorAnimal` (combobox con búsqueda por numero/nombre, filtrado por sexo correcto). Si el usuario no encuentra al ancestro en el sistema, conserva el texto libre.
- Filtros de lista por `categoria`, `sexo`, `estado_actual`.

## 5. Estrategia de migración (fases pequeñas y reversibles)

1. **Schema aditivo**: crear `animals` con CHECKs, índices y RLS. No tocar `vacas`.
2. **Backfill**: `INSERT INTO animals (id, numero, nombre, sexo, categoria, estado_actual, fecha_egreso, motivo_egreso, madre_texto, padre_texto, color, raza, dueno, created_at, updated_at) SELECT gen_random_uuid(), numero, nombre, 'hembra', 'vaca', CASE WHEN fecha_egreso IS NULL THEN 'activa' ELSE 'vendida' END, fecha_egreso, motivo_egreso, madre, padre, color, raza, dueno, created_at, updated_at FROM vacas`. `mother_id`/`father_id` quedan NULL; los textos se preservan.
3. **Swap**: renombrar `vacas` → `_vacas_legacy`, crear vista `vacas` sobre `animals`. Repos y hooks actuales siguen funcionando sin cambios.
4. **Módulo `animals`**: tipos, schemas, repo, hooks, listado, perfil con tab Familia, selector de ancestros. `modules/cows` se convierte en re-export.
5. **Edición de relaciones**: form permite asignar madre/padre desde el catálogo existente; hijos se muestran como lista navegable.
6. **Limpieza** (opcional, fase tardía): renombrar `vaca_numero` → `animal_numero` en tablas hijas, deprecar `modules/cows`, deprecar rutas `/vacas`.

Cada paso es independiente y reversible. Validación: `count(vacas)` antes vs. `count(animals WHERE sexo='hembra')` después deben coincidir.

## 6. Compatibilidad con lo existente

| Hoy | Después |
|---|---|
| Tabla `vacas` | Vista sobre `animals` |
| `vacas.numero` PK | `animals.numero` UNIQUE |
| `animal_events.vaca_numero` FK | Sin cambios (apunta al mismo `numero`) |
| `control_vacunas`, `historial` | Sin cambios |
| Hooks `useVaca`, `useVacas`, `useMarcarEgreso`, `useReactivarVaca` | Funcionan vía vista. Más adelante se re-exportan desde `animals` |
| Trigger `sync_vaca_estado` | Sin cambios (sigue cacheando `fecha_egreso`/`motivo_egreso`) |
| Rutas `/vacas/$numero` | Se mantienen; se agrega `/animales/$numero` |

## 7. Preparación para fases futuras

- **Eventos / timeline**: ya implementado en `animal_events`, agnóstico al tipo de animal. Cero cambios.
- **Genealogía multinivel**: la base relacional (`mother_id`, `father_id`) queda lista. Cuando se necesite, se construye una RPC con CTE recursivo encima. **No se implementa ahora.**
- **Trazabilidad**: append-only ya existe en `animal_events`.
- **Reportes por categoría / estado**: habilitados por los índices, sin requerir vistas adicionales en esta fase.

## 8. Cómo evitar deuda técnica

- **CHECK + TEXT** en vez de enum: agregar `"vaquillona"` o `"semental"` es un `ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT`, sin migraciones destructivas.
- **Tres estados separados**: cada uno evoluciona independientemente; nunca un solo campo que mezcle "ternera gestante vendida".
- **`id` UUID separado de `numero`**: el ID humano puede cambiar sin romper FKs.
- **Vista `vacas` como contrato explícito**: borrarla es un cambio rastreable, no silencioso.
- **Sin automatización temprana**: los estados los maneja el usuario hasta que el flujo operativo real demuestre qué transiciones son seguras de automatizar.
- **`madre_texto`/`padre_texto` preservados**: nunca se pierde información del sistema legacy.

## 9. Fuera de alcance

- `GenealogiaTree`, queries recursivas, múltiples generaciones, RPCs avanzadas.
- `recompute_categoria`, triggers de transición automática de estados.
- Validación anti-ciclo en genealogía (se evalúa cuando exista volumen real).
- Renombre de `vaca_numero` → `animal_numero` en tablas hijas.
- Reportes/dashboards agregados.

---

¿Apruebas este diseño revisado para pasar a build mode? Implementación por fases: schema + backfill + vista primero, módulo `animals` con relaciones básicas después.

## Problema

Las tablas `animal_events`, `control_vacunas` e `historial` vinculan al animal por `vaca_numero` (texto). Ahora que dos animales pueden compartir `numero` (uno `activa`, otros `vendida/fallecida`), cualquier `.eq("vaca_numero", numero)` cruza datos entre ellos.

La solución correcta (Principio #9: UUID interno, número humano) es enlazar por `animal_id uuid` y dejar `numero` solo para mostrar.

## Estrategia (migración progresiva, reversible)

### Fase A — Esquema: agregar `animal_id` sin romper nada

Migración SQL:
- `ALTER TABLE animal_events ADD COLUMN animal_id uuid REFERENCES animals(id) ON DELETE CASCADE;`
- Idem para `control_vacunas` e `historial`.
- Backfill: para cada fila, `animal_id = (SELECT id FROM animals WHERE numero = vaca_numero AND estado_actual = 'activa' LIMIT 1)`; si no hay activo, el más reciente por `created_at`.
- Índices: `CREATE INDEX ... ON <tabla> (animal_id);`
- `vaca_numero` se mantiene NOT NULL por compatibilidad con triggers legacy (`sync_vaca_estado`, vista `vacas`). Lo seguimos llenando en inserts.
- No se vuelve `animal_id` NOT NULL todavía (Fase C).

### Fase B — Frontend: leer/escribir por `animal_id`

Repositorios:
- `events.repository.ts`: `listEventsPorAnimal(animalId)` filtra por `animal_id`. `createEvent` recibe `{ animalId, numero }` y inserta ambos (`numero` solo para compatibilidad legacy).
- `historial.repository.ts`: igual — todas las consultas por `animal_id`; inserts llenan `animal_id` + `vaca_numero`.
- `vacunas.repository.ts`: igual.
- `animals.repository.ts`:
  - `checkAnimalDependencies(id, numero)` → filtra por `animal_id` en eventos/vacunas/historial (sin `vaca_numero`).
  - `aplicarEgresoSinEvento` ya filtra por `numero + estado_actual='activa'` — se refactoriza para recibir `id` y usar `.eq("id", id)`.
  - `marcarEgresoAnimal`, `reactivarAnimal`, `updateUbicacionLote`, `updateEstadoReproductivo`, `updateAnimal`: pasan a recibir `id` y filtrar por `.eq("id", id)`.

Hooks:
- `useAnimalEvents(animalId, numero)` — cambian signatures para tomar `animalId`. `queryKey: ["animal-events", animalId]`.
- `useHistorial(animalId)` — idem.
- `useVacunas` por vaca — idem.
- `useUpdateAnimal/useMarcarEgreso/useReactivar/useDeleteAnimal` — toman `id`.

Componentes:
- `PerfilAnimal.tsx`, `FormHistorial`, `EventDialog`, `VacunasTablaVaca`, `FormVacuna`, `FamiliaTab`, etc. — pasar `animal.id` en lugar de `animal.numero` a hooks y mutaciones.
- Listas (`ListaAnimales`, `HistorialTabla`, `EventTimeline`, etc.): `key={x.id}`.

Compatibilidad legacy:
- `vacas.repository.ts` (módulo `cows`) se deja como está internamente — solo lo usa código legacy que no afectamos en esta fase. Los triggers `sync_*` siguen funcionando porque seguimos escribiendo `vaca_numero` en inserts.

### Fase C — (futura, fuera de scope ahora) volver `animal_id` NOT NULL y eliminar `vaca_numero`

No se hace ahora. Requiere primero migrar/retirar triggers legacy y la vista `vacas`.

## Archivos a tocar

**Migración SQL (nueva):**
- `supabase/migrations/<ts>_add_animal_id_to_event_tables.sql`

**Repositorios:**
- `src/modules/cows/events/repositories/events.repository.ts`
- `src/modules/breeding/repositories/historial.repository.ts`
- `src/modules/vaccinations/repositories/vacunas.repository.ts`
- `src/modules/animals/repositories/animals.repository.ts`

**Hooks:**
- `src/modules/cows/events/hooks/useAnimalEvents.ts`
- `src/modules/breeding/hooks/useHistorial.ts`
- `src/modules/vaccinations/hooks/useVacunas.ts`
- `src/modules/animals/hooks/useAnimals.ts` (mutaciones por id)

**Componentes (consumidores):**
- `PerfilAnimal.tsx`, `FamiliaTab.tsx`, `ListaAnimales.tsx`
- `EventDialog.tsx`, `EventTimeline.tsx`, `DynamicEventForm.tsx`
- `FormHistorial.tsx`, `HistorialTabla.tsx`
- `FormVacuna.tsx`, `VacunasTablaVaca.tsx`
- `routes/_authenticated/vacunas.tsx` (lista global — keys por id)

**No se toca:**
- `vacas` (tabla legacy) ni `cows/repositories/vacas.repository.ts`.
- Triggers `sync_*` ni vista legacy.
- `FormAnimal`, validación de unicidad de `numero`, schemas Zod del dominio.

## Riesgos y cleanup

- Tras backfill, filas viejas con `numero` único quedan correctamente enlazadas. Filas con `numero` colisionado se enlazan al activo (consistente con la lógica que ya teníamos en `getAnimalByNumero`).
- React Query keys cambian de `[..., numero]` a `[..., animalId]`: cualquier `invalidateQueries` viejo deja de invalidar. Se actualizan todos los call-sites en el mismo cambio.
- `useAnimals` (`marcarEgreso/reactivar/delete/update`) cambia firma de `numero` → `id`: hay que ajustar todos los consumidores en `PerfilAnimal` y derivados.

## Verificación

- Crear dos animales con el mismo `numero` (uno egresado, uno activo); registrar evento/vacuna/servicio en el activo; el egresado NO debe mostrar ese registro.
- Marcar venta en el activo: el egresado original conserva su estado y datos.
- Lista de animales: dos tarjetas distintas con keys distintas.

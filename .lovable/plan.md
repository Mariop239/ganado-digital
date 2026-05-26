## Objetivo

Arreglar el bug donde clic en un animal egresado abre el perfil del activo que reutiliza ese arete, **sin romper el Principio #9** (URLs humanas `/animales/$numero`).

## Estrategia

Mantener la ruta `/animales/$numero` y añadir un parámetro de búsqueda opcional `?id=<uuid>` que actúa como desambiguador solo cuando hace falta.

- Si llega `?id=...` → el perfil se resuelve por `id` (exacto, sin importar colisión).
- Si no llega `?id` → comportamiento actual: se resuelve por `numero` priorizando el activo.

URLs públicas, bookmarks y el alias legacy `/vacas/$numero` siguen funcionando intactos.

## Cambios

### 1. Repositorio

`src/modules/animals/repositories/animals.repository.ts`

- `getAnimalById` ya existe y se usará para la resolución por id.
- No se toca `getAnimalByNumero` (ya prioriza activo).

### 2. Hook

`src/modules/animals/hooks/useAnimal.ts`

- Aceptar segundo argumento opcional `id?: string`.
- Si `id` está presente, delegar a `getAnimalById(id)` (con queryKey `["animal-by-id", id]`).
- Si no, mantener el flujo actual por `numero`.

### 3. Ruta del perfil

`src/routes/_authenticated/animales.$numero.tsx`

- Declarar `validateSearch` con `{ id?: string }` (zod o función simple).
- Leer `Route.useSearch()` y pasar `id` al hook `useAnimal(numero, id)`.
- Mensaje de "no encontrado" sigue mostrando el `numero` para el usuario.

### 4. Links que deben adjuntar `?id` cuando el animal NO está activo

Solo se añade `search={{ id: a.id }}` cuando `a.estado_actual !== "activa"` (los activos son únicos por número y no necesitan desambiguación). Esto mantiene URLs limpias en el caso común.

Archivos:

- `src/modules/animals/components/ListaAnimales.tsx` — el `<Link to="/animales/$numero">` en la tarjeta.
- `src/modules/animals/components/FamiliaTab.tsx` — dos `<Link>` (hijos e individuo seleccionado de familia).
- `src/modules/animals/components/SelectorAnimal.tsx` — actualmente filtra por `activa` vía `useAnimals`; revisar y añadir `search` condicional si llegara a navegar (hoy solo selecciona id, no navega — confirmar y dejar como está si aplica).
- `src/modules/breeding/components/HistorialTabla.tsx` — cualquier `<Link>` hacia perfil de cría/madre.

Patrón:

```tsx
<Link
  to="/animales/$numero"
  params={{ numero: a.numero }}
  search={a.estado_actual !== "activa" ? { id: a.id } : undefined}
>
```

### 5. Alias legacy

`src/routes/_authenticated/vacas.$numero.tsx` se deja igual (sin id; el legacy apuntaba a animales activos por número y eso sigue siendo correcto).

## Lo que NO se cambia

- Esquema de Supabase, migraciones, RLS, índices.
- Nombres de archivos de ruta (`animales.$numero.tsx` se mantiene).
- Tipos de dominio (`Animal.numero` sigue string obligatorio).
- Repos de breeding/events/vaccinations.
- Lógica de FormAnimal ni unicidad ya implementada.

## Riesgos / cleanup

- Riesgo bajo: el query param es aditivo y opcional.
- No hay deuda nueva: cuando el usuario navega desde la lista a un activo, la URL queda sin `?id` (humana). Solo histórico/egresados llevan `?id`.
- No se introducen wrappers, ni rutas duplicadas, ni componentes paralelos.

## Verificación

1. Lista con dos animales con mismo `numero` (uno activa, otro vendida): clic en activa abre activa (URL sin `?id`), clic en vendida abre vendida (URL con `?id=<uuid>`).
2. Refrescar `/animales/104?id=<uuid-egresado>` muestra el egresado.
3. Refrescar `/animales/104` (sin id) muestra el activo.
4. Alias `/vacas/104` sigue redirigiendo y resolviendo al activo.

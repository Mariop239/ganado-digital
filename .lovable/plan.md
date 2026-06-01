## Objetivo

Convertir `/` en un Dashboard táctil y profesional, mover la lista de animales a `/animales`, y reordenar el sidebar.

## Nota sobre nomenclatura (Principio #13)

El proyecto estandariza "Animal" sobre "Vaca". Propongo usar las etiquetas:
- "Animales activos" (en vez de "Total de Vacas Activas")
- "Animales" en sidebar (en vez de "Mis Vacas")

Mantengo "Nacimientos del mes" y "Gasto sanitario (mes)". Si prefieres conservar literalmente "Vacas", lo cambio en build.

## Paso 1 — Rutas

- Mover el componente actual de `/` (ListaAnimales) a una nueva ruta `src/routes/_authenticated/animales.tsx` → `/animales`.
- Reemplazar `src/routes/_authenticated/index.tsx` para que renderice `<Dashboard />`.
- Eliminar la ruta legacy redundante `src/routes/_authenticated/animales.index.tsx` si duplica (verificar en build).

## Paso 2 — Componente Dashboard

`src/modules/dashboard/components/Dashboard.tsx` (módulo nuevo, respetando arquitectura modular).

### 2.1 Tarjetas de Resumen (grid 1/2/3 cols responsivo)

Datos en vivo vía hooks existentes + uno nuevo:

- **Animales activos**: `useAnimals()` → contar `estado_actual === "activa"`.
- **Nacimientos del mes**: nuevo hook `useNacimientosMes()` en `modules/breeding/hooks/` — query a `historial` con `fecha_parto` entre inicio y fin del mes actual del usuario (RLS).
- **Gasto sanitario (mes)**: nuevo hook `useGastoSanitarioMes()` en `modules/vaccinations/hooks/` — suma `gasto` de `control_vacunas` con `fecha` en el mes actual.

Cards grandes con icono, label `text-muted-foreground`, número `text-3xl font-bold`, usando tokens del design system (sin colores hardcoded). Skeletons mientras carga.

### 2.2 Acciones Rápidas (grid 1/3 cols)

3 botones grandes (`min-h-20`, `text-base`, icono prominente) que abren los modales existentes:

- **Registrar Nacimiento/Parto** → Dialog con `FormHistorial` (módulo breeding). Como ese formulario requiere un `animal_id` (madre), abre primero un `SelectorAnimal` filtrado por hembras activas y luego el formulario.
- **Añadir Animal** → Dialog con `FormAnimal` (mismo patrón que ListaAnimales línea ~16-17).
- **Registrar Vacuna/Tratamiento** → Dialog con `FormControlSanitarioGrupal` (mismo patrón que `vacunas.tsx` línea ~98-110).

Reutilizar 100% los formularios existentes — no duplicar UI (Principio #1).

### 2.3 Panel de Alertas

Card titulada "Tareas y alertas pendientes" con borde/acento cálido (`border-amber-500/40`, icono `AlertTriangle` en `text-amber-600`). Por ahora maqueta estática con 2 items mock como pidió el usuario. Estructura preparada para reemplazar con datos reales en una fase futura (gestantes próximas a parto desde `historial.fecha_probable_parto`, destetes pendientes, próximas dosis sanitarias).

## Paso 3 — Sidebar

Actualizar `src/components/layout/AppSidebar.tsx`:

```
{ title: "Dashboard",        url: "/",         icon: LayoutDashboard }
{ title: "Animales",         url: "/animales", icon: Beef }
{ title: "Control Sanitario", url: "/vacunas", icon: Syringe }
```

Marca activa: `/` exacto para Dashboard, `startsWith` para los demás (ya soportado).

## Paso 4 — Mobile-first

- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Botones de acción rápida: `min-h-20`, ancho completo en móvil, columnas en ≥sm.
- Padding generoso en cards, tipografía escalable (`text-2xl sm:text-3xl`).
- Toda la página dentro del `main` actual (ya tiene `max-w-6xl px-4 py-6`).

## Archivos a crear / modificar

Crear:
- `src/modules/dashboard/components/Dashboard.tsx`
- `src/modules/dashboard/index.ts`
- `src/modules/breeding/hooks/useNacimientosMes.ts`
- `src/modules/vaccinations/hooks/useGastoSanitarioMes.ts`
- `src/routes/_authenticated/animales.tsx`

Modificar:
- `src/routes/_authenticated/index.tsx` (render Dashboard)
- `src/components/layout/AppSidebar.tsx` (3 items reordenados)
- Re-exports en `src/modules/breeding/index.ts` y `src/modules/vaccinations/index.ts`

Verificar:
- Resolver conflicto con `src/routes/_authenticated/animales.index.tsx` existente (quedará una sola ruta `/animales`).
- `routeTree.gen.ts` se regenera solo.

## Fuera de alcance (Principio #7)

- Lógica real de alertas (solo maqueta, como pidió el usuario).
- Cambios en formularios existentes.
- Migraciones de base de datos.

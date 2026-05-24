# Plan: Módulo "Vacas Paridas" con Supabase

Construyo el módulo completo conectado a Supabase desde el inicio. Sin datos simulados. Rancho compartido: cualquier usuario autenticado ve y edita las mismas vacas.

## 1. Base de datos (migración)

Dos tablas con RLS habilitada. Acceso completo (lectura + escritura) para cualquier usuario autenticado; bloqueado para anónimos.

**Tabla `vacas`**
- `numero` (text, PK) — arete único
- `dueno`, `nombre`, `color`, `raza`, `padre`, `madre` (text)
- `fecha_egreso` (date, opcional), `motivo_egreso` (text, opcional)
- `created_at`, `updated_at` (timestamptz)

**Tabla `historial`**
- `id` (uuid, PK)
- `vaca_numero` (text, FK → vacas.numero, ON DELETE CASCADE)
- `fecha_monta` (date, NOT NULL)
- `toro` (text)
- `fecha_parto` (date, opcional)
- `sexo_cria` (text, opcional, check: 'Macho' | 'Hembra')
- `fecha_destete` (date, opcional)
- `observaciones` (text, opcional)
- `created_at`, `updated_at`
- Trigger de validación: si `fecha_parto` existe debe ser ≥ `fecha_monta`; si `fecha_destete` existe debe ser ≥ `fecha_parto`.

**RLS (rancho compartido):**
- `SELECT/INSERT/UPDATE/DELETE` permitido si `auth.uid() IS NOT NULL` en ambas tablas.

Índices: `historial(vaca_numero)`, `vacas(nombre)` para el buscador.

## 2. Autenticación

Email + contraseña (Supabase Auth). Sin tabla `profiles` — el rancho es compartido y no necesitamos datos por usuario.

- `/login` y `/signup` públicos.
- Pathless layout `_authenticated` protege el resto de rutas con `beforeLoad`.
- `onAuthStateChange` en `__root.tsx` invalida React Query al cambiar la sesión.
- Botón "Cerrar sesión" en el header.

**Importante:** habilita en el dashboard de Supabase la opción "Confirm email" en OFF si quieres que los trabajadores entren sin verificar correo, o déjala ON si prefieres confirmación.

## 3. Estructura de archivos

```text
src/
  routes/
    __root.tsx                       → providers + listener auth
    login.tsx                        → pública
    signup.tsx                       → pública
    _authenticated.tsx               → guardia de auth
    _authenticated/index.tsx         → Dashboard / lista de vacas
    _authenticated/vacas.$numero.tsx → Perfil de la vaca + historial
  components/
    vacas/
      ListaVacas.tsx, TarjetaVaca.tsx
      PerfilVaca.tsx, HistorialTabla.tsx
      FormVaca.tsx, FormHistorial.tsx
      EgresoDialog.tsx
    layout/Header.tsx
  lib/
    vacas-repository.ts              → CRUD vacas
    historial-repository.ts          → CRUD historial
    schemas.ts                       → Zod schemas compartidos
  hooks/
    useVacas.ts, useVaca.ts, useHistorial.ts  → React Query
    useAuth.ts
```

Capa repository encapsula todas las llamadas al cliente Supabase (`@/integrations/supabase/client`). Los componentes nunca llaman a Supabase directo — usan los hooks de React Query.

## 4. Pantallas

1. **`/login`, `/signup`** — formularios sencillos, redirección a `/` al éxito.
2. **`/` (dashboard)** — tarjetas/tabla de vacas activas (`fecha_egreso IS NULL`), buscador por Número o Nombre, botón "Añadir Nueva Vaca" (dialog con `FormVaca`).
3. **`/vacas/$numero`** — pantalla detalle.
   - Datos base + botones "Editar" y "Marcar egreso".
   - Tabla cronológica del historial + botón "Añadir registro de parto/monta" (dialog con `FormHistorial`), con acciones editar/eliminar por fila.

## 5. Validación

`react-hook-form` + `zod`:
- `numero` requerido, único (manejo de error 23505 en insert).
- Egreso: si hay fecha, motivo requerido; fecha no futura.
- Historial: `fecha_monta` requerida; `fecha_parto` ≥ `fecha_monta` y ≤ `fecha_monta + 320 días`; `fecha_destete` ≥ `fecha_parto`; `sexo_cria` requerido cuando hay `fecha_parto`.

Validación duplicada en el trigger SQL como respaldo.

## 6. UI/UX

- Tema claro tipo campo: verde bosque (primario), beige/crema fondo, acentos madera, blanco para tarjetas. Tokens en `src/styles.css` (oklch).
- Mobile-first, botones grandes (≥48px), inputs amplios para uso en celular por adulto mayor.
- Todo en español usando los términos exactos del modelo.
- `shadcn/ui` + `lucide-react`.

## Detalles técnicos

- React Query con keys `['vacas']`, `['vaca', numero]`, `['historial', vacaNumero]`. Invalidación tras cada mutación.
- Confirmaciones para eliminar/marcar egreso vía `AlertDialog`.
- Sin server functions — el cliente browser de Supabase basta porque las RLS protegen las tablas.

## Fuera de alcance

- Roles, edición de usuarios desde la app (se gestionan desde el dashboard de Supabase).
- Otros módulos del rancho.

¿Apruebo y procedo? Te confirmo que esto va a crear las tablas `vacas` e `historial` y a pedirte configurar/usar autenticación por email.
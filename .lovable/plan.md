## Estructura confirmada

**FK:** `vaca_numero TEXT REFERENCES vacas(numero) ON DELETE CASCADE ON UPDATE CASCADE` (coherente con `historial`, ya que `vacas.numero` es TEXT, no UUID).

**Registro contextual:** en el modal del perfil, `vaca_numero` se inyecta en el cliente desde el `params.numero` de la ruta (no se envía desde un input). El backend lo recibe como parte del insert; RLS solo exige `authenticated`. No hay campo oculto en el form ni manipulable por el usuario.

## Plan de construcción

### 1. Migración Supabase — `control_vacunas`
```sql
CREATE TABLE public.control_vacunas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaca_numero TEXT NOT NULL REFERENCES public.vacas(numero) ON DELETE CASCADE ON UPDATE CASCADE,
  fecha DATE NOT NULL,
  vacuna_aplicada TEXT NOT NULL,
  enfermedad_a_prevenir TEXT NOT NULL DEFAULT '',
  gasto NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (gasto >= 0),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cv_vaca ON public.control_vacunas(vaca_numero);
CREATE INDEX idx_cv_fecha ON public.control_vacunas(fecha DESC);
ALTER TABLE public.control_vacunas ENABLE ROW LEVEL SECURITY;
-- 4 policies para authenticated (SELECT/INSERT/UPDATE/DELETE) con USING/CHECK = true
CREATE TRIGGER trg_cv_updated_at BEFORE UPDATE ON public.control_vacunas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### 2. App Shell con Sidebar (limpio para tablet)
- `src/components/layout/AppSidebar.tsx` con shadcn `Sidebar` (`collapsible="icon"`), items:
  - **Mis Vacas** (`/`, icono Beef)
  - **Registro Global de Vacunas** (`/vacunas`, icono Syringe)
- `src/routes/_authenticated.tsx` envuelve con `SidebarProvider`; `Header` mantiene logout y suma `SidebarTrigger` siempre visible.

### 3. Capa de datos
- `src/lib/vacunas-repository.ts`: `listVacunasGlobal()`, `listVacunasPorVaca(numero)`, `createVacuna(input)`, `deleteVacuna(id)`.
- `src/hooks/useVacunas.ts`: `useVacunasGlobal`, `useVacunasPorVaca`, `useCreateVacuna`, `useDeleteVacuna`.
- `src/lib/schemas.ts`: `vacunaSchema` (fecha no futura, vacuna requerida, gasto ≥ 0).

### 4. Refactor del Perfil de la Vaca
- `PerfilVaca.tsx`: la sección inferior pasa a `Tabs` de shadcn con dos paneles:
  - **Reproducción** → mueve `HistorialTabla` + botón "Añadir Historial" actual.
  - **Vacunas y Médico** → tabla con fecha, vacuna, enfermedad, gasto, observaciones, acciones; botón **Registrar Vacuna**.
- Modal `FormVacuna.tsx` (react-hook-form + zod): campos visibles fecha / vacuna_aplicada / enfermedad_a_prevenir / gasto / observaciones. `vaca_numero` se añade en el handler de submit desde el contexto de la ruta. Toasts sonner al guardar.

### 5. Pantalla `/vacunas` — Registro Global
- Ruta `src/routes/_authenticated/vacunas.tsx`.
- Cards superiores: **Gasto total**, **Total de aplicaciones**, **Vacas distintas vacunadas**.
- Tabla solo lectura con: Vaca (`numero — nombre`), Fecha, Vacuna, Enfermedad, Gasto (moneda). Orden fecha desc, búsqueda simple.

## Fuera de alcance
- Edición de registros (solo crear + eliminar desde perfil).
- Exportación / reportes avanzados.
- Recordatorios o agenda de próximas vacunas.

Al aprobar, ejecuto en orden: migración → sidebar shell → capa de datos → tabs en perfil + modal → pantalla global.

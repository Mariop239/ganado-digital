## Cambios al plan anterior

Incorpora las 5 correcciones solicitadas. El resto del plan (atajos en alertas + invalidación global) se mantiene.

---

### 1. Acción rápida de Parto — reutilizar el flujo de "Registrar nacimiento"

`FormHistorial` NO sirve (crea servicios, no actualiza partos). El flujo correcto ya existe en `HistorialTabla.tsx` (líneas 161–196): abre `FormAnimal` para crear la cría con `mother_id` precargado y, en `onAfterCreate`, dispara `useMarcarParida` con el `historial.id` y el `cria_animal_id` recién creado.

Aplicar exactamente ese mismo patrón en `Dashboard.tsx`:

- Al clic en "Registrar" de una `CrianzaRow` tipo `parto`, abrir un `Dialog` "Registrar nacimiento" que renderiza `FormAnimal` con:
  - `defaults`: `mother_id`, `madre_texto`, `padre_texto` (toro del historial), `fecha_nacimiento = hoy`, `sexo: "hembra"`, `categoria: "ternera"`.
  - `lockedFields: ["mother_id", "madre_texto", "padre_texto"]`.
  - `onAfterCreate`: llama a `useMarcarParida(animalId).mutateAsync({ id: historialId, input: { fecha_parto, sexo_cria, cria_animal_id } })`.
- Para tener `toro`/`madre`, el hook `useAlertasCrianza` debe exponer:
  - `historial_id` (raw, no concatenado).
  - `toro: string | null` (del registro de historial).

Nota P3/P4: el animal madre no muta; solo se actualiza el `historial` correspondiente y se crea una nueva cría como entidad estable.

---

### 2. `useMarcarDestetado` — sintaxis correcta

```ts
// src/modules/breeding/hooks/useMarcarDestetado.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMarcarDestetado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (historialId: string) => {
      const hoy = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("historial")
        .update({ fecha_destete: hoy })
        .eq("id", historialId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      qc.invalidateQueries({ queryKey: ["animals"] });
    },
  });
}
```

Exportar desde `src/modules/breeding/index.ts`. Confirmación previa vía `AlertDialog` ("¿Confirmar destete de #045?") y `toast` de éxito/error en el componente que lo invoca.

---

### 3. Invalidación global consistente

Añadir `qc.invalidateQueries({ queryKey: ["dashboard"] })` en el `onSuccess` de TODAS estas mutaciones (mantener las invalidaciones existentes):

- `src/modules/vaccinations/hooks/useVacunas.ts`: `useCreateVacuna`, `useCreateVacunasBulk`, `useDeleteVacuna`.
- `src/modules/breeding/hooks/useHistorial.ts`: `useCreateServicio`, `useUpdateServicio`, `useMarcarParida`, **`useDeleteHistorial`** (incluido explícitamente).
- `useMarcarDestetado` (nuevo, ya incluido).

La invalidación por prefijo `["dashboard"]` cubre `alertas-crianza`, `alertas-sanitarias-globales`, `nacimientos-mes` y `gasto-sanitario-mes` (todos comparten ese prefijo en sus query keys actuales).

---

### 4. Estado del diálogo extendido — incluir `historialId`

Reemplazar:

```ts
type DialogKey = null | "animal" | "vacuna" | "parto";
const [open, setOpen] = useState<DialogKey>(null);
```

por:

```ts
type DialogState =
  | { tipo: "animal" }
  | { tipo: "vacuna-grupal" }                                  // acción rápida del header
  | { tipo: "vacuna-rapida"; animalId: string }                // desde alerta sanitaria
  | { tipo: "parto-selector" }                                 // acción rápida del header
  | { tipo: "parto"; animalId: string; historialId: string; toro: string | null; madreLabel: string };

const [dialog, setDialog] = useState<DialogState | null>(null);
```

- `historialId` se necesita en `parto` (para `marcarParida`) y se pasa al `AlertDialog` de destete (como argumento directo de `useMarcarDestetado.mutate`).
- `animalId` se necesita para `vacuna-rapida` y `parto`.
- El flujo grupal/selector del header NO lleva contexto.

---

### 5. `FormVacuna` — inicializar fecha en hoy

En `src/modules/vaccinations/components/FormVacuna.tsx`, cambiar el `defaultValues.fecha` de `""` a `new Date().toISOString().slice(0, 10)`. Sin cambios adicionales — el `DatePicker` ya acepta ese formato.

Esto alinea el formulario individual con el grupal (`FormControlSanitarioGrupal`) y agiliza la acción rápida sanitaria del Dashboard.

---

## Archivos a tocar (resumen actualizado)

- `src/modules/dashboard/components/Dashboard.tsx` — estado `DialogState`, botones por fila, integración con `FormAnimal` para parto, `AlertDialog` para destete.
- `src/modules/vaccinations/hooks/useVacunas.ts` — añadir invalidate `["dashboard"]` en los 3 hooks.
- `src/modules/vaccinations/components/FormVacuna.tsx` — `fecha` default = hoy.
- `src/modules/breeding/hooks/useHistorial.ts` — añadir invalidate `["dashboard"]` en los 4 hooks (incluyendo `useDeleteHistorial`).
- `src/modules/breeding/hooks/useMarcarDestetado.ts` — **nuevo**.
- `src/modules/breeding/hooks/useAlertasCrianza.ts` — exponer `historial_id` y `toro` en `AlertaCrianza`.
- `src/modules/breeding/index.ts` — exportar `useMarcarDestetado`.

## Riesgos

- `useDeleteHistorial` actualmente no invalidaba `["animals"]`; al añadir `["dashboard"]` se mantiene el comportamiento existente intacto.
- El cambio de `fecha` default en `FormVacuna` afecta también al uso desde el perfil del animal — efecto deseado (consistencia con el grupal).
- Reversible: cada cambio es aditivo o un default razonable.
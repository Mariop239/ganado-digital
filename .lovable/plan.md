## Diagnóstico

El error `animal_events_vaca_numero_fkey — Key is not present in table "vacas"` se debe a que las tablas `animal_events`, `control_vacunas` e `historial` aún tienen un FK legacy hacia `vacas(numero)`. La tabla `vacas` es solo-hembras (el trigger `sync_animals_to_vacas` filtra por `sexo='hembra'`), entonces cualquier inserción para un macho falla con violación de FK, sin importar que el frontend ya use `animal_id`.

## Plan

### Migración SQL (única fase)

Eliminar las tres restricciones legacy:

```sql
ALTER TABLE public.animal_events  DROP CONSTRAINT IF EXISTS animal_events_vaca_numero_fkey;
ALTER TABLE public.control_vacunas DROP CONSTRAINT IF EXISTS control_vacunas_vaca_numero_fkey;
ALTER TABLE public.historial      DROP CONSTRAINT IF EXISTS historial_vaca_numero_fkey;
```

Se mantienen:
- Las columnas `vaca_numero` (NOT NULL) por compatibilidad con triggers `sync_vaca_estado` y la vista legacy.
- Los FKs nuevos hacia `animals(id)` que sí garantizan integridad real.
- Triggers `sync_*`: siguen funcionando; para machos simplemente no encuentran fila en `vacas` y el UPDATE no afecta filas (comportamiento correcto, ya que `vacas` no debe contener machos).

### Sin cambios en código frontend

El refactor anterior ya inserta `animal_id` correctamente. No hay archivos TS/TSX a tocar en este cambio.

## Verificación

1. Registrar evento "Venta" en un macho → debe guardarse sin error.
2. Registrar evento en una hembra → sigue funcionando y el trigger `sync_vaca_estado` actualiza `vacas.fecha_egreso` como antes.
3. Vacunas e historial en machos → también desbloqueados.

## Riesgos

- Bajos. La integridad referencial real ahora la dan los FKs a `animals(id)`. El FK legacy era redundante y además incorrecto para el modelo actual (animales no-hembra).
- Reversible: si surge un problema, se puede recrear el FK (aunque eso volvería a romper machos).

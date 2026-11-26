# Plan de recuperación ante desastres

## Objetivos

- RPO: 24 horas.
- RTO objetivo: 4 horas.
- Principio: restaurar primero en una base aislada; nunca restaurar directamente sobre producción.

## Activación

1. Registrar el incidente y un responsable de ejecución.
2. Congelar cambios de código y migraciones.
3. Impedir el uso operativo mediante mantenimiento o restricciones temporales.
4. Obtener el último artefacto cifrado y su `.sha256`.
5. Obtener la clave de cifrado por un canal autorizado, fuera del repositorio.

## Descarga y verificación

```powershell
Get-FileHash .\vnc-erp-YYYYMMDDTHHMMSSZ.dump.enc -Algorithm SHA256
Get-Content .\vnc-erp-YYYYMMDDTHHMMSSZ.dump.enc.sha256
```

La línea del archivo SHA-256 debe coincidir con el hash calculado.

```powershell
openssl enc -d -aes-256-cbc -pbkdf2 `
  -in .\vnc-erp-YYYYMMDDTHHMMSSZ.dump.enc `
  -out .\vnc-erp.dump
```

Eliminar el archivo descifrado al finalizar.

## Restauración aislada

Crear una base PostgreSQL nueva y vacía. Restaurar sin propiedad ni ACL:

```powershell
pg_restore --clean --if-exists --no-owner --no-acl `
  --dbname="$env:DR_DATABASE_CONNECTION_STRING" `
  .\vnc-erp.dump
```

Configurar únicamente las variables necesarias para apuntar una instancia de prueba al
entorno de recuperación. No usar la llave de servicio ni credenciales de producción en
artefactos, registros o el repositorio.

## Validación

1. Ejecutar migraciones pendientes en la base aislada.
2. Confirmar la existencia de módulos, perfiles, empleados, productos y proveedores.
3. Revisar conteos de ventas, compras, recibos y movimientos de caja.
4. Confirmar que las políticas RLS continúan habilitadas.
5. Validar entrada y salida de personal con datos de prueba.
6. Ejecutar build, pruebas unitarias y pruebas E2E contra el entorno aislado.
7. Registrar conteos, fecha del respaldo y hora de restauración.

## Conmutación

1. Aprobar la restauración mediante dos responsables.
2. Configurar las variables de Vercel para la base recuperada.
3. Redesplegar desde el último commit estable.
4. Mantener un plan de reversión a la base anterior.
5. Resolver DNS, rutas y cookies de sesión si cambió el proyecto.
6. Revocar sesiones activas y exigir nuevo inicio de sesión.
7. Reanudar operaciones y supervisar errores durante al menos 60 minutos.

## Evidencia y cierre

Guardar sin secretos:

- Hora de detección.
- Hora de activación.
- Fecha/hora del respaldo restaurado.
- Hora de restauración.
- Conteos de registros clave.
- Resultado de pruebas.
- Hora de recuperación completa.
- Responsable de aprobación.

## Prueba periódica

Realizar una restauración de práctica al menos una vez por trimestre. Marcar el resultado
como aprobado solo si se cumplen RPO y RTO y todas las validaciones críticas pasan.

El workflow de GitHub Actions crea respaldos cifrados separados para `staging` y
`operations`, usando el cliente PostgreSQL 17 y artefactos con el nombre del entorno.
Configurar en **cada** GitHub Actions Environment los secretos
`SUPABASE_DB_CONNECTION_STRING` y `BACKUP_ENCRYPTION_PASSWORD`; las conexiones deben
apuntar exclusivamente a la base de ese entorno. La ejecución programada requiere que
ambos entornos y sus secretos estén configurados. Confirmar una ejecución exitosa y
una restauración aislada antes de considerar operativo el respaldo.

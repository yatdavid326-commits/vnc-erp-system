# Entornos de ERP

## Modelo recomendado

Usar dos instalaciones completas:

1. **Mejoras y pruebas**
   - Proyecto Supabase staging.
   - Proyecto de Vercel staging.
   - Rama Git `staging`.
   - Datos simulados o copia limpia.

2. **Operaciones**
   - Proyecto Supabase producción.
   - Proyecto de Vercel producción.
   - Rama Git `master`.
   - Datos reales y respaldos independientes.

No compartir usuarios, credenciales, service-role keys ni datos operativos entre ambos
entornos. El sistema puede cambiar de base mediante variables de entorno sin cambiar
credenciales dentro del código.

## Variables

Configurar por despliegue:

- `NEXT_PUBLIC_APP_ENV=staging` o `NEXT_PUBLIC_APP_ENV=production`.
- `NEXT_PUBLIC_SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`.

Usar `.env.example` como plantilla. Nunca confirmar `.env.local` ni secretos reales.

## Flujo de mejora

1. Crear una rama corta desde `staging`.
2. Implementar y ejecutar migraciones en Supabase staging.
3. Verificar build, unitarias, E2E y pruebas reales.
4. Confirmar el código.
5. Fusionar a `staging` y desplegar Vercel staging.
6. Promover solo migraciones y commits verificadas a `master`.
7. Aplicar migraciones a Supabase producción antes del despliegue.
8. Desplegar Vercel producción.
9. Ejecutar una prueba de humo y conservar evidencias.

## Regla de migraciones

Las migraciones tienen nombres crecientes y no se modifican después de aplicarse.
Una mejora no se considera promovida hasta:

- Aplicar migración en staging.
- Pasar pruebas.
- Aplicar la misma migración en producción.
- Verificar módulos críticos.

### Línea base de operaciones

La base de operaciones se inicializó a partir de una exportación **solo del esquema
`public`** del entorno existente, que ya incluía las migraciones hasta
`20261124000005`. Se registraron las 20 versiones existentes como línea base; no
deben volver a ejecutarse sobre esa base. Se copiaron únicamente los diez módulos
de configuración, sin usuarios ni datos comerciales. También se configuró la
publicación Realtime de `notifications`.

Los archivos históricos `SCHEMA.sql` y `SCHEMA_CLEAN.sql` no constituyen una línea
base completa y no deben utilizarse por sí solos para una instalación nueva. Antes
de crear otra instancia se necesita una línea base reproducible y revisada, o una
restauración de esquema confiable con su historial de migraciones. Verificar
permisos, RLS, Realtime y migraciones antes de añadir usuarios o datos.

## Futuras instalaciones por cliente

Cada cliente podrá recibir su propia instancia completa:

- Supabase cliente.
- Vercel cliente.
- Dominio propio.
- Usuarios y datos separados.
- Migraciones promovidas desde staging.

El dominio actual `vnc-systems-mundo-mega` puede reservarse para una futura instalación
de operaciones o como alias; no debe apuntarse hasta que el proyecto Supabase y las
variables de producción estén listas.

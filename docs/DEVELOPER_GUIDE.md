# Guía de desarrollo

## Requisitos

- Node.js 22.6 o superior.
- npm.
- Cuenta y proyecto Supabase.
- Cuenta Vercel para despliegue.
- Playwright Chromium para pruebas E2E.

## Configuración inicial

```powers
npm install
npx playwright install chromium
npm run dev
```

Usar `.env.local` para variables locales. No incluir secretos en archivos versionados.

Variables principales:

- `NEXT_PUBLIC_SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`, solo en servidor.
- `CRON_SECRET`, solo para el trabajo de notificaciones.

## Estructura

- `app/`: rutas, páginas y handlers Next.js.
- `components/`: componentes reutilizables.
- `lib/`: servicios, validación, permisos y utilidades.
- `supabase/migrations/`: cambios de esquema y funciones SQL.
- `tests/`: pruebas unitarias y E2E.
- `docs/`: documentación técnica y operativa.

## Autenticación y permisos

Las rutas API protegidas deben pasar por `proxy.ts`. Las respuestas deben validar sesión,
perfil activo y permisos del módulo. No confiar en cookies de estado MFA como autoridad;
validar la sesión y el nivel AAL de Supabase.

Las operaciones sensibles deben registrar auditoría crítica y respetar RLS.

## Validación

Usar Zod en `lib/validation/requestSchemas.ts` para cuerpos de API. Las rutas deben
validar UUID, fechas, rangos numéricos, tamaños y propiedades extra.

Usar `fetchJson` o `fetchPaginatedJson` en el cliente para mostrar mensajes seguros
del servidor sin exponer detalles técnicos.

## Migraciones

Agregar cada cambio SQL como un archivo nuevo en `supabase/migrations/` con timestamp
único. No modificar migraciones históricas ya aplicadas.

Antes de desplegar:

1. Revisar dependencias entre migraciones.
2. Aplicar primero en la base de pruebas.
3. Ejecutar validaciones RLS y RPC.
4. Ejecutar build y pruebas.
5. Aplicar el mismo conjunto en producción.
6. Verificar conteos y operaciones críticas.

## Pruebas

```powershell
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:load
npm run lint
npm run build
```

Las pruebas de carga deben usar solamente lectura y límites bajos.

## Supabase

- Crear funciones RPC para operaciones transaccionales.
- Usar locks y versiones optimistas cuando un registro pueda cambiar concurrentemente.
- No deshabilitar RLS como solución temporal.
- Mantener compatibilidad con los roles y políticas existentes.

## Git y despliegue

- Mantener cambios pequeños y relacionados.
- Añadir migración y documentación con la mejora que la requiera.
- Ejecutar pruebas y build antes de confirmar.
- Crear commits descriptivos.
- Desplegar desde `master` después de validar.

## Verificación del servidor

Antes de cerrar una mejora:

1. Abrir la aplicación en una pestaña compartida.
2. Iniciar sesión con una cuenta de prueba.
3. Navegar al módulo afectado.
4. Ejecutar la acción principal.
5. Confirmar estados de carga, éxito y error.
6. Revisar consola y respuestas HTTP.

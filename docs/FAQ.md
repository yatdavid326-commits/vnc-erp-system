# Preguntas frecuentes

## ¿Qué hago si no puedo iniciar sesión?

Verifica usuario y contraseña. Si la cuenta tiene MFA, introduce el código de seis dígitos
del autenticador. Si necesitas cambiar la contraseña, usa “¿Olvidaste tu contraseña?”.

## ¿Cómo recupero una contraseña?

Solicita el enlace desde `/forgot-password`. El correo no revela si una cuenta existe:
la respuesta siempre indica revisar el correo cuando corresponda. El enlace abre
`/reset-password` y exige una contraseña fuerte.

## ¿Por qué no aparece un módulo o una acción?

Cada módulo tiene permisos independientes de ver, crear, editar y eliminar. Un usuario
puede iniciar sesión y no ver funciones para las que no tiene autorización. Solicita al
administrador revisar **Administración → Permisos**.

## ¿Qué significa que una eliminación esté bloqueada?

La operación protegió la integridad de la base. Puede existir una venta, recepción,
movimiento o relación que impida eliminar el registro. Corrige o elimina primero las
relaciones permitidas y vuelve a intentar.

## ¿Cómo se registran recepciones de compra?

Crea una orden pendiente, confirma proveedor y productos y luego registra una recepción
completa o parcial. Las cantidades recibidas no deben superar las pendientes.

## ¿Cómo se corrige una ubicación GPS incorrecta?

Habilita ubicación de alta precisión en el navegador, espera una señal estable y pulsa
“Obtener ubicación” nuevamente. El sistema rechaza coordenadas fuera de rango, ubicaciones
desactualizadas y posiciones con precisión menor a 250 metros.

## ¿Qué debe hacer un usuario si el QR no se lee?

Usa buena iluminación, evita reflejos y acerca el código al marco. Si sigue fallando,
selecciona una imagen clara con el QR o introduce manualmente el código permitido.

## ¿Dónde consulto el estado de las pruebas?

Ejecuta `npm run test:unit` para las pruebas unitarias, `npm run test:e2e` para navegador,
`npm run lint` para análisis estático y `npm run build` para compilación.

## ¿Cómo agrego una mejora a la base de datos?

Agrega una migración nueva con timestamp único dentro de `supabase/migrations/`.
No edites migraciones históricas ya aplicadas. Aplica primero en pruebas y después en
producción, verificando RLS y funciones críticas.

## ¿Qué ocurre con los respaldos?

El workflow crea diariamente un respaldo PostgreSQL cifrado en GitHub Actions.
Los artefactos quedan disponibles 30 días. Nunca incluir la llave de cifrado ni la
conexión en el repositorio.

## ¿Cómo se restaura la información?

Sigue `docs/DISASTER_RECOVERY.md`. La restauración debe ejecutarse primero en una base
aislada, validar datos críticos y obtener aprobación antes de conmutar producción.

## ¿Puedo compartir exportaciones PDF o CSV?

Solo comparte datos con usuarios autorizados. Las exportaciones pueden contener
información financiera o personal y deben almacenarse con las mismas restricciones que
el ERP.

## ¿Dónde encuentro la documentación técnica?

- API: `docs/API.md`.
- Contrato OpenAPI: `docs/openapi.json`.
- Desarrollo: `docs/DEVELOPER_GUIDE.md`.
- Usuario: `docs/USER_GUIDE.md`.
- Recuperación: `docs/DISASTER_RECOVERY.md`.
- Mantenimiento: `MAINTENANCE_GUIDE.md`.

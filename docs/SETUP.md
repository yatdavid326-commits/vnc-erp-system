# 🚀 Instrucciones de Configuración - VNC Systems ERP

## 1. Configuración de Supabase

### Paso 1.1: Crear cuenta y proyecto en Supabase
1. Ir a https://supabase.com
2. Crear una cuenta o iniciar sesión
3. Crear un nuevo proyecto (Region: `us-east-1` o cercana)
4. Esperar a que se cree la base de datos (puede tomar 1-2 minutos)

### Paso 1.2: Obtener credenciales
1. En el panel de Supabase, ir a **Settings** → **API**
2. Copiar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### Paso 1.3: Ejecutar el schema SQL
1. En Supabase, ir a **SQL Editor**
2. Crear una nueva query
3. Copiar el contenido de `docs/SCHEMA.sql`
4. Ejecutar (Play button)
5. Esperar a que se creen todas las tablas

### Paso 1.4: Crear usuario administrador
1. En Supabase, ir a **Authentication** → **Users**
2. Hacer clic en **Create new user** (botón rojo)
3. Ingresar:
   - Email: `admin@vncsystems.com`
   - Password: `TempPassword123!` (cambiar después)
4. Crear usuario

### Paso 1.5: Crear perfil de usuario
1. Ir a **SQL Editor**
2. Ejecutar esta consulta:
```sql
INSERT INTO public.user_profiles (
  id, 
  email, 
  full_name, 
  role
) VALUES (
  '<USER_ID_DEL_ADMIN>', 
  'admin@vncsystems.com',
  'Administrador',
  'admin'
);
```
(Reemplazar `<USER_ID_DEL_ADMIN>` con el ID del usuario creado)

### Paso 1.6: Crear módulos
Ejecutar en SQL Editor:
```sql
INSERT INTO public.modules (name, display_name, description, route) VALUES
('dashboard', 'Panel de Control', 'Vista general del negocio', '/dashboard'),
('clients', 'Clientes', 'Gestión de clientes', '/clients'),
('inventory', 'Inventario', 'Gestión de productos', '/inventory'),
('suppliers', 'Proveedores', 'Base de proveedores', '/suppliers'),
('purchases', 'Compras', 'Órdenes de compra', '/purchases'),
('pos', 'Punto de Venta', 'Sistema de ventas', '/pos'),
('cash', 'Caja', 'Gestión de efectivo', '/cash'),
('reports', 'Reportes', 'Reportes del negocio', '/reports'),
('attendance', 'Asistencia', 'Control de asistencia', '/attendance'),
('employees', 'Empleados', 'Gestión de empleados', '/employees');
```

### Paso 1.7: Otorgar acceso al admin
Ejecutar en SQL Editor:
```sql
-- Primero obtener los IDs de módulos y usuario
-- Luego ejecutar:
INSERT INTO public.user_modules (user_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  up.id,
  m.id,
  true,
  true,
  true,
  true
FROM public.user_profiles up
CROSS JOIN public.modules m
WHERE up.email = 'admin@vncsystems.com'
AND m.active = true;
```

## 2. Configuración Local del Proyecto

### Paso 2.1: Configurar variables de entorno
1. Abrir `.env.local` en la raíz del proyecto
2. Rellenar con las credenciales de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NEXT_PUBLIC_BUSINESS_NAME=VNC Systems
NEXT_PUBLIC_CURRENCY=GTQ
NEXT_PUBLIC_CURRENCY_SYMBOL=Q
NEXT_PUBLIC_TIMEZONE=America/Guatemala
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Paso 2.2: Instalar dependencias
```bash
cd vnc-erp
npm install
```

### Paso 2.3: Iniciar servidor de desarrollo
```bash
npm run dev
```

Abrir http://localhost:3000

## 3. Pruebas Iniciales

### Paso 3.1: Login
1. Ir a http://localhost:3000/login
2. Usar:
   - Email: `admin@vncsystems.com`
   - Password: `TempPassword123!`
3. Deberías llegar al dashboard

### Paso 3.2: Cambiar contraseña
1. En la esquina superior derecha, hacer clic en el nombre del usuario
2. Ir a **Configuración**
3. Cambiar contraseña

## 4. Estructura del Proyecto

```
vnc-erp/
├── app/                    # Páginas Next.js
│   ├── login/             # Página de login
│   ├── dashboard/         # Dashboard principal
│   └── page.tsx           # Página de inicio
├── src/
│   ├── components/        # Componentes React
│   ├── lib/
│   │   ├── db/           # Configuración de Supabase
│   │   ├── types/        # Types TypeScript
│   │   ├── services/     # Servicios de API
│   │   └── utils/        # Funciones utilitarias
│   ├── hooks/            # Custom React hooks
│   └── middleware/       # Middleware
├── docs/
│   └── SCHEMA.sql        # Esquema de base de datos
└── package.json
```

## 5. Próximos Pasos

- [ ] Implementar módulo de Clientes
- [ ] Implementar módulo de Inventario
- [ ] Implementar módulo de Punto de Venta
- [ ] Implementar módulo de Asistencia con QR
- [ ] Implementar reportes
- [ ] Implementar caja
- [ ] Configurar en Vercel
- [ ] Personalizar branding
- [ ] Crear cuentas de usuarios adicionales
- [ ] Asignar permisos específicos a cada usuario

## 6. Troubleshooting

### Error: "NEXT_PUBLIC_SUPABASE_URL is not defined"
- Verificar que `.env.local` existe en la raíz del proyecto
- Reiniciar servidor: `npm run dev`

### Error: "Unauthorized" al hacer login
- Verificar credenciales de Supabase en `.env.local`
- Confirmar que el usuario fue creado en Supabase Auth
- Confirmar que el perfil de usuario existe en `user_profiles`

### Error de CORS
- Verificar que `NEXT_PUBLIC_APP_URL` es correcto
- En Supabase, ir a Settings → Authorization y agregar la URL

## 7. Seguridad

⚠️ **IMPORTANTE:**
- Nunca comprometer credenciales de Supabase
- Usar `SUPABASE_SERVICE_ROLE_KEY` solo en servidor (backend)
- Cambiar contraseña por defecto del admin
- Implementar MFA (Multi-Factor Authentication)
- Configurar Row Level Security (RLS) en base de datos

## 📞 Soporte

Para problemas o preguntas, consultar:
- Documentación de Supabase: https://supabase.com/docs
- Documentación de Next.js: https://nextjs.org/docs
- Documentación de Tailwind CSS: https://tailwindcss.com/docs

# VNC Systems ERP

Sistema de Gestión Empresarial (ERP) completo para VNC Systems con soporte para múltiples módulos y usuarios.

**Moneda:** GTQ (Quetzal Guatemalteco)

## 🚀 Acceso Rápido

### 🌐 Producción (Vercel)
**URL:** https://vnc-erp-system-qnng0wu5b-yatdavid326-commits-projects.vercel.app

**Credenciales de Demo:**
- Usuario: `admin`
- Contraseña: usa una credencial privada; no la publiques.

### 💻 Desarrollo Local
```bash
npm install
npm run dev
```
Visitar `http://localhost:3000`

## 🏗️ Stack Tecnológico

- **Frontend:** Next.js 16.4 + React 19 + TypeScript
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth (Username-based)
- **Hosting:** Vercel
- **Estilos:** Tailwind CSS 4.3
- **Estado Global:** Zustand
- **Formularios:** React Hook Form + Zod
- **QR:** html5-qrcode
- **Geolocalización:** Geolocation API

## 📦 Módulos del Sistema

1. **Dashboard** - Panel de control con KPIs y resumen
2. **Clientes** - Gestión de clientes y control de crédito
3. **Inventario** - Productos, categorías y control de stock
4. **Proveedores** - Base de proveedores y contactos
5. **Compras/Recibos** - Órdenes de compra y recepción; búsqueda por número y filtro por estado.
6. **Punto de Venta** - Sistema de venta rápida y efectivo
7. **Caja** - Flujo de efectivo y movimientos
8. **Asistencia** - Check-in con QR y geolocalización GPS
9. **Empleados** - Gestión de usuarios y asignación de módulos
10. **Reportes** - Análisis completo y KPIs del negocio

## 🔐 Seguridad

- Autenticación con Supabase Auth
- Control de acceso por módulo (RBAC)
- Row Level Security (RLS) en PostgreSQL
- Auditoría de acciones en base de datos
- Variables de entorno protegidas
- Permisos granulares por usuario

## 📱 Características Principales

### Autenticación
- Login con nombre de usuario (no correo)
- Contraseñas seguras con hash
- Sesiones persistentes
- Recuperación de contraseña

### Control de Acceso
- Permisos por módulo (ver, crear, editar, eliminar)
- Asignación flexible de módulos a usuarios
- Panel de administración de empleados

### Asistencia con Geolocalización
- Check-in/Check-out con escaneo QR
- Captura de geolocalización (GPS)
- Fotos de evidencia
- Historial completo de asistencia

### Sistema de Punto de Venta
- Transacciones rápidas
- Cálculo automático de descuentos
- Integración con inventario
- Métodos de pago múltiples

## 🗄️ Base de Datos

### Tablas Principales
- `user_profiles` - Perfiles de usuarios
- `modules` - Módulos del sistema
- `user_modules` - Asignación de módulos a usuarios
- `employees` - Datos de empleados
- `attendance` - Registros de asistencia con QR
- `customers` - Base de clientes
- `inventory` - Productos y stock
- `suppliers` - Base de proveedores
- `purchases` - Órdenes de compra
- `pos_transactions` - Transacciones POS
- `cash_register` - Movimientos de caja

## 📊 Despliegue

### Vercel
El proyecto está configurado para auto-deployarse desde GitHub:
1. Push a `master` → Vercel deploya automáticamente
2. Variables de entorno configuradas en Vercel
3. Certificado HTTPS automático

### Variables de Entorno Requeridas
```
NEXT_PUBLIC_SUPABASE_URL=[Tu URL de Supabase]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Tu llave anon de Supabase]
SUPABASE_SERVICE_ROLE_KEY=[Tu llave de service role]
```

Configura estas variables en Vercel usando el dashboard o archivo `.env.local` para desarrollo.

## 🔗 Enlaces

- **GitHub:** https://github.com/yatdavid326-commits/vnc-erp-system
- **Vercel Dashboard:** https://vercel.com/yatdavid326-commits-projects/vnc-erp-system
- **Supabase Project:** https://supabase.com/dashboard/project/jgsqzyffphikexmjnnak

## 📝 Historial de Versión

### v1.0.0 - Initial Release
- ✅ Autenticación con Supabase
- ✅ Dashboard funcional
- ✅ Estructura de módulos
- ✅ Base de datos completa
- ✅ Deployado en Vercel
- ✅ GitHub conectado con auto-deploy

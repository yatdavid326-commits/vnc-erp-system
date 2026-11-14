# 🚀 INICIO RÁPIDO - VNC Systems ERP

## ⚡ 5 PASOS PARA EMPEZAR

### 1️⃣ CONFIGURAR SUPABASE (5 minutos)

```bash
# Ir a https://supabase.com
# Crear cuenta → Crear Proyecto → Obtener credenciales

# En la carpeta del proyecto, editar .env.local:
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 2️⃣ CREAR BASE DE DATOS (2 minutos)

En Supabase SQL Editor, copiar y ejecutar:
```
docs/SCHEMA.sql
```

### 3️⃣ CREAR USUARIO ADMIN (1 minuto)

En Supabase:
1. Authentication → Users → Create new user
2. Email: `admin@vncsystems.com`
3. Password: `TempPassword123!`

Luego en SQL Editor:
```sql
INSERT INTO public.user_profiles (
  id, email, full_name, role
) VALUES (
  '<USER_ID>', 'admin@vncsystems.com', 'Administrador', 'admin'
);
```

### 4️⃣ CREAR MÓDULOS (1 minuto)

En SQL Editor:
```sql
INSERT INTO public.modules (name, display_name, route) VALUES
('dashboard', 'Panel de Control', '/dashboard'),
('clients', 'Clientes', '/clients'),
('inventory', 'Inventario', '/inventory'),
('suppliers', 'Proveedores', '/suppliers'),
('purchases', 'Compras', '/purchases'),
('pos', 'Punto de Venta', '/pos'),
('cash', 'Caja', '/cash'),
('reports', 'Reportes', '/reports'),
('attendance', 'Asistencia', '/attendance'),
('employees', 'Empleados', '/employees');
```

Luego otorgar acceso:
```sql
INSERT INTO public.user_modules (user_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT up.id, m.id, true, true, true, true
FROM public.user_profiles up
CROSS JOIN public.modules m
WHERE up.email = 'admin@vncsystems.com' AND m.active = true;
```

### 5️⃣ EJECUTAR PROYECTO (1 minuto)

```bash
npm install    # (ya hecho)
npm run dev
```

Abrir: http://localhost:3000

## 🔐 LOGIN

- **Email:** `admin@vncsystems.com`
- **Contraseña:** `TempPassword123!`

## 📊 ¿QUÉ VAS A VER?

✅ Dashboard con estadísticas
✅ Sidebar con menú de módulos
✅ Panel de usuario en esquina superior derecha
✅ Estructura lista para agregar módulos

## 📱 PRÓXIMAS MÓDULOS A IMPLEMENTAR

1. **Clientes** - Agregar, editar, eliminar clientes
2. **Inventario** - Gestión de productos y stock
3. **Punto de Venta** - Sistema de ventas
4. **Asistencia** - Check-in con QR y GPS
5. **Reportes** - Análisis del negocio
6. **Y más...**

## ⚙️ CAMBIAR CONTRASEÑA

Después del primer login:
1. Esquina superior derecha → Tu nombre
2. Configuración
3. Cambiar contraseña

## 🆘 PROBLEMAS COMUNES

| Problema | Solución |
|----------|----------|
| Error: "SUPABASE_URL is not defined" | Completar .env.local y reiniciar con npm run dev |
| Error: "Unauthorized" en login | Verificar que usuario existe en Supabase Auth |
| Error de CORS | Verificar que la URL del proyecto está en Supabase settings |
| Base de datos vacía | Ejecutar SCHEMA.sql en SQL Editor de Supabase |

## 📚 DOCUMENTACIÓN COMPLETA

- **ESTRUCTURA.md** - Estructura del proyecto
- **SCHEMA.sql** - Esquema de base de datos
- **SETUP.md** - Configuración detallada

## 🎯 ARQUITECTURA

```
Cliente (Browser)
    ↓
Next.js (Frontend)
    ↓
Supabase (Backend + BD)
```

**Tech Stack:**
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + Realtime)
- Hosting: Vercel
- Estado: Zustand

## 🌟 CARACTERÍSTICAS

✨ **Multi-módulo:** 10 módulos independientes
✨ **Control de permisos:** Por módulo y usuario
✨ **Autenticación:** Con Supabase Auth
✨ **Base de datos:** PostgreSQL con RLS
✨ **Interfaz moderna:** Tailwind CSS + Lucide Icons
✨ **TypeScript:** Código type-safe
✨ **Escalable:** Fácil de expandir

## 📞 ¿NECESITAS AYUDA?

Consulta:
- Docs en `/docs`
- README.md
- Código de componentes en `/src`

---

**¡Ya estás listo para empezar! 🎉**

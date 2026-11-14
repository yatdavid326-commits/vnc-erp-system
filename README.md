# VNC Systems ERP

Sistema de Gestión Empresarial (ERP) completo para VNC Systems con soporte para múltiples módulos y usuarios.

**Moneda:** GTQ (Quetzal Guatemalteco)

## 🏗️ Stack Tecnológico

- **Frontend:** Next.js 16.4 + React 19 + TypeScript
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Hosting:** Vercel
- **Estilos:** Tailwind CSS 4.3
- **Estado Global:** Zustand
- **Formularios:** React Hook Form + Zod
- **QR:** html5-qrcode
- **Geolocalización:** Geolocation API

## 📦 Módulos del Sistema

1. **Dashboard** - Panel de control con KPIs
2. **Clientes** - Gestión de clientes y crédito
3. **Inventario** - Productos, categorías, stock
4. **Proveedores** - Base de proveedores
5. **Compras/Recibos** - Órdenes de compra
6. **Punto de Venta** - Sistema de venta rápida
7. **Caja** - Flujo de efectivo
8. **Asistencia** - Check-in con QR y GPS
9. **Empleados** - Gestión de usuarios y permisos
10. **Reportes** - Análisis completo del negocio

## 🚀 Instalación

```bash
npm install
npm run dev
```

Visitar `http://localhost:3000`

## 🔐 Seguridad

- Autenticación con Supabase Auth
- Control de permisos por módulo
- Row Level Security (RLS)
- Auditoría de acciones

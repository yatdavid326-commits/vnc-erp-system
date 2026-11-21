# INSTRUCCIONES PARA DESHABILITAR RLS EN VNC SYSTEMS ERP

## Problema
El sistema no puede acceder a los datos de la base de datos debido a que Row Level Security (RLS) está habilitado en todas las tablas.

## Solución
Debes ejecutar comandos SQL en Supabase para deshabilitar RLS. Sigue estos pasos:

### Paso 1: Ir a Supabase Dashboard
1. Abre tu navegador
2. Ve a https://supabase.com/dashboard
3. Si es necesario, inicia sesión con tu cuenta

### Paso 2: Seleccionar el Proyecto
1. En el panel izquierdo, busca y selecciona el proyecto **"vnc-systems-erp"** (ID: jgsqzyffphikexmjnnak)

### Paso 3: Abrir SQL Editor
1. En el menú izquierdo, haz clic en **"SQL Editor"**
2. Verás una lista de queries previas
3. Haz clic en el botón **"+ New Query"** (arriba a la derecha) para crear una nueva query

### Paso 4: Copiar los Comandos SQL
Copia TODOS los siguientes comandos SQL:

```sql
-- Deshabilitar RLS en todas las tablas del VNC Systems ERP
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
```

### Paso 5: Pegar en SQL Editor
1. En la nueva query, coloca el cursor en el editor de texto
2. Pega los comandos SQL que copiaste

### Paso 6: Ejecutar
1. Haz clic en el botón **"Run"** (botón verde en la parte superior derecha)
   O simplemente presiona **Ctrl+Enter**

### Paso 7: Verificar
Si todo fue exitoso, verás un mensaje que dice "Command executed successfully" o similar.

## Verificación
Una vez ejecutados los comandos, puedes verificar que RLS fue deshabilitado:
1. Ve a la tabla "Columnas" en Supabase
2. Selecciona cualquiera de las 17 tablas
3. En la esquina superior derecha, deberías ver un icono que indica "RLS Disabled"

## Acceso al Sistema
Una vez que RLS esté deshabilitado:
1. El sistema ERP debería cargar correctamente en https://vnc-erp-system-qnng0wu5b-yatdavid326-commits-projects.vercel.app
2. Usa una credencial privada para iniciar sesión.

## Solución de Problemas

### Si aparece error "permission denied"
- Asegúrate de estar usando el proyecto correcto
- Verifica que copistes todo el SQL correctamente

### Si no puedes hacerclic en "Run"
- Intenta hacer clic en otra parte del editor primero para asegurar que el foco esté en la ventana
- Presiona Ctrl+Enter en lugar de hacer clic
- Si sigue sin funcionar, recarga la página (Ctrl+R o F5)

### Si aparece error "table does not exist"
- Algunos comandos pueden ejecutarse pero otros fallar si la tabla no existe
- Esto es normal. El SQL ejecutará todos los comandos y algunos pueden fallar silenciosamente

## Próximos Pasos
Después de deshabilitar RLS:
1. El dashboard del ERP debería mostrar correctamente
2. Puedes navegar por los módulos (Clientes, Inventario, etc.)
3. Se recomienda crear más usuarios y asignarles permisos específicos en Empleados

---

**Contacto:** Si hay problemas, consulta la documentación en `/docs/DEPLOYMENT_INFO.md`

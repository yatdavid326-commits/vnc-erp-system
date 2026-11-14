-- VNC Systems ERP - Schema Base de Datos Supabase
-- Moneda: GTQ (Quetzal Guatemalteco)

-- ============================================
-- TABLAS DE USUARIO Y AUTENTICACIÓN
-- ============================================

-- Tabla de perfiles de usuarios
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- admin, manager, employee, viewer
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de módulos disponibles
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- dashboard, clients, inventory, suppliers, purchases, pos, cash, reports, attendance, employees
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  route TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de permisos de usuario por módulo
CREATE TABLE public.user_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- ============================================
-- MODULO: EMPLEADOS Y ASISTENCIA
-- ============================================

-- Tabla de empleados
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  position TEXT NOT NULL,
  department TEXT,
  hire_date DATE NOT NULL,
  salary DECIMAL(12, 2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asistencia con geolocalización
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  latitude_in DECIMAL(10, 8),
  longitude_in DECIMAL(11, 8),
  latitude_out DECIMAL(10, 8),
  longitude_out DECIMAL(11, 8),
  qr_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MODULO: CLIENTES
-- ============================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Guatemala',
  customer_type TEXT, -- retail, wholesale, business
  credit_limit DECIMAL(12, 2) DEFAULT 0,
  current_balance DECIMAL(12, 2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MODULO: PROVEEDORES
-- ============================================

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Guatemala',
  payment_terms TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MODULO: INVENTARIO
-- ============================================

-- Categorías de productos
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Productos/Inventario
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES public.product_categories(id),
  unit_cost DECIMAL(12, 2) NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  minimum_stock INT DEFAULT 10,
  supplier_id UUID REFERENCES public.suppliers(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movimientos de inventario
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  movement_type TEXT NOT NULL, -- entry, exit, adjustment, return
  quantity INT NOT NULL,
  reference_id UUID, -- ID de compra o venta relacionada
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MODULO: COMPRAS Y RECIBOS
-- ============================================

-- Órdenes de compra
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  order_date DATE NOT NULL,
  expected_delivery DATE,
  status TEXT DEFAULT 'pending', -- pending, received, partial, cancelled
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detalle de compras
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MODULO: PUNTO DE VENTA (POS)
-- ============================================

-- Transacciones de venta
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL, -- cash, card, transfer, credit
  status TEXT DEFAULT 'completed', -- completed, pending, cancelled
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detalle de ventas
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MODULO: CAJA / FLUJO DE EFECTIVO
-- ============================================

-- Registros de caja
CREATE TABLE public.cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES public.user_profiles(id),
  opening_balance DECIMAL(12, 2) NOT NULL,
  closing_balance DECIMAL(12, 2),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'open', -- open, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movimientos de caja
CREATE TABLE public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES public.cash_register(id),
  movement_type TEXT NOT NULL, -- deposit, withdrawal, sale, expense
  amount DECIMAL(12, 2) NOT NULL,
  reference_id UUID, -- ID de venta o gasto relacionado
  description TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MODULO: REPORTES Y AUDITORÍA
-- ============================================

-- Log de auditoría
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

CREATE INDEX idx_attendance_employee ON public.attendance(employee_id);
CREATE INDEX idx_attendance_date ON public.attendance(created_at);
CREATE INDEX idx_sales_customer ON public.sales(customer_id);
CREATE INDEX idx_sales_date ON public.sales(sale_date);
CREATE INDEX idx_purchase_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_inventory_product ON public.inventory_movements(product_id);
CREATE INDEX idx_cash_movements_register ON public.cash_movements(cash_register_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);

-- ============================================
-- PERMISOS Y SEGURIDAD
-- ============================================

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios solo vean su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id OR (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

-- Política para empleados
CREATE POLICY "Employees accessible by permission"
  ON public.employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_modules um
      JOIN public.modules m ON um.module_id = m.id
      WHERE um.user_id = auth.uid() AND m.name = 'employees' AND um.can_view = true
    )
  );

-- Política para asistencia
CREATE POLICY "Attendance accessible by permission"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_modules um
      JOIN public.modules m ON um.module_id = m.id
      WHERE um.user_id = auth.uid() AND m.name = 'attendance' AND um.can_view = true
    )
  );

-- Política para ventas
CREATE POLICY "Sales accessible by permission"
  ON public.sales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_modules um
      JOIN public.modules m ON um.module_id = m.id
      WHERE um.user_id = auth.uid() AND m.name = 'pos' AND um.can_view = true
    )
  );

-- Política para clientes
CREATE POLICY "Customers accessible by permission"
  ON public.customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_modules um
      JOIN public.modules m ON um.module_id = m.id
      WHERE um.user_id = auth.uid() AND m.name = 'clients' AND um.can_view = true
    )
  );

-- Política para productos
CREATE POLICY "Products accessible by permission"
  ON public.products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_modules um
      JOIN public.modules m ON um.module_id = m.id
      WHERE um.user_id = auth.uid() AND m.name = 'inventory' AND um.can_view = true
    )
  );

-- Política para auditoría (solo admins)
CREATE POLICY "Audit logs only for admins"
  ON public.audit_logs FOR SELECT
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

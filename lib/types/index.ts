// Tipos principales del sistema ERP

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'employee' | 'viewer';
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  route?: string;
  active: boolean;
  created_at: string;
}

export interface UserModule {
  id: string;
  user_id: string;
  module_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  assigned_at: string;
}

export interface Employee {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  position: string;
  department?: string;
  hire_date: string;
  salary?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  check_in?: string;
  check_out?: string;
  latitude_in?: number;
  longitude_in?: number;
  latitude_out?: number;
  longitude_out?: number;
  qr_code?: string;
  notes?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  customer_type?: 'retail' | 'wholesale' | 'business';
  credit_limit: number;
  current_balance: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  payment_terms?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id: string;
  unit_cost: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  supplier_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id?: string;
  sale_date: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'credit';
  status: 'completed' | 'pending' | 'cancelled';
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface CashRegister {
  id: string;
  cashier_id: string;
  opening_balance: number;
  closing_balance?: number;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'closed';
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery?: string;
  status: 'pending' | 'received' | 'partial' | 'cancelled';
  total_amount: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Tipos para paginación
export interface PaginationParams {
  page: number;
  pageSize: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

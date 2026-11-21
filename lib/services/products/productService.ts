import { supabaseAdmin } from '@/lib/db/supabase';

export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  costo_unitario: number;
  precio_venta: number;
  cantidad_stock: number;
  cantidad_reservada: number;
  stock_minimo: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductRow {
  id: string;
  product_code: string;
  name: string;
  description: string | null;
  cost_price: number | string | null;
  selling_price: number | string;
  reorder_level: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories: { name: string } | { name: string }[] | null;
  inventory:
    | { quantity_on_hand: number | null; quantity_reserved: number | null }
    | { quantity_on_hand: number | null; quantity_reserved: number | null }[]
    | null;
}

const productFields =
  'id, product_code, name, description, cost_price, selling_price, reorder_level, is_active, created_at, updated_at, categories(name), inventory(quantity_on_hand, quantity_reserved)';

function getSupabaseAdmin() {
  if (!supabaseAdmin) throw new Error('Supabase admin client not available');
  return supabaseAdmin;
}

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function productToProducto(row: ProductRow): Producto {
  const category = firstRelation(row.categories);
  const inventory = firstRelation(row.inventory);
  return {
    id: row.id,
    sku: row.product_code,
    nombre: row.name,
    descripcion: row.description ?? '',
    categoria: category?.name ?? '',
    costo_unitario: Number(row.cost_price ?? 0),
    precio_venta: Number(row.selling_price),
    cantidad_stock: inventory?.quantity_on_hand ?? 0,
    cantidad_reservada: inventory?.quantity_reserved ?? 0,
    stock_minimo: row.reorder_level ?? 0,
    activo: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getCategoryId(categoryName: string) {
  const name = categoryName.trim();
  const { data, error } = await getSupabaseAdmin()
    .from('categories')
    .upsert({ name }, { onConflict: 'name' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

class ProductService {
  private static instance: ProductService;

  private constructor() {}

  static getInstance(): ProductService {
    if (!ProductService.instance) ProductService.instance = new ProductService();
    return ProductService.instance;
  }

  async getAll(page = 1, limit = 10, search = '', category = '') {
    const supabase = getSupabaseAdmin();
    const fields = category
      ? 'id, product_code, name, description, cost_price, selling_price, reorder_level, is_active, created_at, updated_at, categories!inner(name), inventory(quantity_on_hand, quantity_reserved)'
      : productFields;
    let query = supabase.from('products').select(fields, { count: 'exact' });

    if (search.trim()) {
      const safeSearch = search.replace(/[%,_*()\\"]/g, ' ').trim();
      query = query.or(
        `name.ilike.%${safeSearch}%,product_code.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`
      );
    }

    if (category) query = query.eq('categories.name', category);

    const start = (page - 1) * limit;
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(start, start + limit - 1);
    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    return {
      data: (data ?? []).map((row) => productToProducto(row as ProductRow)),
      total: count ?? 0,
      page,
      limit,
    };
  }

  async getById(id: string): Promise<Producto | null> {
    const { data, error } = await getSupabaseAdmin()
      .from('products')
      .select(productFields)
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
    return data ? productToProducto(data as ProductRow) : null;
  }

  async create(producto: Partial<Producto>): Promise<Producto> {
    if (!producto.nombre?.trim() || !producto.sku?.trim() || !producto.categoria?.trim()) {
      throw new Error('Name, SKU, and category are required');
    }

    try {
      const supabase = getSupabaseAdmin();
      const categoryId = await getCategoryId(producto.categoria);
      const { data, error } = await supabase
        .from('products')
        .insert({
          product_code: producto.sku.trim(),
          name: producto.nombre.trim(),
          description: producto.descripcion || null,
          category_id: categoryId,
          cost_price: producto.costo_unitario ?? 0,
          selling_price: producto.precio_venta,
          reorder_level: producto.stock_minimo ?? 0,
          is_active: true,
        })
        .select(productFields)
        .single();
      if (error) throw error;
      return productToProducto(data as ProductRow);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async update(id: string, producto: Partial<Producto>): Promise<Producto> {
    try {
      const updateData: Record<string, string | number | boolean | null> = {};
      if (producto.nombre !== undefined) updateData.name = producto.nombre.trim();
      if (producto.sku !== undefined) updateData.product_code = producto.sku.trim();
      if (producto.descripcion !== undefined) updateData.description = producto.descripcion || null;
      if (producto.categoria !== undefined) {
        updateData.category_id = await getCategoryId(producto.categoria);
      }
      if (producto.costo_unitario !== undefined) updateData.cost_price = producto.costo_unitario;
      if (producto.precio_venta !== undefined) updateData.selling_price = producto.precio_venta;
      if (producto.stock_minimo !== undefined) updateData.reorder_level = producto.stock_minimo;
      if (producto.activo !== undefined) updateData.is_active = producto.activo;

      const { data, error } = await getSupabaseAdmin()
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select(productFields)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Product not found');
      return productToProducto(data as ProductRow);
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabaseAdmin().from('products').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }

  async search(query: string, limit = 10): Promise<Producto[]> {
    const result = await this.getAll(1, limit, query);
    return result.data.filter((product) => product.activo);
  }

  async getLowStockProducts(): Promise<Producto[]> {
    const result = await this.getAll(1, 1000);
    return result.data.filter((product) => product.activo && product.cantidad_stock <= product.stock_minimo);
  }

  async getByCategory(category: string): Promise<Producto[]> {
    const result = await this.getAll(1, 1000, '', category);
    return result.data.filter((product) => product.activo);
  }
}

export const productService = ProductService.getInstance();

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
  stock_minimo: number;
  proveedor_id?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  minimum_stock: number;
  supplier_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

class ProductService {
  private static instance: ProductService;

  private constructor() {}

  static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  private productoToProduct(producto: Producto): Product {
    return {
      id: producto.id,
      sku: producto.sku,
      name: producto.nombre,
      description: producto.descripcion,
      category: producto.categoria,
      cost_price: producto.costo_unitario,
      sale_price: producto.precio_venta,
      stock_quantity: producto.cantidad_stock,
      minimum_stock: producto.stock_minimo,
      supplier_id: producto.proveedor_id,
      active: producto.activo,
      created_at: producto.created_at,
      updated_at: producto.updated_at,
    };
  }

  private productToProducto(product: Product): Producto {
    return {
      id: product.id,
      sku: product.sku,
      nombre: product.name,
      descripcion: product.description,
      categoria: product.category,
      costo_unitario: product.cost_price,
      precio_venta: product.sale_price,
      cantidad_stock: product.stock_quantity,
      stock_minimo: product.minimum_stock,
      proveedor_id: product.supplier_id,
      activo: product.active,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  async getAll(page = 1, limit = 10, search = '', category = '') {
    try {
      const supabase = supabaseAdmin;
      if (!supabase) throw new Error('Supabase admin client not available');

      let query = supabase.from('products').select('*', { count: 'exact' });

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      if (category) {
        query = query.eq('category', category);
      }

      const offset = (page - 1) * limit;
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data?.map(p => this.productToProducto(p)) || [],
        total: count || 0,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Producto | null> {
    try {
      const supabase = supabaseAdmin;
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data ? this.productToProducto(data) : null;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  }

  async create(producto: Partial<Producto>): Promise<Producto> {
    try {
      if (!producto.nombre || !producto.sku) {
        throw new Error('Name and SKU are required');
      }

      const supabase = supabaseAdmin;
      if (!supabase) throw new Error('Supabase admin client not available');

      const newProduct: Partial<Product> = {
        sku: producto.sku,
        name: producto.nombre,
        description: producto.descripcion,
        category: producto.categoria,
        cost_price: producto.costo_unitario || 0,
        sale_price: producto.precio_venta || 0,
        stock_quantity: producto.cantidad_stock || 0,
        minimum_stock: producto.stock_minimo || 0,
        supplier_id: producto.proveedor_id,
        active: true,
      };

      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Product creation returned no data');

      return this.productToProducto(data);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async update(id: string, producto: Partial<Producto>): Promise<Producto> {
    try {
      const supabase = supabaseAdmin;
      if (!supabase) throw new Error('Supabase admin client not available');

      const updateData: Partial<Product> = {};
      if (producto.nombre !== undefined) updateData.name = producto.nombre;
      if (producto.sku !== undefined) updateData.sku = producto.sku;
      if (producto.descripcion !== undefined) updateData.description = producto.descripcion;
      if (producto.categoria !== undefined) updateData.category = producto.categoria;
      if (producto.costo_unitario !== undefined) updateData.cost_price = producto.costo_unitario;
      if (producto.precio_venta !== undefined) updateData.sale_price = producto.precio_venta;
      if (producto.cantidad_stock !== undefined) updateData.stock_quantity = producto.cantidad_stock;
      if (producto.stock_minimo !== undefined) updateData.minimum_stock = producto.stock_minimo;
      if (producto.proveedor_id !== undefined) updateData.supplier_id = producto.proveedor_id;
      if (producto.activo !== undefined) updateData.active = producto.activo;

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Product update returned no data');

      return this.productToProducto(data);
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const supabase = supabaseAdmin;
      if (!supabase) throw new Error('Supabase admin client not available');

      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }

  async search(query: string, limit = 10): Promise<Producto[]> {
    try {
      const supabase = supabaseAdmin;
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(
          `name.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%`
        )
        .eq('active', true)
        .limit(limit);

      if (error) throw error;
      return data?.map(p => this.productToProducto(p)) || [];
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  async updateStock(id: string, quantity: number): Promise<void> {
    try {
      const supabase = supabaseAdmin;
      if (!supabase) throw new Error('Supabase admin client not available');

      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: quantity })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error updating stock for product ${id}:`, error);
      throw error;
    }
  }

  async getLowStockProducts(): Promise<Producto[]> {
    try {
      const supabase = supabaseAdmin;
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .filter('stock_quantity', 'lt', 'minimum_stock')
        .eq('active', true);

      if (error) throw error;
      return data?.map(p => this.productToProducto(p)) || [];
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      throw error;
    }
  }

  async getByCategory(category: string): Promise<Producto[]> {
    try {
      const supabase = supabaseAdmin;
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data?.map(p => this.productToProducto(p)) || [];
    } catch (error) {
      console.error(`Error fetching products by category ${category}:`, error);
      throw error;
    }
  }
}

export const productService = ProductService.getInstance();


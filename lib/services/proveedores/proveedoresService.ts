import { createAdminClient } from '@/lib/db/supabase';

export interface Proveedor {
  id: string;
  nombre: string;
  persona_contacto: string;
  email: string;
  teléfono: string;
  dirección: string;
  ciudad: string;
  estado: string;
  país: string;
  términos_pago: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface SupplierDB {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  payment_terms: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

class ProveedoresService {
  private static instance: ProveedoresService;

  private constructor() {}

  static getInstance(): ProveedoresService {
    if (!ProveedoresService.instance) {
      ProveedoresService.instance = new ProveedoresService();
    }
    return ProveedoresService.instance;
  }

  private mapDBToUI(supplier: SupplierDB): Proveedor {
    return {
      id: supplier.id,
      nombre: supplier.name,
      persona_contacto: supplier.contact_person,
      email: supplier.email,
      teléfono: supplier.phone,
      dirección: supplier.address,
      ciudad: supplier.city,
      estado: supplier.state,
      país: supplier.country,
      términos_pago: supplier.payment_terms,
      activo: supplier.active,
      created_at: supplier.created_at,
      updated_at: supplier.updated_at,
    };
  }

  private mapUIToDB(proveedor: Partial<Proveedor>): Partial<SupplierDB> {
    return {
      name: proveedor.nombre,
      contact_person: proveedor.persona_contacto,
      email: proveedor.email,
      phone: proveedor.teléfono,
      address: proveedor.dirección,
      city: proveedor.ciudad,
      state: proveedor.estado,
      country: proveedor.país,
      payment_terms: proveedor.términos_pago,
      active: proveedor.activo,
    };
  }

  async getAll(page = 1, limit = 50) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data ? data.map(s => this.mapDBToUI(s as SupplierDB)) : [],
        count: count || 0,
        error: null,
      };
    } catch (error) {
      console.error('ProveedoresService.getAll error:', error);
      return {
        data: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async search(query: string, limit = 50) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;

      return data ? data.map(s => this.mapDBToUI(s as SupplierDB)) : [];
    } catch (error) {
      console.error('ProveedoresService.search error:', error);
      return [];
    }
  }

  async getById(id: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as SupplierDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('ProveedoresService.getById error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async create(proveedor: Omit<Proveedor, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const dbData = this.mapUIToDB(proveedor);

      const { data, error } = await supabase
        .from('suppliers')
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as SupplierDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('ProveedoresService.create error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async update(id: string, proveedor: Partial<Proveedor>) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const dbData = this.mapUIToDB(proveedor);

      const { data, error } = await supabase
        .from('suppliers')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data ? this.mapDBToUI(data as SupplierDB) : null,
        error: null,
      };
    } catch (error) {
      console.error('ProveedoresService.update error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async delete(id: string) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('ProveedoresService.delete error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getByCountry(country: string, page = 1, limit = 50) {
    try {
      const supabase = createAdminClient();
      if (!supabase) throw new Error('Supabase admin client not available');

      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact' })
        .eq('country', country)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data ? data.map(s => this.mapDBToUI(s as SupplierDB)) : [],
        count: count || 0,
        error: null,
      };
    } catch (error) {
      console.error('ProveedoresService.getByCountry error:', error);
      return {
        data: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const proveedoresService = ProveedoresService.getInstance();

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    if (!supabaseAdmin) throw new Error('Server error');

    let query = supabaseAdmin.from('products').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return NextResponse.json(data || [], {
      headers: {
        'X-Total-Count': (count || 0).toString(),
      },
    });
  } catch (error) {
    console.error('GET /api/inventario error:', error);
    return NextResponse.json(
      { error: 'Error fetching inventory' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.sku || !body.name) {
      return NextResponse.json(
        { error: 'sku and name are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) throw new Error('Server error');

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([{
        sku: body.sku,
        name: body.name,
        description: body.description,
        category: body.category,
        cost_per_unit: body.costo_unitario || 0,
        sales_price: body.precio_venta || 0,
        quantity_stock: body.cantidad_stock || 0,
        stock_minimum: body.stock_minimo || 0,
        supplier_id: body.proveedor_id,
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/inventario error:', error);
    return NextResponse.json(
      { error: 'Error creating product' },
      { status: 500 }
    );
  }
}

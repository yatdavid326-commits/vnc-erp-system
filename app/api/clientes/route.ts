import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/lib/services/customers/customerService';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');
    const type = searchParams.get('type');

    if (search) {
      const results = await customerService.search(search, limit);
      return NextResponse.json(results);
    }

    if (type) {
      const { data, error } = await customerService.getCustomersByType(
        type as 'retail' | 'wholesale' | 'business',
        page,
        limit
      );
      if (error) throw error;
      return NextResponse.json(data);
    }

    const { data, error, count } = await customerService.getAll(page, limit);
    if (error) throw error;
    
    return NextResponse.json(data, {
      headers: {
        'X-Total-Count': count.toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString(),
      },
    });
  } catch (error) {
    console.error('GET /api/clientes error:', error);
    return NextResponse.json(
      { error: 'Error fetching clients', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.nombre || !body.email) {
      return NextResponse.json(
        { error: 'nombre and email are required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const customerData = {
      name: body.nombre,
      email: body.email,
      phone: body.telefono || '',
      address: body.direccion || '',
      city: body.ciudad || '',
      country: 'Guatemala',
      customer_type: body.tipo || 'retail',
      credit_limit: body.limite_credito || 0,
      current_balance: body.saldo_actual || 0,
      active: body.estado_cliente !== 'inactivo' && body.estado_cliente !== 'suspendido',
    };

    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert([customerData])
      .select()
      .single();

    if (error) throw error;

    // Transform back to UI format
    const cliente = {
      id: data.id,
      nombre: data.name,
      email: data.email,
      telefono: data.phone,
      direccion: data.address,
      ciudad: data.city,
      estado: data.country,
      codigo_postal: '',
      tipo: data.customer_type,
      limite_credito: data.credit_limit,
      saldo_actual: data.current_balance,
      estado_cliente: data.active ? 'activo' : 'inactivo',
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error('POST /api/clientes error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error creating client', details: errorMessage },
      { status: 500 }
    );
  }
}

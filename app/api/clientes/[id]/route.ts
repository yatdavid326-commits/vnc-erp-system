import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Cliente not found' },
        { status: 404 }
      );
    }

    // Transform to UI format
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

    return NextResponse.json(cliente);
  } catch (error) {
    console.error('GET /api/clientes/[id] error:', error);
    return NextResponse.json(
      { error: 'Error fetching client', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const updateData: any = {};
    if (body.nombre) updateData.name = body.nombre;
    if (body.email) updateData.email = body.email;
    if (body.telefono !== undefined) updateData.phone = body.telefono;
    if (body.direccion !== undefined) updateData.address = body.direccion;
    if (body.ciudad !== undefined) updateData.city = body.ciudad;
    if (body.tipo) updateData.customer_type = body.tipo;
    if (body.limite_credito !== undefined) updateData.credit_limit = body.limite_credito;
    if (body.saldo_actual !== undefined) updateData.current_balance = body.saldo_actual;
    if (body.estado_cliente) updateData.active = body.estado_cliente === 'activo';

    const { data, error } = await supabaseAdmin
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 400 }
      );
    }

    // Transform to UI format
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

    return NextResponse.json(cliente);
  } catch (error) {
    console.error('PUT /api/clientes/[id] error:', error);
    return NextResponse.json(
      { error: 'Error updating client', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('DELETE /api/clientes/[id] error:', error);
    return NextResponse.json(
      { error: 'Error deleting client', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

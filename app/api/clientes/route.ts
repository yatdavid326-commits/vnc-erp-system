import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/lib/services/customers/customerService';

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

    const cliente = await customerService.create({
      nombre: body.nombre,
      email: body.email,
      telefono: body.telefono,
      direccion: body.direccion,
      ciudad: body.ciudad,
      estado: body.estado,
      codigo_postal: body.codigo_postal,
      tipo: body.tipo || 'retail',
      limite_credito: body.limite_credito || 0,
      saldo_actual: body.saldo_actual || 0,
      estado_cliente: body.estado_cliente || 'activo',
    });

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

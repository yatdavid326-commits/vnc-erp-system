import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/lib/services/customers/customerService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { customerUpdateSchema } from '@/lib/validation/requestSchemas';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Identificador de cliente no válido.' }, { status: 400 });
    }
    const cliente = await customerService.getById(id);
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    console.error('GET /api/clientes/[id] error:', error);
    return NextResponse.json({ error: 'Error al consultar el cliente.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Identificador de cliente no válido.' }, { status: 400 });
    }
    const parsedBody = await validateRequestBody(request, customerUpdateSchema);
    if (!parsedBody.success) return parsedBody.response;

    const cliente = await customerService.update(id, parsedBody.data);
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    console.error('PUT /api/clientes/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar el cliente.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Identificador de cliente no válido.' }, { status: 400 });
    }
    const deleted = await customerService.delete(id);
    if (!deleted) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('DELETE /api/clientes/[id] error:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
      return NextResponse.json({ error: 'No se puede eliminar un cliente con registros relacionados.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al eliminar el cliente.' }, { status: 500 });
  }
}

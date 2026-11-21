import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/lib/services/customers/customerService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { customerUpdateSchema } from '@/lib/validation/requestSchemas';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const cliente = await customerService.getById((await params).id);
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    console.error('GET /api/clientes/[id] error:', error);
    return NextResponse.json({ error: 'Error al consultar el cliente.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const parsedBody = await validateRequestBody(request, customerUpdateSchema);
    if (!parsedBody.success) return parsedBody.response;

    const cliente = await customerService.update((await params).id, parsedBody.data);
    return NextResponse.json(cliente);
  } catch (error) {
    console.error('PUT /api/clientes/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar el cliente.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    await customerService.delete(id);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('DELETE /api/clientes/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar el cliente.' }, { status: 500 });
  }
}

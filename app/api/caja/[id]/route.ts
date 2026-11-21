import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { cashMovementUpdateSchema } from '@/lib/validation/requestSchemas';

const TABLA = 'cash_movements';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedBody = await validateRequestBody(
      request,
      cashMovementUpdateSchema
    );
    if (!parsedBody.success) return parsedBody.response;

    const supabase = createClient();
    const { data, error } = await supabase
      .from(TABLA)
      .update(parsedBody.data)
      .eq('id', (await params).id)
      .select();
    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('PUT /api/caja/[id] error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient();
    const { error } = await supabase.from(TABLA).delete().eq('id', (await params).id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/caja/[id] error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

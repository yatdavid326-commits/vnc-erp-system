import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { posOrderUpdateSchema } from '@/lib/validation/requestSchemas';

const TABLA = 'pos_orders';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedBody = await validateRequestBody(
      request,
      posOrderUpdateSchema
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
    console.error('PUT /api/pos/[id] error:', error);
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
    console.error('DELETE /api/pos/[id] error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

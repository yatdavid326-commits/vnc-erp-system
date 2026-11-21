import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const TABLA = 'pos_orders';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const supabase = createClient();
    const { data, error } = await supabase.from(TABLA).update(body).eq('id', (await params).id).select();
    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error) {
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
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

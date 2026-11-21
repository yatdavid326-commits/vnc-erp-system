import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { cashMovementCreateSchema } from '@/lib/validation/requestSchemas';

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('cash_movements').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('GET /api/caja error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await validateRequestBody(
      request,
      cashMovementCreateSchema
    );
    if (!parsedBody.success) return parsedBody.response;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('cash_movements')
      .insert([parsedBody.data])
      .select();
    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/caja error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

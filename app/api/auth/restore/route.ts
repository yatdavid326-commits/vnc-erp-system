import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    // Intentar obtener la sesión actual de Supabase
    const { data: { session }, error } = await supabaseAdmin.auth.getSession();

    if (session?.user) {
      // Obtener el perfil del usuario
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      return NextResponse.json({
        user: session.user,
        session: session,
        profile: profile,
        authenticated: true,
      });
    } else {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }
  } catch (error) {
    console.error('Error restoring session:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Session restore failed' },
      { status: 401 }
    );
  }
}

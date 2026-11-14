import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    // Intentar obtener la sesión actual de Supabase
    const { data: { session }, error } = await supabase.auth.getSession();

    if (session?.user) {
      // Obtener el perfil del usuario
      const { data: profile } = await supabase
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

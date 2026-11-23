import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/auth/sessionCookies';

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if ((accessToken || refreshToken) && supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      });

      let sessionEstablished = false;
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        sessionEstablished = !error;
      }

      if (!sessionEstablished && refreshToken) {
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });
        sessionEstablished = Boolean(data.session);
        if (error) {
          console.error('Error refreshing session for signout:', error);
        }
      }

      if (sessionEstablished) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Error revoking session during signout:', error);
        }
      }
    } catch (error) {
      console.error('Error revoking session during signout:', error);
    }
  } else if (accessToken || refreshToken) {
    console.error('Supabase authentication is not configured for signout.');
  }

  return clearAuthCookies(NextResponse.json({ success: true }));
}

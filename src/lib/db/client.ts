import { createClient } from '@supabase/supabase-js';
import { useCallback } from 'react';

// Store client in a global variable to avoid recreating it on every render
let client: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (client) return client;

  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
};

export const useSupabase = () => {
  return useCallback(() => getSupabaseClient(), []);
};

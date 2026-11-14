import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('supabaseUrl and supabaseKey (NEXT_PUBLIC_SUPABASE_ANON_KEY) are required.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// supabaseAdmin is only used on the server side
export const supabaseAdmin = serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export default supabase;

import { createClient } from '@supabase/supabase-js';
export const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
export const OWNER = () => { const v = process.env.OWNER_USER_ID; if (!v) throw new Error('Missing env OWNER_USER_ID'); return v; };

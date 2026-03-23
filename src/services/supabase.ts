
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cbmoqesxwxyigjnfoixi.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Az5W8g4Wg4hxNW2ukXrn7Q_Yu4ULMWX';

console.log("SUPABASE_CLIENT: Initializing with URL:", supabaseUrl?.substring(0, 10) + "...");
if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_CLIENT: Missing environment variables!");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'nilayam' },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    timeout: 30000 
  }
});

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

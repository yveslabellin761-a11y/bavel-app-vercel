import { createClient } from '@supabase/supabase-js';
import { supabase as defaultClient, getSupabase } from './supabase';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
}

// Instance exportée compatible avec le modèle Supabase standard
export const supabase = getSupabase() || createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY || '';

// This client bypasses RLS — only use in admin screens
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'lf-admin-auth', // separate key to avoid conflict with user client
  },
});

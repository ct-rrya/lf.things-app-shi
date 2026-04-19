import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const serviceKey = Constants.expoConfig?.extra?.supabaseServiceKey || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY || '';

// This client bypasses RLS — only use in admin screens
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'lf-admin-auth', // separate key to avoid conflict with user client
  },
  global: {
    headers: {
      'X-Client-Info': 'lf-admin-client',
    },
  },
});

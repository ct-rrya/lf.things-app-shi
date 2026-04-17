import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing!');
  console.error('URL:', supabaseUrl ? 'present' : 'MISSING');
  console.error('Key:', supabaseAnonKey ? 'present' : 'MISSING');
  console.error('Constants.expoConfig:', Constants.expoConfig ? 'present' : 'MISSING');
  console.error('Constants.expoConfig.extra:', Constants.expoConfig?.extra ? JSON.stringify(Object.keys(Constants.expoConfig.extra)) : 'MISSING');
}

// Use AsyncStorage on native, localStorage on web
const storage = Platform.OS === 'web'
  ? {
      getItem: (key) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
      removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
    }
  : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

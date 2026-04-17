export default {
  expo: {
    name: 'LF',
    slug: 'sos-app',
    version: '1.0.0',
    scheme: 'lf',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.lf.app',
    },
    android: {
      package: 'com.lf.app',
    },
    web: {
      bundler: 'metro',
    },
    extra: {
      eas: {
        projectId: 'd4f1b0b0-94ac-4eb6-b589-2e7b32000fed',
      },
      // These will be populated from eas.json env vars at build time
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY,
      groqApiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
      adminCode: process.env.EXPO_PUBLIC_ADMIN_CODE,
      appUrl: process.env.EXPO_PUBLIC_APP_URL,
    },
    plugins: ['expo-router'],
    owner: 'rrya_youser',
  },
};

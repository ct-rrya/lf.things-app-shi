import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(true);
      if (session) {
        router.replace('/(tabs)/home');
      }
      // If no session, stay on '/' (login page) — no redirect needed
    });

    // Only handle explicit sign-out to redirect to login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event) => {
      if (_event === 'SIGNED_OUT') {
        router.replace('/');
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.found_item_id) {
        router.push(`/found/${data.found_item_id}`);
      }
    });

    return () => {
      subscription.unsubscribe();
      responseSubscription.remove();
    };
  }, []);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="account-settings" />
      <Stack.Screen name="scan/[token]" />
    </Stack>
  );
}

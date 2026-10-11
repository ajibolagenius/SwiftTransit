import { Stack } from 'expo-router';

import { useAuth } from '@/features/auth/auth-provider';
import { routeGuards } from '@/features/auth/guards';

export default function AuthLayout() {
  const guard = routeGuards(useAuth());
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Signed in without a profile: only registration is reachable, so the stack opens there. */}
      <Stack.Protected guard={guard.signIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="phone" />
        <Stack.Screen name="email" />
        <Stack.Screen name="verify" />
      </Stack.Protected>
      <Stack.Screen name="register" />
      <Stack.Screen name="courier-apply" />
    </Stack>
  );
}

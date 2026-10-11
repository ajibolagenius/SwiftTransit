import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="action-sheet"
        options={{ presentation: 'formSheet', sheetAllowedDetents: [0.45], sheetGrabberVisible: true }}
      />
      <Stack.Screen name="new-delivery/booked" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

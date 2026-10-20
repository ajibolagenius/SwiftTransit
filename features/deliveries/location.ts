import * as Location from 'expo-location';

export type Coords = { lat: number; lng: number };

// AC-3: a denied permission or a failed fix returns null. The caller then keeps
// the Lagos camera rather than blocking the step.
export async function readCurrentPosition(): Promise<Coords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}

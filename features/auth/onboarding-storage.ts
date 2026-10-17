import AsyncStorage from '@react-native-async-storage/async-storage';

// Spec 0003: the carousel gate. Write-once from the app's side, not sensitive, never synced.
const FLAG_KEY = 'swifttransit.onboarding_seen';

export async function readOnboardingSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FLAG_KEY)) === '1';
  } catch {
    return true; // a read error never traps a user in the carousel
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(FLAG_KEY, '1');
  } catch {
    // One-way flag; a failed write only means the carousel may show again.
  }
}

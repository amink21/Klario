import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_HAS_ONBOARDED = 'klario_has_onboarded';

export async function getHasOnboarded(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(KEY_HAS_ONBOARDED);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setHasOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEY_HAS_ONBOARDED, 'true');
}

/** Clear the flag so onboarding shows again on next app launch. */
export async function clearHasOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEY_HAS_ONBOARDED, 'false');
}

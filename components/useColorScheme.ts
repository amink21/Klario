import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * App uses light theme only (clean iOS pastel style).
 * Override system dark mode so the UI always stays light.
 */
export function useColorScheme(): 'light' | 'dark' {
  return 'light';
}

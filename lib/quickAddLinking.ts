/**
 * Quick Add (Back Tap) setup: open Shortcut install, Settings (Accessibility/Back Tap), test deep link.
 */

import { Linking, Platform } from "react-native";

/** iCloud Shortcuts share link for Quick Add (Back Tap). */
export const SHORTCUT_INSTALL_URL =
  "https://www.icloud.com/shortcuts/3b8ff449a7474e44b98c865374dd9079";

const TEST_DEEP_LINK_TEXT = "coffee today $5";
const TEST_DEEP_LINK = `klovio://quick-add?text=${encodeURIComponent(TEST_DEEP_LINK_TEXT)}`;

/** Opens system Settings. On iOS, tries to open Accessibility (then Touch > Back Tap). */
export function openBackTapSettings(): void {
  if (Platform.OS !== "ios") {
    Linking.openSettings();
    return;
  }
  // Best effort: open Accessibility so user can tap Touch → Back Tap. Fallback to app settings.
  const accessibilityUrl = "App-prefs:root=ACCESSIBILITY";
  Linking.openURL(accessibilityUrl).catch(() => Linking.openSettings());
}

export function openShortcutInstall(): void {
  Linking.openURL(SHORTCUT_INSTALL_URL);
}

export function openSettings(): void {
  Linking.openSettings();
}

export function openTestDeepLink(): void {
  Linking.openURL(TEST_DEEP_LINK);
}

export { TEST_DEEP_LINK };

/**
 * Quick Add (Back Tap) setup: open Shortcut install, Settings (Accessibility/Back Tap), test deep link.
 */

import { Linking, Platform } from "react-native";

/** Placeholder: replace with your iCloud Shortcuts share link. */
export const SHORTCUT_INSTALL_URL =
  "https://www.icloud.com/shortcuts/288e35020e1945ec9f17592f1344e74c";

const TEST_DEEP_LINK_TEXT = "coffee today $5";
const TEST_DEEP_LINK = `klario://quick-add?text=${encodeURIComponent(TEST_DEEP_LINK_TEXT)}`;

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

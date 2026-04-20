/**
 * Quick Add (Back Tap) setup: install Shortcut, assign Back Tap, test.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useColorScheme } from "@/components/useColorScheme";
import { colors, spacing, radius } from "@/constants/Theme";
import { Toast } from "@/components/Toast";
import {
  SHORTCUT_INSTALL_URL,
  openShortcutInstall,
  openBackTapSettings,
  openTestDeepLink,
} from "@/lib/quickAddLinking";

const BACK_TAP_STEPS_BODY =
  "Settings → Accessibility → Touch → Back Tap → Triple Tap → Quick Add to Klovio";

export default function QuickAddSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? "light"];

  const [toast, setToast] = useState<string | null>(null);
  const [showAlternativesModal, setShowAlternativesModal] = useState<"widget" | null>(null);

  const isIOS = Platform.OS === "ios";

  const handleInstallShortcut = () => {
    openShortcutInstall();
    setToast("Opening Shortcut install…");
  };

  const handleOpenSettings = () => {
    openBackTapSettings();
    setToast("Opening Settings…");
  };

  const handleRunTest = () => {
    openTestDeepLink();
    setToast("Opening test…");
  };

  const handleWidgetInfo = () => {
    setShowAlternativesModal("widget");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FontAwesome name="chevron-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Quick Add</Text>
        <View style={styles.headerBack} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Set up Back Tap to add items instantly.
        </Text>

        {!isIOS && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              Back Tap setup is iOS-only. You can still use the Quick Add deep link (e.g. from
              another app or a shortcut) to add entries.
            </Text>
          </View>
        )}

        {isIOS && (
          <>
            {/* Step 1 */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Step 1</Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>1) Install Shortcut</Text>
              <Text style={[styles.body, { color: theme.textTertiary }]}>
                Adds a &quot;Quick Add to Klovio&quot; shortcut to your Shortcuts app.
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.tint, marginTop: spacing.md }]}
                onPress={handleInstallShortcut}
              >
                <Text style={styles.primaryButtonText}>Install Shortcut</Text>
              </TouchableOpacity>
              {SHORTCUT_INSTALL_URL.includes("XXXX") && (
                <Text style={[styles.hint, { color: theme.textTertiary }]}>
                  Replace SHORTCUT_INSTALL_URL in code with your iCloud Shortcut link.
                </Text>
              )}
            </View>

            {/* Step 2 */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Step 2</Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>2) Assign Back Tap</Text>
              <Text style={[styles.body, { color: theme.textTertiary }]}>{BACK_TAP_STEPS_BODY}</Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.tint, marginTop: spacing.md }]}
                onPress={handleOpenSettings}
              >
                <Text style={styles.primaryButtonText}>Open Settings</Text>
              </TouchableOpacity>
            </View>

            {/* Step 3 */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Step 3</Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>3) Test it</Text>
              <Text style={[styles.body, { color: theme.textTertiary }]}>
                Try a sample entry to confirm everything works.
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.tint, marginTop: spacing.md }]}
                onPress={handleRunTest}
              >
                <Text style={styles.primaryButtonText}>Run test</Text>
              </TouchableOpacity>
            </View>

            {/* Alternatives */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Alternatives</Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.body, { color: theme.textTertiary, marginBottom: spacing.sm }]}>
                Prefer not to use Back Tap?
              </Text>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.border, marginBottom: spacing.sm }]}
                onPress={handleWidgetInfo}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                  Home Screen Widget
                </Text>
              </TouchableOpacity>
              <Text style={[styles.body, { color: theme.textTertiary }]}>
                After installing the shortcut, you can say &quot;Hey Siri, Quick Add to Klovio&quot; and
                then speak your entry (e.g. &quot;coffee 5 dollars today&quot;).
              </Text>
            </View>
          </>
        )}

        {!isIOS && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Test Quick Add</Text>
            <Text style={[styles.body, { color: theme.textTertiary }]}>
              Open the deep link to add a sample entry (e.g. from another app).
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.tint, marginTop: spacing.md }]}
              onPress={handleRunTest}
            >
              <Text style={styles.primaryButtonText}>Run test</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} durationMs={2500} />

      <Modal visible={showAlternativesModal === "widget"} transparent animationType="fade">
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}
          onPress={() => setShowAlternativesModal(null)}
        />
        <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Home Screen Widget</Text>
          <Text style={[styles.body, { color: theme.textTertiary }]}>
            Coming soon. For now use Back Tap or Siri with the Quick Add shortcut.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.tint, marginTop: spacing.lg }]}
            onPress={() => setShowAlternativesModal(null)}
          >
            <Text style={styles.primaryButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerBack: { width: 44, alignItems: "flex-start" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl },
  subtitle: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
  },
  stepTitle: { fontSize: 16, fontWeight: "600", marginBottom: spacing.xs },
  body: { fontSize: 14, lineHeight: 20 },
  hint: { fontSize: 12, marginTop: spacing.sm },
  primaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "600" },
  modalCard: {
    marginHorizontal: spacing.xl,
    marginTop: "30%",
    padding: spacing.xl,
    borderRadius: radius.xl,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: spacing.sm },
});

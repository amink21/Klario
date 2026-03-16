import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';

type Props = {
  visible: boolean;
  storeUrl: string;
  storeVersion: string;
  onUpdate: () => void;
  onLater: () => void;
};

export function UpdateAvailableModal({
  visible,
  storeUrl,
  storeVersion,
  onUpdate,
  onLater,
}: Props) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  const handleUpdate = () => {
    Linking.openURL(storeUrl).catch(() => {});
    onUpdate();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surfaceElevated }]}>
          <Text style={[styles.title, { color: theme.text }]}>Update available</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            Version {storeVersion} is available on the App Store. Update for the latest features and fixes.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.border }]}
              onPress={onLater}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
              onPress={handleUpdate}
            >
              <Text style={styles.primaryBtnText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 15,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  primaryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

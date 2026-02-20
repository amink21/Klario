import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';

const WORKING_STEPS = [
  'Uploading PDF…',
  'Reading document…',
  'Extracting transactions…',
  'Analyzing…',
  'Almost there…',
];

export type PdfExtractingStatus = 'working' | 'found' | 'error';

interface PdfExtractingModalProps {
  visible: boolean;
  status: PdfExtractingStatus;
  errorMessage?: string | null;
  onClose: () => void;
}

export function PdfExtractingModal({
  visible,
  status,
  errorMessage,
  onClose,
}: PdfExtractingModalProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const [stepIndex, setStepIndex] = useState(0);

  // Cycle through working steps every 2s while visible and working
  useEffect(() => {
    if (!visible || status !== 'working') return;
    setStepIndex(0);
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % WORKING_STEPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [visible, status]);

  // Auto-close after showing "Found." for 1.5s
  useEffect(() => {
    if (!visible || status !== 'found') return;
    const t = setTimeout(onClose, 1500);
    return () => clearTimeout(t);
  }, [visible, status, onClose]);

  if (!visible) return null;

  const isWorking = status === 'working';
  const isFound = status === 'found';
  const isError = status === 'error';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isWorking ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surfaceElevated }]}>
          {isWorking && (
            <>
              <ActivityIndicator size="large" color={theme.tint} style={styles.spinner} />
              <Text style={[styles.message, { color: theme.text }]}>
                {WORKING_STEPS[stepIndex]}
              </Text>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                This may take a moment
              </Text>
            </>
          )}
          {isFound && (
            <>
              <FontAwesome name="check-circle" size={56} color={theme.success} style={styles.icon} />
              <Text style={[styles.message, { color: theme.text }]}>Found.</Text>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Adding transactions…
              </Text>
            </>
          )}
          {isError && (
            <>
              <FontAwesome name="exclamation-circle" size={56} color={theme.danger} style={styles.icon} />
              <Text style={[styles.message, { color: theme.text }]}>Something went wrong</Text>
              <Text style={[styles.errorDetail, { color: theme.textSecondary }]} numberOfLines={3}>
                {errorMessage ?? 'PDF import failed.'}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: theme.tint }]}
                activeOpacity={0.8}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
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
    maxWidth: 320,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: spacing.lg,
  },
  icon: {
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  closeBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

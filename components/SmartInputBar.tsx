import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';

export type SmartInputContext = 'today' | 'items' | 'money';

/** Shown in the same box after add: thinking → then result label. Right side, no pill, light tint. */
export type InputBoxStatus = null | 'thinking' | 'reminder' | 'transaction' | 'both';

const PLACEHOLDERS: Record<SmartInputContext, string> = {
  today: 'Add anything…',
  items: 'Add anything…',
  money: 'Add anything…',
};

const STATUS_LABELS: Record<Exclude<InputBoxStatus, null | 'thinking'>, string> = {
  reminder: 'Reminder',
  transaction: 'Transaction',
  both: 'Reminder + Transaction',
};

const springConfig = { damping: 18, stiffness: 120 };

interface SmartInputBarProps {
  context: SmartInputContext;
  onSubmit: (text: string) => void | Promise<void>;
  loading?: boolean;
  boxStatus?: InputBoxStatus;
}

export function SmartInputBar({ context, onSubmit, loading = false, boxStatus = null }: SmartInputBarProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const [text, setText] = useState('');

  const isShowingStatus = boxStatus !== null;
  const [transitioningOut, setTransitioningOut] = useState(false);
  const hasEverShownStatus = React.useRef(false);
  if (isShowingStatus) hasEverShownStatus.current = true;
  const showInput = !isShowingStatus && !transitioningOut;
  const showStatusView = isShowingStatus || transitioningOut;

  const statusOpacity = useSharedValue(0);
  const thinkingOpacity = useSharedValue(1);
  const resultOpacity = useSharedValue(0);
  const inputOpacity = useSharedValue(1);

  const finishTransitionOut = React.useCallback(() => {
    setTransitioningOut(false);
    setText('');
  }, []);

  useEffect(() => {
    if (isShowingStatus) {
      setTransitioningOut(false);
      statusOpacity.value = 0;
      statusOpacity.value = withSpring(1, { damping: 22, stiffness: 100 });
      if (boxStatus === 'thinking') {
        thinkingOpacity.value = 1;
        resultOpacity.value = 0;
      } else {
        thinkingOpacity.value = 0;
        resultOpacity.value = 1;
      }
    }
  }, [isShowingStatus]);

  useEffect(() => {
    if (isShowingStatus && boxStatus === 'thinking') {
      thinkingOpacity.value = 1;
      resultOpacity.value = 0;
    } else if (isShowingStatus && boxStatus !== null && boxStatus !== 'thinking') {
      thinkingOpacity.value = withTiming(0, { duration: 280 });
      resultOpacity.value = withTiming(1, { duration: 280 });
      setText('');
    }
  }, [boxStatus]);

  useEffect(() => {
    if (!isShowingStatus && showStatusView) {
      setTransitioningOut(true);
      inputOpacity.value = 0;
      statusOpacity.value = withTiming(
        0,
        { duration: 380 },
        (finished) => {
          if (finished) runOnJS(finishTransitionOut)();
        }
      );
    } else if (!showStatusView && hasEverShownStatus.current) {
      inputOpacity.value = 0;
      inputOpacity.value = withTiming(1, { duration: 320 });
    }
  }, [isShowingStatus, showStatusView]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    Keyboard.dismiss();
    await onSubmit(trimmed);
  };

  const statusContainerStyle = useAnimatedStyle(() => ({
    opacity: statusOpacity.value,
  }));

  const thinkingBlockStyle = useAnimatedStyle(() => ({
    opacity: thinkingOpacity.value,
  }));

  const resultBlockStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
  }));

  const inputSectionStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
  }));

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.accentPill ?? theme.pillBg }]}>
      {showInput ? (
        <Animated.View style={[styles.inputRow, inputSectionStyle]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={text}
            onChangeText={setText}
            placeholder={PLACEHOLDERS[context]}
            placeholderTextColor={theme.textTertiary}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            blurOnSubmit={false}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.tint }]}
            onPress={handleSubmit}
            disabled={loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addBtnLabel}>Add</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      ) : null}
      {showStatusView ? (
        <>
          <Text style={[styles.input, styles.submittedText, { color: theme.textSecondary }]} numberOfLines={1}>
            {text.trim() || ' '}
          </Text>
          <Animated.View style={[styles.statusWrap, statusContainerStyle]}>
            <Animated.View style={[styles.statusBlock, thinkingBlockStyle]} pointerEvents="none">
              <ActivityIndicator size="small" color={theme.tintMuted ?? theme.tint} style={styles.statusSpinner} />
              <Text style={[styles.statusLabel, { color: theme.tintMuted ?? theme.tint }]} numberOfLines={1}>
                Thinking…
              </Text>
            </Animated.View>
            <Animated.View style={[styles.statusBlock, resultBlockStyle]} pointerEvents="none">
              <View style={styles.statusSvgWrap}>
                <Svg width={140} height={20} viewBox="0 0 140 20" style={styles.gradientSvg}>
                  <Defs>
                    <LinearGradient id="statusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0" stopColor={theme.tint} />
                      <Stop offset="0.5" stopColor={theme.tintMuted ?? theme.tint} />
                      <Stop offset="1" stopColor={theme.tint} />
                    </LinearGradient>
                  </Defs>
                  <SvgText
                    x="70"
                    y="14"
                    fill="url(#statusGrad)"
                    fontSize="15"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {boxStatus && boxStatus !== 'thinking' ? STATUS_LABELS[boxStatus] : ' '}
                  </SvgText>
                </Svg>
              </View>
            </Animated.View>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    minHeight: 56,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  submittedText: {
    flex: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    minWidth: 44,
    gap: spacing.sm,
  },
  addBtnLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  statusWrap: {
    position: 'relative',
    width: 140,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBlock: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSpinner: { marginRight: spacing.sm },
  statusLabel: { fontSize: 15, fontWeight: '500' },
  statusSvgWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientSvg: { width: 140, height: 20 },
});

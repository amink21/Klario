import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BearLogo } from '@/components/BearLogo';
import { spacing, radius } from '@/constants/Theme';

const SLIDES: { title: string; subtitle: string; isLast?: boolean }[] = [
  {
    title: 'Welcome to Klario',
    subtitle:
      "I'm Klario, your AI guide. I'll help you make smarter decisions and organize your life.",
  },
  {
    title: 'Ask Anything',
    subtitle:
      "From planning your week to understanding finances — I've got you. Try in the search bar: \"Rent due March 1\", \"Starbucks $5.50\", \"Car insurance monthly\".",
  },
  {
    title: 'Simple & Personal',
    subtitle: 'Clear insights. Calm design. Built just for you.',
  },
  {
    title: "Let's Begin",
    subtitle: 'Your journey starts now.',
    isLast: true,
  },
];

const COLORS = {
  background: '#f5f4f2',
  surface: '#eeedeb',
  text: '#2c2c2e',
  textSecondary: '#6d6d72',
  button: '#6bb88a',
  buttonText: '#ffffff',
  dot: 'rgba(0,0,0,0.15)',
  dotActive: '#6bb88a',
};

type Props = {
  onComplete: () => void;
};

export function OnboardingScreen({ onComplete }: Props) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrentIndex(index);
    },
    [SCREEN_WIDTH]
  );

  const goNext = useCallback(() => {
    if (currentIndex >= SLIDES.length - 1) {
      onComplete();
      return;
    }
    flatListRef.current?.scrollToOffset({
      offset: (currentIndex + 1) * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentIndex(currentIndex + 1);
  }, [currentIndex, onComplete, SCREEN_WIDTH]);

  const skip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const renderSlide = useCallback(
    ({ item, index }: { item: (typeof SLIDES)[0]; index: number }) => (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        <View style={styles.slideContent}>
          {index === 0 && (
            <Animated.View
              entering={FadeIn.delay(200).duration(400)}
              style={styles.bearWrap}
            >
              <BearLogo width={100} height={100} />
            </Animated.View>
          )}
          <Animated.View entering={FadeIn.delay(index === 0 ? 350 : 200).duration(400)}>
            <Text style={styles.title}>{item.title}</Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(index === 0 ? 450 : 300).duration(400)}>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </Animated.View>
        </View>
      </View>
    ),
    [SCREEN_WIDTH]
  );

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TouchableOpacity
        style={[styles.skipBtn, { top: insets.top + spacing.md }]}
        onPress={skip}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : null,
                i === currentIndex && { backgroundColor: COLORS.dotActive },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skipBtn: {
    position: 'absolute',
    right: spacing.xl,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    maxWidth: 340,
  },
  bearWrap: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    gap: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dot,
  },
  dotActive: {},
  button: {
    backgroundColor: COLORS.button,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl * 1.5,
    borderRadius: radius.full,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.buttonText,
  },
});

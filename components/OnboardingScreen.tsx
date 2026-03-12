import { BearLogo } from "@/components/BearLogo";
import { radius, spacing } from "@/constants/Theme";
import { useAuth } from "@/contexts/AuthContext";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Slide = {
  title: string;
  subtitle: string;
  isLast?: boolean;
  isSignInSlide?: boolean;
};

const SLIDES: Slide[] = [
  {
    title: "Welcome to Klario",
    subtitle:
      "I'm Klario, your AI guide. I'll help you make smarter decisions and organize your life.",
  },
  {
    title: "Ask Anything",
    subtitle:
      'From planning your week to understanding finances — I\'ve got you. Try in the search bar: "Rent due March 1", "Starbucks $5.50", "Car insurance monthly".',
  },
  {
    title: "Import from PDF",
    subtitle:
      "Drop in bank or card statements (PDF or CSV). Klario extracts transactions so you can see spending by category without typing everything in.",
  },
  {
    title: "Quick Add with Back Tap",
    subtitle:
      "On iPhone, set up Back Tap to open Klario's input bar from anywhere. Add a reminder or log a purchase in seconds—no need to open the app first.",
  },
  {
    title: "Simple & Personal",
    subtitle: "Clear insights. Calm design. Built just for you.",
  },
  {
    title: "Sign in to keep your data",
    subtitle:
      "Create an account so your reminders, spending, and subscriptions sync across devices. Sign in with Apple—or continue without an account and keep everything on this device.",
    isLast: true,
    isSignInSlide: true,
  },
];

const COLORS = {
  background: "#f5f4f2",
  surface: "#eeedeb",
  text: "#2c2c2e",
  textSecondary: "#6d6d72",
  button: "#6bb88a",
  buttonText: "#ffffff",
  dot: "rgba(0,0,0,0.15)",
  dotActive: "#6bb88a",
};

type Props = {
  onComplete: () => void;
};

export function OnboardingScreen({ onComplete }: Props) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [appleAuthModule, setAppleAuthModule] = useState<
    typeof import("expo-apple-authentication") | null
  >(null);
  const [signingIn, setSigningIn] = useState(false);
  const { signInWithAppleNative } = useAuth();

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    import("@/lib/appleAuth")
      .then(({ isAppleAuthAvailable }) => isAppleAuthAvailable())
      .then((ok) => {
        if (ok) {
          import("expo-apple-authentication")
            .then((mod) => {
              setAppleAuthModule(mod);
              setAppleAuthAvailable(true);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrentIndex(index);
    },
    [SCREEN_WIDTH],
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

  const handleAppleSignIn = useCallback(async () => {
    if (signingIn) return;
    setSigningIn(true);
    const { error } = await signInWithAppleNative();
    setSigningIn(false);
    if (!error) onComplete();
  }, [signInWithAppleNative, onComplete, signingIn]);

  const renderSlide = useCallback(
    ({ item, index }: { item: Slide; index: number }) => {
      const isSignInSlide = item.isSignInSlide === true;
      return (
        <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
          {isSignInSlide ? (
            <ScrollView
              style={styles.signInSlideScroll}
              contentContainerStyle={styles.signInSlideScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.signInSlideInner}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
                <View style={styles.signInActions}>
                <View style={styles.authBtnRow}>
                  {appleAuthAvailable && appleAuthModule ? (
                    (() => {
                      const AppleBtn =
                        appleAuthModule.AppleAuthenticationButton;
                      return (
                        <View style={styles.appleBtnWrap}>
                          <AppleBtn
                            buttonType={
                              appleAuthModule.AppleAuthenticationButtonType
                                .SIGN_IN
                            }
                            buttonStyle={
                              appleAuthModule.AppleAuthenticationButtonStyle
                                .BLACK
                            }
                            cornerRadius={8}
                            style={{ width: "100%", height: 44 }}
                            onPress={handleAppleSignIn}
                          />
                        </View>
                      );
                    })()
                  ) : (
                    <TouchableOpacity
                      style={[styles.authBtn, styles.appleBtnWrap]}
                      onPress={handleAppleSignIn}
                      disabled={signingIn}
                      activeOpacity={0.85}
                    >
                      {signingIn ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.authBtnText}>
                          Sign in with Apple
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.continueWithoutBtn}
                  onPress={onComplete}
                  disabled={signingIn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueWithoutText}>
                    Continue without account
                  </Text>
                </TouchableOpacity>
              </View>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.slideContent}>
              {index === 0 && (
                <Animated.View
                  entering={FadeIn.delay(200).duration(400)}
                  style={styles.bearWrap}
                >
                  <BearLogo width={100} height={100} />
                </Animated.View>
              )}
              <Animated.View
                entering={FadeIn.delay(index === 0 ? 350 : 200).duration(400)}
              >
                <Text style={styles.title}>{item.title}</Text>
              </Animated.View>
              <Animated.View
                entering={FadeIn.delay(index === 0 ? 450 : 300).duration(400)}
              >
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </Animated.View>
            </View>
          )}
        </View>
      );
    },
    [
      SCREEN_WIDTH,
      appleAuthAvailable,
      appleAuthModule,
      signingIn,
      handleAppleSignIn,
      onComplete,
    ],
  );

  const isLast = currentIndex === SLIDES.length - 1;
  const isSignInSlide = SLIDES[currentIndex]?.isSignInSlide;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
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
          onPress={isSignInSlide ? onComplete : goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {isLast ? "Get Started" : "Next"}
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
    position: "absolute",
    right: spacing.xl,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slideContent: {
    paddingHorizontal: spacing.xxl,
    alignItems: "center",
    maxWidth: 340,
  },
  signInSlideScroll: {
    flex: 1,
    width: "100%",
  },
  signInSlideScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  signInSlideInner: {
    alignItems: "center",
    maxWidth: 340,
    width: "100%",
  },
  bearWrap: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: spacing.lg,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  signInActions: {
    marginTop: spacing.xl,
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
  },
  authBtnRow: {
    width: "100%",
    marginTop: spacing.sm,
  },
  authBtn: {
    backgroundColor: "#000",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  authBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  appleBtnWrap: {
    width: "100%",
    height: 44,
  },
  continueWithoutBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  continueWithoutText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: "center",
    gap: spacing.xl,
  },
  dots: {
    flexDirection: "row",
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
    alignItems: "center",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
});

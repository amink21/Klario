import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { BearLogo } from "@/components/BearLogo";
import { KlarioWordmark } from "@/components/KlarioWordmark";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BEAR_SIZE = 120;
const GREEN = "#6bb88a";

const BEAR_FLIP_DURATION = 550;
const BEAR_MOVE_KLARIO_IN_DURATION = 400;
const KLARIO_REVEAL_DURATION = 280;
const GREEN_ZOOM_DURATION = 500;
const GREEN_DRAG_DURATION = 500;

/** Bear shifts slightly left; then klario is revealed after move completes */
const BEAR_MOVE_LEFT = -25;
const ROW_GAP = 0;
/** At start: offset row right so only the bear is centered. After move: offset so bear+klario group is centered. */
const INITIAL_ROW_OFFSET = 40;
const ROW_CENTER_OFFSET = 30;
/** Shift only the Klario wordmark left toward center; bear stays put */
const KLARIO_SHIFT_LEFT = 50;
const KLARIO_FONT_SIZE = 45;

type Props = {
  onFinish: () => void;
};

export function StartupAnimation({ onFinish }: Props) {
  const flipRotation = useSharedValue(0);
  const bearTranslateX = useSharedValue(0);
  const rowTranslateX = useSharedValue(INITIAL_ROW_OFFSET);
  const klarioOpacity = useSharedValue(0);
  const greenScale = useSharedValue(0);
  const containerTranslateY = useSharedValue(0);

  const easeOutCubic = Easing.bezier(0.33, 1, 0.68, 1);
  const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

  const bearStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${flipRotation.value}deg` },
      { translateX: bearTranslateX.value },
    ],
  }));

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rowTranslateX.value }],
  }));

  const klarioStyle = useAnimatedStyle(() => ({
    opacity: klarioOpacity.value,
    transform: [{ translateX: -KLARIO_SHIFT_LEFT }],
  }));

  const greenStyle = useAnimatedStyle(() => ({
    transform: [{ scale: greenScale.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: containerTranslateY.value }],
  }));

  useEffect(() => {
    // 1) Single horizontal flip – smooth 360° transition
    flipRotation.value = withTiming(360, {
      duration: BEAR_FLIP_DURATION,
      easing: easeInOut,
    });

    const afterFlip = BEAR_FLIP_DURATION + 80;

    // 2) Bear moves to the side; row shifts so when klario appears the group is centered
    bearTranslateX.value = withDelay(
      afterFlip,
      withTiming(BEAR_MOVE_LEFT, {
        duration: BEAR_MOVE_KLARIO_IN_DURATION,
        easing: easeOutCubic,
      }),
    );
    rowTranslateX.value = withDelay(
      afterFlip,
      withTiming(ROW_CENTER_OFFSET, {
        duration: BEAR_MOVE_KLARIO_IN_DURATION,
        easing: easeOutCubic,
      }),
    );
    // 3) Klario fades in only after bear has finished moving to the side
    klarioOpacity.value = withDelay(
      afterFlip + BEAR_MOVE_KLARIO_IN_DURATION,
      withTiming(1, {
        duration: KLARIO_REVEAL_DURATION,
        easing: easeOutCubic,
      }),
    );

    // 4) Green background zooms out after bear+klario are together
    greenScale.value = withDelay(
      afterFlip + BEAR_MOVE_KLARIO_IN_DURATION + KLARIO_REVEAL_DURATION + 280,
      withTiming(1, {
        duration: GREEN_ZOOM_DURATION,
        easing: easeOutCubic,
      }),
    );

    // 5) Whole screen drags down to reveal app
    containerTranslateY.value = withDelay(
      afterFlip +
        BEAR_MOVE_KLARIO_IN_DURATION +
        KLARIO_REVEAL_DURATION +
        280 +
        GREEN_ZOOM_DURATION +
        150,
      withTiming(
        SCREEN_HEIGHT,
        {
          duration: GREEN_DRAG_DURATION,
          easing: easeInOut,
        },
        (finished) => {
          if (finished) runOnJS(onFinish)();
        },
      ),
    );
  }, [onFinish]);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.container, containerStyle]}>
        <View style={styles.whiteBg} />
        <Animated.View style={[styles.greenZoom, greenStyle]} />
        <View style={styles.centerStage}>
          <Animated.View style={[styles.bearAndKlarioRow, rowStyle]}>
            <Animated.View style={[styles.bearWrap, bearStyle]}>
              <BearLogo width={BEAR_SIZE} height={BEAR_SIZE} />
            </Animated.View>
            <Animated.View
              style={[styles.klarioWrap, klarioStyle]}
              pointerEvents="none"
            >
              <KlarioWordmark color="#171717" fontSize={KLARIO_FONT_SIZE} />
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 9999,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  whiteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
  },
  centerStage: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  bearAndKlarioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ROW_GAP,
  },
  bearWrap: {
    width: BEAR_SIZE,
    height: BEAR_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  klarioWrap: {
    minWidth: 80,
  },
  greenZoom: {
    position: "absolute",
    left: 0,
    top: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: GREEN,
    zIndex: 1,
  },
});

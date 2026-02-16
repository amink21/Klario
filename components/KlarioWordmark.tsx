import React from 'react';
import { StyleSheet, Text } from 'react-native';

/** Primary typeface: Poppins ExtraBold (800). Calm · Modern · Trustworthy · Soft-Strong */
const FONT_FAMILY = 'Poppins_800ExtraBold';

/** Primary color: Neutral 900 */
const NEUTRAL_900 = '#171717';

/** Tight letter spacing (tracking-tight) */
const LETTER_SPACING_TIGHT = -0.8;

type Props = {
  color?: string;
  fontSize?: number;
};

export function KlarioWordmark({ color = NEUTRAL_900, fontSize = 22 }: Props) {
  return (
    <Text
      style={[
        styles.wordmark,
        { color, fontSize, letterSpacing: LETTER_SPACING_TIGHT },
      ]}
    >
      klario
    </Text>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
  },
});

import { getCategoryEmoji, getLogoDevUrl } from "@/lib/merchantLogo";
import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface MerchantIconProps {
  merchantName: string;
  category?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Renders merchant logo (logo.dev: domain when known, else name), category emoji, or first-letter avatar.
 * Lightweight for use in FlatList.
 */
export function MerchantIcon({
  merchantName,
  category = "",
  size = 25,
  backgroundColor = "#e0e0e0",
  textColor = "#666",
}: MerchantIconProps) {
  const [imageError, setImageError] = useState(false);
  const emoji = getCategoryEmoji(category);
  const hasName = merchantName?.trim().length > 0;
  const showLogo = hasName && !imageError;

  if (showLogo) {
    return (
      <View
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Image
          source={{ uri: getLogoDevUrl(merchantName) }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
          onError={() => setImageError(true)}
        />
      </View>
    );
  }

  if (emoji) {
    return (
      <View
        style={[
          styles.wrap,
          styles.emojiWrap,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={[styles.emoji, { fontSize: size * 0.55 }]}>{emoji}</Text>
      </View>
    );
  }

  const letter = (merchantName || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <View
      style={[
        styles.wrap,
        styles.letterWrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.5, color: textColor }]}>
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    backgroundColor: "transparent",
  },
  emojiWrap: {
    backgroundColor: "transparent",
  },
  emoji: {
    lineHeight: undefined,
  },
  letterWrap: {},
  letter: {
    fontWeight: "600",
  },
});

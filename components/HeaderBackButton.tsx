import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing } from '@/constants/Theme';

export function HeaderBackButton() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={styles.touchable}
      activeOpacity={0.7}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <View style={styles.content}>
        <FontAwesome name="chevron-left" size={18} color={theme.text} style={styles.icon} />
        <Text style={[styles.label, { color: theme.text }]}>Back</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginLeft: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: 17,
    fontWeight: '500',
  },
});

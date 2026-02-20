import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ItemCard } from '@/components/ItemCard';
import type { LifeItem } from '@/lib/types';
import { spacing } from '@/constants/Theme';

const DELETE_WIDTH = 72;

interface SwipeableReminderRowProps {
  item: LifeItem;
  onPress: () => void;
  onDelete: () => void;
  /** When provided, shows check to mark as done (active) or undone (completed). */
  onMarkDone?: (item: LifeItem) => void;
  onMarkUndone?: (item: LifeItem) => void;
  dangerColor: string;
  iconColor: string;
}

export function SwipeableReminderRow({
  item,
  onPress,
  onDelete,
  onMarkDone,
  onMarkUndone,
  dangerColor,
  iconColor,
}: SwipeableReminderRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-DELETE_WIDTH, 0],
      outputRange: [0, DELETE_WIDTH],
    });
    return (
      <Animated.View
        style={[
          styles.rightAction,
          { backgroundColor: dangerColor, transform: [{ translateX: trans }] },
        ]}
      >
        <RectButton
          style={styles.deleteBtn}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
        >
          <FontAwesome name="trash" size={22} color={iconColor} />
        </RectButton>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
    >
      <ItemCard item={item} onPress={onPress} onMarkDone={onMarkDone} onMarkUndone={onMarkUndone} />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  rightAction: {
    width: DELETE_WIDTH,
    marginBottom: spacing.sm,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});

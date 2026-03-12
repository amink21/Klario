import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';
import { spacing } from '@/constants/Theme';
import { MerchantIcon } from '@/components/MerchantIcon';

const DELETE_WIDTH = 72;

interface SwipeableTransactionRowProps {
  transaction: Transaction;
  onPress: () => void;
  onDelete: () => void;
  dangerColor: string;
  iconColor: string;
  textColor: string;
  metaColor: string;
  borderColor?: string;
  isFirst?: boolean;
}

export function SwipeableTransactionRow({
  transaction,
  onPress,
  onDelete,
  dangerColor,
  iconColor,
  textColor,
  metaColor,
  borderColor,
  isFirst,
}: SwipeableTransactionRowProps) {
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
      <TouchableOpacity
        style={[styles.row, isFirst && styles.rowFirst, { borderTopColor: borderColor ?? metaColor }]}
        onPress={() => {
          swipeableRef.current?.close();
          onPress();
        }}
        activeOpacity={0.6}
      >
        <MerchantIcon
          merchantName={transaction.merchant ?? transaction.title}
          category={transaction.category}
          size={36}
        />
        <View style={styles.left}>
          <Text style={[styles.txTitle, { color: textColor }]} numberOfLines={1}>
            {transaction.title}
          </Text>
          <Text style={[styles.txMeta, { color: metaColor }]}>
            {transaction.dateISO} {transaction.merchant ? `· ${transaction.merchant}` : ''}
          </Text>
        </View>
        <Text style={[styles.txAmount, { color: textColor }]}>
          {formatCurrency(transaction.amountCents)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
  },
  rowFirst: { borderTopWidth: 0 },
  left: { flex: 1, marginRight: spacing.md, marginLeft: spacing.sm },
  txTitle: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  txMeta: { fontSize: 13 },
  txAmount: { fontSize: 16, fontWeight: '600' },
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

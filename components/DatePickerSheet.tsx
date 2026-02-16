import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { getMonthGrid } from '@/lib/date';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface DatePickerSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  isOpen: boolean;
  onClose: () => void;
  selectedISO: string;
  onSelect: (iso: string) => void;
}

export function DatePickerSheet({ bottomSheetRef, isOpen, onClose, selectedISO, onSelect }: DatePickerSheetProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  const [viewYear, setViewYear] = useState(() => new Date(selectedISO + 'T12:00:00').getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedISO + 'T12:00:00').getMonth());

  useEffect(() => {
    const d = new Date(selectedISO + 'T12:00:00');
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [selectedISO]);

  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };
  const goToToday = () => {
    onSelect(new Date().toISOString().slice(0, 10));
    onClose();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['50%']}
      enablePanDownToClose
      onChange={(index) => {
        if (index === -1) onClose();
      }}
      backgroundStyle={{ backgroundColor: theme.surfaceElevated ?? theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={prevMonth} style={styles.arrow} hitSlop={12}>
            <Text style={[styles.arrowText, { color: theme.tint }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.arrow} hitSlop={12}>
            <Text style={[styles.arrowText, { color: theme.tint }]}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={[styles.weekday, { color: theme.textTertiary }]}>
              {w}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {grid.map((cell, index) => {
            const isSelected = cell.iso === selectedISO;
            return (
              <TouchableOpacity
                key={`${cell.iso}-${index}`}
                style={[
                  styles.cell,
                  !cell.isCurrentMonth && styles.cellDimmed,
                  isSelected && { backgroundColor: theme.tint },
                ]}
                onPress={() => {
                  onSelect(cell.iso);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.cellText,
                    { color: !cell.isCurrentMonth ? theme.textTertiary : theme.text },
                    isSelected && { color: '#fff' },
                    cell.isToday && !isSelected && { color: theme.tint, fontWeight: '700' },
                  ]}
                >
                  {cell.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.todayButton, { backgroundColor: theme.accentPill }]}
          onPress={goToToday}
        >
          <Text style={[styles.todayButtonText, { color: theme.tint }]}>Today</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  arrow: { padding: spacing.sm },
  arrowText: { fontSize: 28, fontWeight: '300' },
  monthTitle: { fontSize: 18, fontWeight: '600' },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  weekday: { fontSize: 12, fontWeight: '600', width: 40, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    maxWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.full,
    marginVertical: 2,
  },
  cellDimmed: { opacity: 0.5 },
  cellText: { fontSize: 15, fontWeight: '500' },
  todayButton: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
  },
  todayButtonText: { fontSize: 15, fontWeight: '600' },
});

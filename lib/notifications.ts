import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a local notification for a due item reminder.
 * nextDueISO: date "YYYY-MM-DD". dueTime: optional 24h "HH:mm" (e.g. "19:00" for 7pm).
 * Reminder fires at (nextDue - remindDaysBefore) at dueTime, or 9:00 if no dueTime.
 */
export async function scheduleDueReminder(
  itemId: string,
  itemTitle: string,
  nextDueISO: string,
  remindDaysBefore: number,
  dueTime?: string | null
): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;

  const timePart = dueTime && /^\d{1,2}:\d{2}$/.test(dueTime) ? dueTime : '09:00';
  const [h, m] = timePart.split(':').map(Number);
  const dueDate = new Date(nextDueISO + 'T12:00:00');
  dueDate.setHours(h, m ?? 0, 0, 0);
  const remindDate = new Date(dueDate);
  remindDate.setDate(remindDate.getDate() - remindDaysBefore);
  if (remindDate.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Due soon',
      body: `${itemTitle} is due in ${remindDaysBefore} days`,
      data: { itemId },
    },
    trigger: { date: remindDate, channelId: 'due-reminders', type: Notifications.SchedulableTriggerInputTypes.DATE },
  });
  return id;
}

export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

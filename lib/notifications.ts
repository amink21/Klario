import * as Notifications from 'expo-notifications';
import { normalizeDueTime } from '@/lib/date';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
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
 * When dueTime is set: fires at that exact time (user's requested time).
 * When no dueTime: fires (remindDaysBefore) days before at 09:00.
 */
export async function scheduleDueReminder(
  itemId: string,
  itemTitle: string,
  nextDueISO: string,
  remindDaysBefore: number,
  dueTime?: string | null,
  _remindMinutesBefore?: number
): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;

  const normalizedTime = dueTime ? normalizeDueTime(dueTime) : null;
  const timePart = normalizedTime ?? '09:00';
  const [h, min] = timePart.split(':').map(Number);
  const [y, mo, d] = nextDueISO.split('-').map(Number);
  const dueDate = new Date(y!, mo! - 1, d!, h, min ?? 0, 0, 0);
  const remindDate = new Date(dueDate);

  if (normalizedTime) {
    // Fire at the exact time the user asked for (e.g. 12pm)
  } else {
    remindDate.setDate(remindDate.getDate() - remindDaysBefore);
  }

  if (remindDate.getTime() <= Date.now()) return null;

  const bodyLabel = normalizedTime
    ? `${itemTitle} is due now. Tap to open.`
    : `${itemTitle} — reminder (${remindDaysBefore} day${remindDaysBefore === 1 ? '' : 's'} before due). Tap to open.`;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Reminder',
      body: bodyLabel,
      data: { type: 'due_reminder', itemId },
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

const MORNING_BRIEF_DATA = { type: 'morning_brief' } as const;

/**
 * Cancel any existing morning brief daily notification (so we can reschedule at new time).
 */
export async function cancelMorningBriefNotification(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content?.data && (n.content.data as Record<string, string>).type === 'morning_brief') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Schedule the daily morning brief notification at the given time (HH:mm, 24h).
 * Call cancelMorningBriefNotification() first if changing time or disabling.
 */
export async function scheduleMorningBriefNotification(timeHHMM: string): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;

  const normalized = normalizeDueTime(timeHHMM);
  if (!normalized) return null;

  const [hStr, mStr] = normalized.split(':');
  const hour = parseInt(hStr ?? '7', 10);
  const minute = parseInt(mStr ?? '0', 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Morning brief',
      body: 'Your daily summary is ready. Tap to view.',
      data: MORNING_BRIEF_DATA,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: 'due-reminders',
      hour,
      minute,
    },
  });
  return id;
}

/**
 * Update morning brief notification from settings: cancel if disabled, otherwise schedule at morningBriefTime.
 */
export async function updateMorningBriefSchedule(settings: {
  morningBrief: boolean;
  morningBriefTime?: string;
}): Promise<void> {
  await cancelMorningBriefNotification();
  if (settings.morningBrief && settings.morningBriefTime) {
    await scheduleMorningBriefNotification(settings.morningBriefTime);
  }
}

/**
 * Show the morning brief notification immediately (for preview in settings).
 * Returns true if permission granted and notification was shown.
 */
export async function previewMorningBriefNotification(): Promise<boolean> {
  const granted = await requestPermissions();
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Morning brief',
      body: 'Your daily summary is ready. Tap to view.',
      data: MORNING_BRIEF_DATA,
    },
    trigger: null,
  });
  return true;
}

/**
 * Show a sample due-reminder notification immediately (for preview in settings).
 * Uses placeholder itemId so tapping opens Today without a specific item.
 */
export async function previewDueReminderNotification(): Promise<boolean> {
  const granted = await requestPermissions();
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Reminder',
      body: 'Car insurance — reminder (1 day before due). Tap to open.',
      data: { type: 'due_reminder', itemId: 'preview' },
    },
    trigger: null,
  });
  return true;
}

/** Cancel any scheduled smart-nudge notifications. */
export async function cancelNudgeNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content?.data && (n.content.data as Record<string, string>).type === 'nudge') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Schedule a smart nudge notification at the given date.
 * Data includes type: 'nudge' and nudgeId for analytics/deep link.
 */
export async function scheduleNudgeNotification(
  title: string,
  body: string,
  nudgeId: string,
  triggerDate: Date
): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;
  if (triggerDate.getTime() <= Date.now()) return null;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: 'nudge', nudgeId },
    },
    trigger: {
      date: triggerDate,
      channelId: 'due-reminders',
      type: Notifications.SchedulableTriggerInputTypes.DATE,
    },
  });
  return id;
}

/** Demo messages for smart nudge previews in settings (one per category). */
export const DEMO_NUDGE_SAMPLES: { label: string; title: string; body: string }[] = [
  { label: 'Spending', title: 'Klovio', body: "You've spent $47 this week. Quick check-in?" },
  { label: 'Subscriptions', title: 'Klovio', body: 'Your subscriptions cost $29 this month.' },
  { label: 'Statement', title: 'Klovio', body: "Haven't imported a statement this month yet." },
  { label: 'Positive', title: 'Klovio', body: "You've been consistent this week 👏" },
  { label: 'Check-in', title: 'Klovio', body: 'Quick check-in? 📱' },
];

/**
 * Show a smart nudge notification immediately (for preview in settings).
 * Returns true if permission granted.
 */
export async function previewNudgeNotification(title: string, body: string, nudgeId: string = 'preview'): Promise<boolean> {
  const granted = await requestPermissions();
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: 'nudge', nudgeId },
    },
    trigger: null,
  });
  return true;
}

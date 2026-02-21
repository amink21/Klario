import type { SettingsState } from './types';

export function defaultSettings(): SettingsState {
  return {
    morningBrief: true,
    morningBriefTime: '07:00',
    dueItemReminders: true,
    defaultRemindDaysBefore: 1,
    smartNudges: true,
  };
}

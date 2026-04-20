/**
 * Smart nudges: contextual notifications (spending insights, statement reminders,
 * positive reinforcement, check-ins). Pseudo-random: conditions + min days between same nudge.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LifeItem, Transaction, Subscription, SettingsState } from './types';
import { todayISO, startOfMonthISO } from './date';
import { formatCurrency } from './currency';
import { computeLifeStatus } from './forecast';
import { cancelNudgeNotifications, scheduleNudgeNotification } from './notifications';

const NUDGE_STORAGE_KEY = 'klovio_nudge_state';

export interface NudgeState {
  lastAppOpenISO: string;
  lastImportISO: string;
  /** nudgeId -> date when we last scheduled/showed this nudge */
  lastShown: Record<string, string>;
  /** For streak: number of consecutive days with at least one open */
  consecutiveOpenDays?: number;
}

const DEFAULT_NUDGE_STATE: NudgeState = {
  lastAppOpenISO: '',
  lastImportISO: '',
  lastShown: {},
  consecutiveOpenDays: 0,
};

export async function getNudgeState(): Promise<NudgeState> {
  try {
    const raw = await AsyncStorage.getItem(NUDGE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NUDGE_STATE };
    const parsed = JSON.parse(raw) as Partial<NudgeState>;
    return {
      lastAppOpenISO: parsed.lastAppOpenISO ?? '',
      lastImportISO: parsed.lastImportISO ?? '',
      lastShown: parsed.lastShown ?? {},
      consecutiveOpenDays: parsed.consecutiveOpenDays ?? 0,
    };
  } catch {
    return { ...DEFAULT_NUDGE_STATE };
  }
}

async function setNudgeState(state: NudgeState): Promise<void> {
  await AsyncStorage.setItem(NUDGE_STORAGE_KEY, JSON.stringify(state));
}

/** Call when user imports a statement (paste or file). */
export async function setLastImportISO(iso: string): Promise<void> {
  const state = await getNudgeState();
  await setNudgeState({ ...state, lastImportISO: iso });
}

export interface NudgeContext {
  items: LifeItem[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  settings: SettingsState | null;
  nudgeState: NudgeState;
  /** Previous lastAppOpenISO (before this open) for "haven't opened in X days" nudges. */
  previousLastAppOpenISO?: string;
}

/** Start of current month (YYYY-MM-DD). */
function startOfMonth(): string {
  return startOfMonthISO();
}

/** ISO date for N days ago. */
function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Transactions in the last 7 days (expenses only, positive amountCents). */
function transactionsThisWeek(txs: Transaction[]): Transaction[] {
  const cutoff = daysAgoISO(7);
  return txs.filter((t) => t.dateISO >= cutoff && t.amountCents > 0);
}

/** Count transactions in a category (or title match) in the last 7 days. */
function countThisWeekByCategory(txs: Transaction[], category: string): number {
  return transactionsThisWeek(txs).filter((t) => t.category === category).length;
}

function countThisWeekByTitleHint(txs: Transaction[], hint: string): number {
  const lower = hint.toLowerCase();
  return transactionsThisWeek(txs).filter((t) => t.title.toLowerCase().includes(lower)).length;
}

/** Subscriptions due in current month: sum amountCents. */
function subscriptionsCostThisMonth(subs: Subscription[]): number {
  const start = startOfMonth();
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  const endISO = end.toISOString().slice(0, 10);
  return subs
    .filter((s) => s.nextDueISO >= start && s.nextDueISO <= endISO)
    .reduce((sum, s) => sum + s.amountCents, 0);
}

/** Total spend in the last 7 days. */
function spendThisWeekCents(txs: Transaction[]): number {
  return transactionsThisWeek(txs).reduce((sum, t) => sum + t.amountCents, 0);
}

type NudgeDef = {
  id: string;
  minDaysBetween: number;
  getMessage: (ctx: NudgeContext) => Promise<string | null>;
};

const NUDGES: NudgeDef[] = [
  // --- Smart insights ---
  {
    id: 'coffee_week',
    minDaysBetween: 7,
    getMessage: async (ctx) => {
      const count = countThisWeekByTitleHint(ctx.transactions, 'coffee') || countThisWeekByCategory(ctx.transactions, 'Food');
      if (count < 3) return null;
      return `You had ${count} coffee/food purchases this week ☕ Just an FYI.`;
    },
  },
  {
    id: 'subscriptions_month',
    minDaysBetween: 14,
    getMessage: async (ctx) => {
      const total = subscriptionsCostThisMonth(ctx.subscriptions);
      if (total <= 0) return null;
      return `Your subscriptions cost ${formatCurrency(total)} this month.`;
    },
  },
  {
    id: 'spend_week',
    minDaysBetween: 5,
    getMessage: async (ctx) => {
      const cents = spendThisWeekCents(ctx.transactions);
      if (cents < 500) return null; // $5+
      return `You've spent ${formatCurrency(cents)} this week. Quick check-in?`;
    },
  },
  // --- Statement / import reminders ---
  {
    id: 'import_this_month',
    minDaysBetween: 10,
    getMessage: async (ctx) => {
      const monthStart = startOfMonth();
      if (ctx.nudgeState.lastImportISO >= monthStart) return null;
      const messages = [
        "Haven't imported a statement this month yet.",
        'Ready to upload your latest bank statement?',
        "Let's keep your finances up to date.",
      ];
      return messages[Math.floor(Math.random() * messages.length)]!;
    },
  },
  {
    id: 'new_month_statement',
    minDaysBetween: 8,
    getMessage: async (ctx) => {
      const today = todayISO();
      const dayOfMonth = parseInt(today.slice(8, 10), 10);
      if (dayOfMonth > 7) return null; // Only first week of month
      if (ctx.nudgeState.lastImportISO >= startOfMonth()) return null;
      return 'New month = new statement?';
    },
  },
  // --- Positive reinforcement ---
  {
    id: 'consistent_week',
    minDaysBetween: 7,
    getMessage: async (ctx) => {
      const streak = ctx.nudgeState.consecutiveOpenDays ?? 0;
      if (streak < 4) return null;
      const messages = [
        "You've been consistent this week 👏",
        "You're staying on top of things 💪",
      ];
      return messages[Math.floor(Math.random() * messages.length)]!;
    },
  },
  {
    id: 'on_top_of_things',
    minDaysBetween: 5,
    getMessage: async (ctx) => {
      const status = computeLifeStatus(ctx.items.filter((i) => i.status === 'active'));
      if (status !== 'Stable') return null;
      const messages = [
        "Nice job staying on top of things 💪",
        "You're on top of your reminders.",
      ];
      return messages[Math.floor(Math.random() * messages.length)]!;
    },
  },
  {
    id: 'positive_generic',
    minDaysBetween: 4,
    getMessage: async () => {
      const messages = [
        'Quick 30-second check-in?',
        'Takes 1 minute to review today.',
        "Your future self will thank you.",
      ];
      return messages[Math.floor(Math.random() * messages.length)]!;
    },
  },
  // --- Random smart (triggers) ---
  {
    id: 'haven_opened_3_days',
    minDaysBetween: 14,
    getMessage: async (ctx) => {
      const last = ctx.previousLastAppOpenISO ?? ctx.nudgeState.lastAppOpenISO;
      if (!last) return null;
      const today = todayISO();
      const [y0, m0, d0] = last.split('-').map(Number);
      const [y1, m1, d1] = today.split('-').map(Number);
      const daysSince = Math.round((new Date(y1!, m1! - 1, d1!).getTime() - new Date(y0!, m0! - 1, d0!).getTime()) / (24 * 60 * 60 * 1000));
      if (daysSince < 3) return null;
      const messages = [
        'Quick 30-second check-in?',
        'Takes 1 minute to review today.',
      ];
      return messages[Math.floor(Math.random() * messages.length)]!;
    },
  },
  {
    id: 'end_of_month',
    minDaysBetween: 6,
    getMessage: async () => {
      const today = todayISO();
      const y = parseInt(today.slice(0, 4), 10);
      const m = parseInt(today.slice(5, 7), 10);
      const day = parseInt(today.slice(8, 10), 10);
      const lastDay = new Date(y, m, 0).getDate(); // last day of current month
      if (day < lastDay - 2) return null; // Only in last 3 days of month
      return 'End of month approaching. Ready to review?';
    },
  },
  {
    id: 'checkin_gentle',
    minDaysBetween: 3,
    getMessage: async () => {
      const messages = [
        'Quick check-in? 📱',
        'One minute to stay on track.',
      ];
      return messages[Math.floor(Math.random() * messages.length)]!;
    },
  },
];

function wasShownRecently(state: NudgeState, nudgeId: string, minDays: number): boolean {
  const last = state.lastShown[nudgeId];
  if (!last) return false;
  const today = todayISO();
  const [y1, m1, d1] = today.split('-').map(Number);
  const [y0, m0, d0] = last.split('-').map(Number);
  const daysSince = (new Date(y1!, m1! - 1, d1!).getTime() - new Date(y0!, m0! - 1, d0!).getTime()) / (24 * 60 * 60 * 1000);
  return daysSince < minDays;
}

/**
 * Run on app open: update last-open state, then if smart nudges are on,
 * pick one eligible nudge and schedule it for tomorrow (9–11am random).
 * Cancels any previously scheduled nudge so only one is ever pending.
 */
export async function runNudgeScheduler(ctx: Omit<NudgeContext, 'nudgeState'>): Promise<void> {
  const settings = ctx.settings;
  if (settings?.smartNudges === false) return;

  const state = await getNudgeState();
  const today = todayISO();

  // Update last app open and consecutive-day streak
  const lastOpen = state.lastAppOpenISO;
  let consecutiveOpenDays = state.consecutiveOpenDays ?? 0;
  if (lastOpen) {
    const [y0, m0, d0] = lastOpen.split('-').map(Number);
    const [y1, m1, d1] = today.split('-').map(Number);
    const daysDiff = Math.round((new Date(y1!, m1! - 1, d1!).getTime() - new Date(y0!, m0! - 1, d0!).getTime()) / (24 * 60 * 60 * 1000));
    if (daysDiff === 0) {
      // Same day, keep streak
    } else if (daysDiff === 1) {
      consecutiveOpenDays += 1;
    } else {
      consecutiveOpenDays = 1;
    }
  } else {
    consecutiveOpenDays = 1;
  }

  const newState: NudgeState = {
    ...state,
    lastAppOpenISO: today,
    lastShown: { ...state.lastShown },
    consecutiveOpenDays,
  };
  await setNudgeState(newState);

  const fullCtx: NudgeContext = {
    ...ctx,
    nudgeState: newState,
    previousLastAppOpenISO: state.lastAppOpenISO,
  };

  const eligible: { id: string; message: string }[] = [];
  for (const nudge of NUDGES) {
    if (wasShownRecently(newState, nudge.id, nudge.minDaysBetween)) continue;
    const message = await nudge.getMessage(fullCtx);
    if (message) eligible.push({ id: nudge.id, message });
  }

  if (eligible.length === 0) return;

  // Pick one at random
  const chosen = eligible[Math.floor(Math.random() * eligible.length)]!;

  // Schedule for tomorrow between 9:00 and 11:00 local
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const hour = 9 + Math.floor(Math.random() * 3);
  const minute = Math.floor(Math.random() * 60);
  tomorrow.setHours(hour, minute, 0, 0);

  await cancelNudgeNotifications();
  const id = await scheduleNudgeNotification(
    'Klovio',
    chosen.message,
    chosen.id,
    tomorrow
  );
  if (id) {
    newState.lastShown[chosen.id] = today;
    await setNudgeState(newState);
  }
}

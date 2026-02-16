import type { LifeItem, Transaction, Subscription, SettingsState } from './types';

function id(): string {
  return Math.random().toString(36).slice(2, 11);
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function defaultSettings(): SettingsState {
  return {
    morningBrief: true,
    dueItemReminders: true,
    defaultRemindDaysBefore: 7,
  };
}

export function demoLifeItems(): LifeItem[] {
  const base = daysFromNow(5);
  return [
    {
      id: id(),
      title: 'Car insurance',
      category: 'Insurance',
      amountCents: 12500,
      cadence: 'monthly',
      nextDueISO: base,
      remindDaysBefore: 3,
      status: 'active',
    },
    {
      id: id(),
      title: 'Phone bill',
      category: 'Utilities',
      amountCents: 8500,
      cadence: 'monthly',
      nextDueISO: daysFromNow(12),
      remindDaysBefore: 7,
      status: 'active',
    },
    {
      id: id(),
      title: 'Passport renewal',
      category: 'Documents',
      amountCents: 19000,
      cadence: 'one_time',
      nextDueISO: daysFromNow(45),
      remindDaysBefore: 30,
      status: 'active',
    },
    {
      id: id(),
      title: 'Netflix',
      category: 'Subscriptions',
      amountCents: 2099,
      cadence: 'monthly',
      nextDueISO: daysFromNow(20),
      remindDaysBefore: 2,
      status: 'active',
    },
    {
      id: id(),
      title: 'Annual vet checkup',
      category: 'Pets',
      amountCents: 15000,
      cadence: 'yearly',
      nextDueISO: daysFromNow(90),
      remindDaysBefore: 14,
      status: 'active',
    },
  ];
}

export function demoTransactions(): Transaction[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);
  return [
    { id: id(), title: 'Groceries', amountCents: 7850, category: 'Food', dateISO: yesterdayISO, merchant: 'Loblaws' },
    { id: id(), title: 'Gas', amountCents: 6200, category: 'Transport', dateISO: yesterdayISO },
    { id: id(), title: 'Coffee', amountCents: 650, category: 'Food', dateISO: yesterdayISO },
  ];
}

export function demoSubscriptions(): Subscription[] {
  return [
    { id: id(), title: 'Spotify', amountCents: 1099, cadence: 'monthly', nextDueISO: daysFromNow(8), detected: false },
    { id: id(), title: 'iCloud', amountCents: 1299, cadence: 'monthly', nextDueISO: daysFromNow(15), detected: false },
  ];
}

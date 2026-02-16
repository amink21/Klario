import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LifeItem, Transaction, Subscription, SettingsState } from './types';

const KEYS = {
  LIFE_ITEMS: 'life_items',
  TRANSACTIONS: 'transactions',
  SUBSCRIPTIONS: 'subscriptions',
  SETTINGS: 'settings',
  HAS_SEEDED: 'has_seeded',
} as const;

/** In-memory cache; load once and persist on writes. Swap this layer for Supabase later. */
let cache: {
  items: LifeItem[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  settings: SettingsState | null;
} = {
  items: [],
  transactions: [],
  subscriptions: [],
  settings: null,
};

let initialized = false;

async function loadAll(): Promise<void> {
  if (initialized) return;
  try {
    const [itemsJson, txJson, subJson, settingsJson] = await Promise.all([
      AsyncStorage.getItem(KEYS.LIFE_ITEMS),
      AsyncStorage.getItem(KEYS.TRANSACTIONS),
      AsyncStorage.getItem(KEYS.SUBSCRIPTIONS),
      AsyncStorage.getItem(KEYS.SETTINGS),
    ]);
    cache.items = itemsJson ? JSON.parse(itemsJson) : [];
    cache.transactions = txJson ? JSON.parse(txJson) : [];
    cache.subscriptions = subJson ? JSON.parse(subJson) : [];
    cache.settings = settingsJson ? JSON.parse(settingsJson) : null;
  } catch {
    cache = { items: [], transactions: [], subscriptions: [], settings: null };
  }
  initialized = true;
}

async function persist(): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEYS.LIFE_ITEMS, JSON.stringify(cache.items)),
    AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(cache.transactions)),
    AsyncStorage.setItem(KEYS.SUBSCRIPTIONS, JSON.stringify(cache.subscriptions)),
    AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(cache.settings)),
  ]);
}

// --- Life items ---
export async function getLifeItems(): Promise<LifeItem[]> {
  await loadAll();
  return [...cache.items];
}

export async function setLifeItems(items: LifeItem[]): Promise<void> {
  await loadAll();
  cache.items = items;
  await persist();
}

export async function addLifeItem(item: LifeItem): Promise<void> {
  await loadAll();
  cache.items.push(item);
  await persist();
}

export async function updateLifeItem(id: string, patch: Partial<LifeItem>): Promise<void> {
  await loadAll();
  const i = cache.items.findIndex((x) => x.id === id);
  if (i === -1) return;
  cache.items[i] = { ...cache.items[i], ...patch };
  await persist();
}

export async function getLifeItem(id: string): Promise<LifeItem | null> {
  await loadAll();
  return cache.items.find((x) => x.id === id) ?? null;
}

export async function deleteLifeItem(id: string): Promise<void> {
  await loadAll();
  cache.items = cache.items.filter((x) => x.id !== id);
  await persist();
}

// --- Transactions ---
export async function getTransactions(): Promise<Transaction[]> {
  await loadAll();
  return [...cache.transactions];
}

export async function addTransaction(tx: Transaction): Promise<void> {
  await loadAll();
  cache.transactions.unshift(tx);
  await persist();
}

export async function setTransactions(txs: Transaction[]): Promise<void> {
  await loadAll();
  cache.transactions = txs;
  await persist();
}

// --- Subscriptions ---
export async function getSubscriptions(): Promise<Subscription[]> {
  await loadAll();
  return [...cache.subscriptions];
}

export async function setSubscriptions(subs: Subscription[]): Promise<void> {
  await loadAll();
  cache.subscriptions = subs;
  await persist();
}

export async function addSubscription(sub: Subscription): Promise<void> {
  await loadAll();
  cache.subscriptions.push(sub);
  await persist();
}

// --- Settings ---
const DEFAULT_SETTINGS: SettingsState = {
  morningBrief: true,
  dueItemReminders: true,
  defaultRemindDaysBefore: 7,
};

export async function getSettings(): Promise<SettingsState> {
  await loadAll();
  return cache.settings ?? DEFAULT_SETTINGS;
}

export async function setSettings(settings: SettingsState): Promise<void> {
  await loadAll();
  cache.settings = settings;
  await persist();
}

// --- Seed / Reset ---
export async function hasSeeded(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEYS.HAS_SEEDED);
  return v === '1';
}

export async function setSeeded(): Promise<void> {
  await AsyncStorage.setItem(KEYS.HAS_SEEDED, '1');
}

/** Reset all data and clear seeded flag (for demo reset). */
export async function resetAllData(): Promise<void> {
  cache = {
    items: [],
    transactions: [],
    subscriptions: [],
    settings: {
      morningBrief: true,
      dueItemReminders: true,
      defaultRemindDaysBefore: 7,
    },
  };
  initialized = true;
  await AsyncStorage.multiRemove([
    KEYS.LIFE_ITEMS,
    KEYS.TRANSACTIONS,
    KEYS.SUBSCRIPTIONS,
    KEYS.SETTINGS,
    KEYS.HAS_SEEDED,
  ]);
}

/*
 * SUPABASE SWAP (later):
 * - Replace loadAll/persist with Supabase client calls.
 * - getLifeItems() -> supabase.from('life_items').select('*')
 * - setLifeItems() -> delete + insert or upsert by id
 * - Same pattern for transactions, subscriptions, settings.
 * - Keep this file as the single data access layer so components don't change.
 */

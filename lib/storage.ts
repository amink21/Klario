import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LifeItem, Transaction, Subscription, SettingsState } from './types';
import { supabase } from './supabase';
import {
  getUserId,
  fetchLifeItems,
  insertLifeItem as sbInsertLifeItem,
  setLifeItems as sbSetLifeItems,
  updateLifeItem as sbUpdateLifeItem,
  deleteLifeItem as sbDeleteLifeItem,
  fetchTransactions,
  insertTransaction as sbInsertTransaction,
  insertTransactions as sbInsertTransactions,
  setTransactions as sbSetTransactions,
  deleteTransaction as sbDeleteTransaction,
  updateTransaction as sbUpdateTransaction,
  fetchSettings as sbFetchSettings,
  upsertSettings as sbUpsertSettings,
} from './supabase-data';

const KEYS = {
  LIFE_ITEMS: 'life_items',
  TRANSACTIONS: 'transactions',
  SUBSCRIPTIONS: 'subscriptions',
  SETTINGS: 'settings',
  HAS_SEEDED: 'has_seeded',
  QUICK_ADD_SETTINGS: 'quick_add_settings',
} as const;

const QUICK_ADD_KEYS: (keyof SettingsState)[] = [
  'quickAddEnabled',
  'quickAddShortcutInstalledConfirmed',
  'quickAddBackTapConfiguredConfirmed',
];

function pickQuickAdd(s: SettingsState): Partial<SettingsState> {
  const out: Partial<SettingsState> = {};
  for (const k of QUICK_ADD_KEYS) {
    if (s[k] !== undefined) (out as Record<string, unknown>)[k] = s[k];
  }
  return out;
}

/** When Supabase is configured, all data goes through Supabase. */
function useSupabase(): boolean {
  return !!supabase;
}

/** Use Supabase only when configured and user is signed in; otherwise use local storage. */
async function useSupabaseAuth(): Promise<boolean> {
  if (!supabase) return false;
  const uid = await getUserId();
  return !!uid;
}

/** Local cache and persistence only when Supabase is not configured. */
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
  if (await useSupabaseAuth()) return fetchLifeItems();
  await loadAll();
  return [...cache.items];
}

export async function setLifeItems(items: LifeItem[]): Promise<void> {
  if (await useSupabaseAuth()) {
    await sbSetLifeItems(items);
    return;
  }
  await loadAll();
  cache.items = items;
  await persist();
}

export async function addLifeItem(item: LifeItem): Promise<void> {
  if (await useSupabaseAuth()) {
    await sbInsertLifeItem(item);
    return;
  }
  await loadAll();
  cache.items.push(item);
  await persist();
}

export async function updateLifeItem(id: string, patch: Partial<LifeItem>): Promise<void> {
  if (await useSupabaseAuth()) {
    await sbUpdateLifeItem(id, patch);
    return;
  }
  await loadAll();
  const i = cache.items.findIndex((x) => x.id === id);
  if (i === -1) return;
  cache.items[i] = { ...cache.items[i], ...patch };
  await persist();
}

export async function getLifeItem(id: string): Promise<LifeItem | null> {
  if (await useSupabaseAuth()) {
    const items = await fetchLifeItems();
    return items.find((x) => x.id === id) ?? null;
  }
  await loadAll();
  return cache.items.find((x) => x.id === id) ?? null;
}

export async function deleteLifeItem(id: string): Promise<void> {
  if (await useSupabaseAuth()) {
    await sbDeleteLifeItem(id);
    return;
  }
  await loadAll();
  cache.items = cache.items.filter((x) => x.id !== id);
  await persist();
}

// --- Transactions ---
export async function getTransactions(): Promise<Transaction[]> {
  if (await useSupabaseAuth()) return fetchTransactions();
  await loadAll();
  return [...cache.transactions];
}

export async function addTransaction(tx: Transaction): Promise<void> {
  if (await useSupabaseAuth()) {
    await sbInsertTransaction(tx);
    return;
  }
  await loadAll();
  cache.transactions.unshift(tx);
  await persist();
}

/** Add multiple transactions in one go (e.g. after PDF import). Use batch insert when Supabase is active. */
export async function addTransactions(txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return;
  if (await useSupabaseAuth()) {
    await sbInsertTransactions(txs);
    return;
  }
  await loadAll();
  for (const tx of txs) cache.transactions.unshift(tx);
  await persist();
}

export async function setTransactions(txs: Transaction[]): Promise<void> {
  if (await useSupabaseAuth()) {
    await sbSetTransactions(txs);
    return;
  }
  await loadAll();
  cache.transactions = txs;
  await persist();
}

export async function deleteTransaction(id: string): Promise<void> {
  if (await useSupabaseAuth()) {
    await sbDeleteTransaction(id);
    return;
  }
  await loadAll();
  cache.transactions = cache.transactions.filter((t) => t.id !== id);
  await persist();
}

export async function updateTransaction(tx: Transaction): Promise<void> {
  if (await useSupabaseAuth()) {
    await sbUpdateTransaction(tx);
    return;
  }
  await loadAll();
  const idx = cache.transactions.findIndex((t) => t.id === tx.id);
  if (idx >= 0) {
    cache.transactions[idx] = tx;
    await persist();
  }
}

// --- Subscriptions (local only; not synced to Supabase) ---
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
export const DEFAULT_SETTINGS: SettingsState = {
  morningBrief: true,
  morningBriefTime: '07:00',
  dueItemReminders: true,
  defaultRemindDaysBefore: 1,
  smartNudges: true,
  quickAddEnabled: false,
  quickAddShortcutInstalledConfirmed: false,
  quickAddBackTapConfiguredConfirmed: false,
};

export async function getSettings(): Promise<SettingsState> {
  if (await useSupabaseAuth()) {
    const remote = await sbFetchSettings();
    const base = remote ?? DEFAULT_SETTINGS;
    try {
      const qaJson = await AsyncStorage.getItem(KEYS.QUICK_ADD_SETTINGS);
      const qa = qaJson ? (JSON.parse(qaJson) as Partial<SettingsState>) : {};
      return { ...base, ...qa };
    } catch {
      return base;
    }
  }
  await loadAll();
  return cache.settings ?? DEFAULT_SETTINGS;
}

export async function setSettings(settings: SettingsState): Promise<void> {
  if (await useSupabaseAuth()) {
    await AsyncStorage.setItem(KEYS.QUICK_ADD_SETTINGS, JSON.stringify(pickQuickAdd(settings)));
    await sbUpsertSettings(settings);
    return;
  }
  await loadAll();
  cache.settings = settings;
  await persist();
}

// --- Seed flag ---
export async function hasSeeded(): Promise<boolean> {
  if (await useSupabaseAuth()) {
    const s = await getSettings();
    return s.hasSeeded ?? false;
  }
  const v = await AsyncStorage.getItem(KEYS.HAS_SEEDED);
  return v === '1';
}

export async function setSeeded(): Promise<void> {
  if (await useSupabaseAuth()) {
    const current = await getSettings();
    await sbUpsertSettings({ ...current, hasSeeded: true });
    return;
  }
  await AsyncStorage.setItem(KEYS.HAS_SEEDED, '1');
}

/** Reset all data. When Supabase configured, deletes all user rows; always clears local cache. */
export async function resetAllData(): Promise<void> {
  const uid = supabase ? await getUserId() : null;
  if (supabase && uid) {
    await supabase.from('life_items').delete().eq('user_id', uid);
    await supabase.from('transactions').delete().eq('user_id', uid);
    await supabase.from('subscriptions').delete().eq('user_id', uid);
    await supabase.from('settings').delete().eq('user_id', uid);
  }
  cache = {
    items: [],
    transactions: [],
    subscriptions: [],
    settings: { ...DEFAULT_SETTINGS, hasSeeded: false },
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

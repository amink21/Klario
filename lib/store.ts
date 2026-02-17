import { create } from 'zustand';
import type { LifeItem, Transaction, Subscription, SettingsState } from './types';
import {
  getLifeItems,
  setLifeItems,
  getTransactions,
  addTransaction as addTxStorage,
  deleteTransaction as deleteTxStorage,
  updateTransaction as updateTxStorage,
  getSubscriptions,
  setSubscriptions as setSubsStorage,
  getSettings,
  setSettings as setSettingsStorage,
} from './storage';

interface AppState {
  items: LifeItem[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  settings: SettingsState | null;
  loaded: boolean;
  load: () => Promise<void>;
  setItems: (items: LifeItem[]) => Promise<void>;
  addTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  setSubscriptions: (subs: Subscription[]) => Promise<void>;
  refreshSettings: () => Promise<void>;
  setSettings: (s: SettingsState) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  items: [],
  transactions: [],
  subscriptions: [],
  settings: null,
  loaded: false,

  load: async () => {
    const [rawItems, rawTx, rawSubs, settings] = await Promise.all([
      getLifeItems(),
      getTransactions(),
      getSubscriptions(),
      getSettings(),
    ]);
    // Dedupe by id (keep first) to prevent duplicate key errors in lists
    const seenIds = (id: string, set: Set<string>) => {
      if (set.has(id)) return false;
      set.add(id);
      return true;
    };
    const itemIds = new Set<string>();
    const items = rawItems.filter((i) => seenIds(i.id, itemIds));
    const txIds = new Set<string>();
    const transactions = rawTx.filter((t) => seenIds(t.id, txIds));
    const subIds = new Set<string>();
    const subscriptions = rawSubs.filter((s) => seenIds(s.id, subIds));
    set({ items, transactions, subscriptions, settings, loaded: true });
  },

  setItems: async (items) => {
    await setLifeItems(items);
    set({ items });
  },

  addTransaction: async (tx) => {
    await addTxStorage(tx);
    set((s) => ({ transactions: [tx, ...s.transactions] }));
  },

  deleteTransaction: async (id) => {
    await deleteTxStorage(id);
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
  },

  updateTransaction: async (tx) => {
    await updateTxStorage(tx);
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === tx.id ? tx : t)),
    }));
  },

  setSubscriptions: async (subs) => {
    await setSubsStorage(subs);
    set({ subscriptions: subs });
  },

  refreshSettings: async () => {
    const settings = await getSettings();
    set({ settings });
  },

  setSettings: async (s) => {
    await setSettingsStorage(s);
    set({ settings: s });
  },
}));

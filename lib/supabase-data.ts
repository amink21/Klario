import { supabase } from "@/lib/supabase";
import { normalizeDueTime } from "@/lib/date";
import type {
    LifeItem,
    SettingsState,
    Subscription,
    Transaction,
} from "@/lib/types";

type DbLifeItem = Record<string, unknown>;
type DbTransaction = Record<string, unknown>;
type DbSubscription = Record<string, unknown>;
type DbSettings = Record<string, unknown>;

function rowToLifeItem(r: DbLifeItem): LifeItem {
  return {
    id: String(r.id),
    title: String(r.title),
    category: String(r.category ?? "Other"),
    amountCents: r.amount_cents != null ? Number(r.amount_cents) : undefined,
    cadence: (r.cadence as LifeItem["cadence"]) ?? "one_time",
    nextDueISO: String(r.next_due_iso),
    dueTime: r.due_time != null ? (normalizeDueTime(String(r.due_time)) ?? null) : null,
    remindDaysBefore: Number(r.remind_days_before ?? 7),
    status: (r.status as LifeItem["status"]) ?? "active",
    notes: r.notes != null ? String(r.notes) : undefined,
    notificationId:
      r.notification_id != null ? String(r.notification_id) : null,
  };
}

function rowToTransaction(r: DbTransaction): Transaction {
  return {
    id: String(r.id),
    title: String(r.title),
    amountCents: Number(r.amount_cents),
    category: String(r.category ?? "Other"),
    dateISO: String(r.date_iso),
    merchant: r.merchant != null ? String(r.merchant) : undefined,
  };
}

function rowToSubscription(r: DbSubscription): Subscription {
  return {
    id: String(r.id),
    title: String(r.title),
    amountCents: Number(r.amount_cents),
    cadence: (r.cadence as Subscription["cadence"]) ?? "monthly",
    nextDueISO: String(r.next_due_iso),
    detected: Boolean(r.detected),
    aiMeta:
      r.ai_meta != null &&
      typeof r.ai_meta === "object" &&
      "confidence" in r.ai_meta
        ? {
            confidence: Number(
              (r.ai_meta as { confidence: unknown }).confidence,
            ),
          }
        : undefined,
  };
}

function rowToSettings(r: DbSettings): SettingsState {
  const morningTime = r.morning_brief_time != null ? String(r.morning_brief_time) : undefined;
  return {
    morningBrief: Boolean(r.morning_brief ?? true),
    morningBriefTime: morningTime && /^\d{1,2}:\d{2}$/.test(morningTime) ? morningTime : '07:00',
    dueItemReminders: Boolean(r.due_item_reminders ?? true),
    defaultRemindDaysBefore: (() => {
      const n = Number(r.default_remind_days_before ?? 1);
      return n >= 1 && n <= 365 ? n : 1;
    })(),
    hasSeeded: Boolean(r.has_seeded ?? false),
  };
}

/** Exported so storage can decide whether to use Supabase or local. */
export async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// --- Life items ---
export async function fetchLifeItems(): Promise<LifeItem[]> {
  const uid = await getUserId();
  if (!supabase || !uid) return [];
  const { data, error } = await supabase
    .from("life_items")
    .select("*")
    .eq("user_id", uid)
    .order("next_due_iso", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToLifeItem(r as DbLifeItem));
}

export async function setLifeItems(items: LifeItem[]): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const { error: delErr } = await supabase
    .from("life_items")
    .delete()
    .eq("user_id", uid);
  if (delErr) throw delErr;
  if (items.length === 0) return;
  const rows = items.map((item) => ({
    id: item.id,
    user_id: uid,
    title: item.title,
    category: item.category,
    amount_cents: item.amountCents ?? null,
    cadence: item.cadence,
    next_due_iso: item.nextDueISO,
    due_time: item.dueTime ?? null,
    remind_days_before: item.remindDaysBefore,
    status: item.status,
    notes: item.notes ?? null,
    notification_id: item.notificationId ?? null,
  }));
  const { error } = await supabase.from("life_items").insert(rows);
  if (error) throw error;
}

export async function insertLifeItem(item: LifeItem): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const row = {
    id: item.id,
    user_id: uid,
    title: item.title,
    category: item.category,
    amount_cents: item.amountCents ?? null,
    cadence: item.cadence,
    next_due_iso: item.nextDueISO,
    due_time: item.dueTime ?? null,
    remind_days_before: item.remindDaysBefore,
    status: item.status,
    notes: item.notes ?? null,
    notification_id: item.notificationId ?? null,
  };
  const { error } = await supabase.from("life_items").insert(row);
  if (error) throw error;
}

export async function updateLifeItem(
  id: string,
  patch: Partial<LifeItem>,
): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const row: Record<string, unknown> = {};
  if (patch.title != null) row.title = patch.title;
  if (patch.category != null) row.category = patch.category;
  if (patch.amountCents !== undefined)
    row.amount_cents = patch.amountCents ?? null;
  if (patch.cadence != null) row.cadence = patch.cadence;
  if (patch.nextDueISO != null) row.next_due_iso = patch.nextDueISO;
  if (patch.dueTime !== undefined) row.due_time = patch.dueTime ?? null;
  if (patch.remindDaysBefore != null)
    row.remind_days_before = patch.remindDaysBefore;
  if (patch.status != null) row.status = patch.status;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  if (patch.notificationId !== undefined)
    row.notification_id = patch.notificationId ?? null;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase
    .from("life_items")
    .update(row)
    .eq("id", id)
    .eq("user_id", uid);
  if (error) throw error;
}

export async function deleteLifeItem(id: string): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("life_items")
    .delete()
    .eq("id", id)
    .eq("user_id", uid);
  if (error) throw error;
}

// --- Transactions ---
export async function fetchTransactions(): Promise<Transaction[]> {
  const uid = await getUserId();
  if (!supabase || !uid) return [];
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", uid)
    .order("date_iso", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToTransaction(r as DbTransaction));
}

export async function insertTransaction(tx: Transaction): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const row = {
    id: tx.id,
    user_id: uid,
    title: tx.title,
    amount_cents: tx.amountCents,
    category: tx.category,
    date_iso: tx.dateISO,
    merchant: tx.merchant ?? null,
  };
  const { error } = await supabase.from("transactions").insert(row);
  if (error) throw error;
}

export async function setTransactions(txs: Transaction[]): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const { error: delErr } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", uid);
  if (delErr) throw delErr;
  if (txs.length === 0) return;
  const rows = txs.map((tx) => ({
    id: tx.id,
    user_id: uid,
    title: tx.title,
    amount_cents: tx.amountCents,
    category: tx.category,
    date_iso: tx.dateISO,
    merchant: tx.merchant ?? null,
  }));
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", uid);
  if (error) throw error;
}

export async function updateTransaction(tx: Transaction): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const row = {
    title: tx.title,
    amount_cents: tx.amountCents,
    category: tx.category,
    date_iso: tx.dateISO,
    merchant: tx.merchant ?? null,
  };
  const { error } = await supabase
    .from("transactions")
    .update(row)
    .eq("id", tx.id)
    .eq("user_id", uid);
  if (error) throw error;
}

// --- Subscriptions ---
export async function fetchSubscriptions(): Promise<Subscription[]> {
  const uid = await getUserId();
  if (!supabase || !uid) return [];
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", uid)
    .order("next_due_iso", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToSubscription(r as DbSubscription));
}

export async function insertSubscription(sub: Subscription): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const row = {
    id: sub.id,
    user_id: uid,
    title: sub.title,
    amount_cents: sub.amountCents,
    cadence: sub.cadence,
    next_due_iso: sub.nextDueISO,
    detected: sub.detected,
    ai_meta: sub.aiMeta ?? null,
  };
  const { error } = await supabase.from("subscriptions").insert(row);
  if (error) throw error;
}

export async function setSubscriptions(subs: Subscription[]): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const { error: delErr } = await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", uid);
  if (delErr) throw delErr;
  if (subs.length === 0) return;
  const rows = subs.map((sub) => ({
    id: sub.id,
    user_id: uid,
    title: sub.title,
    amount_cents: sub.amountCents,
    cadence: sub.cadence,
    next_due_iso: sub.nextDueISO,
    detected: sub.detected,
    ai_meta: sub.aiMeta ?? null,
  }));
  const { error } = await supabase.from("subscriptions").insert(rows);
  if (error) throw error;
}

// --- Settings ---
export async function fetchSettings(): Promise<SettingsState | null> {
  const uid = await getUserId();
  if (!supabase || !uid) return null;
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data != null ? rowToSettings(data as DbSettings) : null;
}

export async function upsertSettings(settings: SettingsState): Promise<void> {
  const uid = await getUserId();
  if (!supabase || !uid) throw new Error("Not authenticated");
  const row = {
    user_id: uid,
    morning_brief: settings.morningBrief,
    morning_brief_time: settings.morningBriefTime ?? '07:00',
    due_item_reminders: settings.dueItemReminders,
    default_remind_days_before: settings.defaultRemindDaysBefore,
    has_seeded: settings.hasSeeded ?? false,
  };
  const { error } = await supabase
    .from("settings")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}

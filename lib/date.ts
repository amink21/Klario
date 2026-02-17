/**
 * Parse date-only ISO (YYYY-MM-DD) as local midnight. Avoids new Date(iso) being UTC midnight.
 */
function parseDateOnlyLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 0, 0, 0, 0);
}

/**
 * Days from now until the given ISO date (can be negative if in the past).
 * Uses local date so "today" is correct in the user's timezone.
 */
export function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const then = parseDateOnlyLocal(iso);
  return Math.round((then.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Human-readable relative date: "Today", "Tomorrow", "In 5 days", "Yesterday", "5 days ago".
 */
export function formatRelativeDate(iso: string): string {
  const days = daysUntil(iso);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0 && days <= 7) return `In ${days} days`;
  if (days < 0 && days >= -7) return `${Math.abs(days)} days ago`;
  const d = iso.length === 10 ? parseDateOnlyLocal(iso) : new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

/** Normalize "HH:mm" or "HH:mm:ss" to "HH:mm" for comparison; return null if invalid. */
export function normalizeDueTime(dueTime: string | null | undefined): string | null {
  if (dueTime == null || typeof dueTime !== 'string') return null;
  const t = dueTime.trim();
  const match = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const h = parseInt(match[1]!, 10);
  const m = parseInt(match[2]!, 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Due moment as timestamp (for sorting and overdue check).
 * If dueTime is set, use that time on the given date; else end of day (23:59).
 * Accepts "HH:mm" or "HH:mm:ss" (e.g. from DB).
 */
export function getDueTimestamp(iso: string, dueTime?: string | null): number {
  const [y, m, d] = iso.split('-').map(Number);
  const normalized = normalizeDueTime(dueTime);
  if (normalized) {
    const [h, min] = normalized.split(':').map(Number);
    return new Date(y!, m! - 1, d!, h, min ?? 0, 0, 0).getTime();
  }
  return new Date(y!, m! - 1, d!, 23, 59, 59, 999).getTime();
}

/** True if the due datetime (date + optional time) has passed. */
export function isOverdue(iso: string, dueTime?: string | null): boolean {
  return Date.now() > getDueTimestamp(iso, dueTime);
}

/**
 * "in X days" / "Today" / "Overdue" for due items.
 * When dueTime is set, "Overdue" only if the full due datetime has passed.
 */
export function formatDueIn(iso: string, dueTime?: string | null): string {
  const days = daysUntil(iso);
  const overdue = isOverdue(iso, dueTime);
  if (overdue) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 0 && days <= 7) return `In ${days} days`;
  if (days < 0) return 'Overdue';
  return `In ${days} days`;
}

/**
 * Start of today in local time as ISO string (date only).
 * Uses local date so timezone doesn't flip to next/previous day.
 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Yesterday date string (YYYY-MM-DD) in local time.
 */
export function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Tomorrow date string (YYYY-MM-DD) in local time.
 */
export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Add cadence to a date and return next due ISO.
 */
export function addCadenceToDate(iso: string, cadence: 'one_time' | 'daily' | 'monthly' | 'yearly'): string {
  const d = iso.length === 10 ? parseDateOnlyLocal(iso) : new Date(iso);
  if (cadence === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (cadence === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (cadence === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Start of current month (YYYY-MM-DD).
 */
export function startOfMonthISO(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

/**
 * Format 24h time "HH:mm" or "HH:mm:ss" for display: "7:00 PM", "1:00 AM".
 */
export function formatTimeHHMM(hhmm: string): string {
  const normalized = normalizeDueTime(hhmm);
  if (!normalized) return hhmm;
  const [hStr, mStr] = normalized.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  if (h === 0 && m === 0) return '12:00 AM';
  if (h === 12) return `12:${String(m).padStart(2, '0')} PM`;
  if (h < 12) return `${h}:${String(m).padStart(2, '0')} AM`;
  return `${h - 12}:${String(m).padStart(2, '0')} PM`;
}

/**
 * Format ISO date for display: "Today" if today, else "Saturday, Feb 14".
 */
export function formatDisplayDate(iso?: string): string {
  const target = iso ? (iso.length === 10 ? parseDateOnlyLocal(iso) : new Date(iso)) : new Date();
  const today = new Date();
  if (
    target.getDate() === today.getDate() &&
    target.getMonth() === today.getMonth() &&
    target.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }
  return target.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get calendar grid for a month: array of { iso, day, isCurrentMonth, isToday } for 6 rows × 7 days.
 */
export function getMonthGrid(year: number, month: number): { iso: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const today = new Date();
  const todayISOStr = today.toISOString().slice(0, 10);
  const out: { iso: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
  const totalCells = 42;
  for (let i = 0; i < totalCells; i++) {
    const dayIndex = i - startPad + 1;
    if (dayIndex < 1) {
      const prev = new Date(year, month, 0);
      prev.setDate(prev.getDate() + dayIndex);
      const iso = prev.toISOString().slice(0, 10);
      out.push({ iso, day: prev.getDate(), isCurrentMonth: false, isToday: iso === todayISOStr });
    } else if (dayIndex > daysInMonth) {
      const d = new Date(year, month, dayIndex);
      const iso = d.toISOString().slice(0, 10);
      out.push({ iso, day: d.getDate(), isCurrentMonth: false, isToday: iso === todayISOStr });
    } else {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayIndex).padStart(2, '0')}`;
      out.push({
        iso,
        day: dayIndex,
        isCurrentMonth: true,
        isToday: iso === todayISOStr,
      });
    }
  }
  return out;
}

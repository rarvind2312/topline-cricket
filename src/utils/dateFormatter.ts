// src/utils/dateFormat.ts

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Tue, 03-Feb-2026 (uses *local* device timezone) */
export function formatDayDate(input: Date): string {
  const wd = WEEKDAYS[input.getDay()];
  const dd = pad2(input.getDate());
  const mm = MONTHS[input.getMonth()];
  const yyyy = input.getFullYear();
  return `${wd}, ${dd}-${mm}-${yyyy}`;
}

/** Tue, 03-Feb-2026 06:44 (24-hour) */
export function formatDayDateTime(input: Date): string {
  return `${formatDayDate(input)} ${pad2(input.getHours())}:${pad2(input.getMinutes())}`;
}

/** Safe convert Firestore Timestamp / Date / number(ms) / string -> Date|null */
export function safeToDate(input: any): Date | null {
  if (!input) return null;

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  // Firestore Timestamp
  if (typeof input === 'object' && typeof input.toDate === 'function') {
    try {
      const d = input.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }

  // number (ms)
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // string
  if (typeof input === 'string') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/** YYYY-MM-DD -> Tue, 03-Feb-2026 (parsed as local date, not UTC) */
export function formatDayDateFromYYYYMMDD(dateKey: string): string {
  if (!dateKey) return '—';
  const [y, m, d] = dateKey.split('-').map(n => parseInt(n, 10));
  if (!y || !m || !d) return dateKey;

  // local date (important!)
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return formatDayDate(dt);
}
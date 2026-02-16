export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type DayHours = { open: string; close: string; isClosed: boolean };
export type WeekHours = Record<DayKey, DayHours>;

export type OpeningPeriod = {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label?: string;
  week: WeekHours;
  updatedAtMs?: number;
  updatedBy?: string;
  createdAtMs?: number;
};

export type OpeningOverride = {
  id: string;
  date: string; // YYYY-MM-DD
  isClosed: boolean;
  open?: string;
  close?: string;
  reason?: string;
  updatedAtMs?: number;
  updatedBy?: string;
};

export const DEFAULT_DAY: DayHours = { open: "06:00", close: "21:00", isClosed: false };
export const DEFAULT_WEEK: WeekHours = {
  mon: { ...DEFAULT_DAY },
  tue: { ...DEFAULT_DAY },
  wed: { ...DEFAULT_DAY },
  thu: { ...DEFAULT_DAY },
  fri: { ...DEFAULT_DAY },
  sat: { ...DEFAULT_DAY },
  sun: { ...DEFAULT_DAY },
};

export const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export function dayKeyFromDate(d: Date): DayKey {
  const idx = d.getDay();
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"][idx] as DayKey) || "mon";
}

export function dateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function mergeWeek(week?: Partial<WeekHours>): WeekHours {
  return {
    ...DEFAULT_WEEK,
    ...(week || {}),
  } as WeekHours;
}

function isValidDateKey(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
}

export function findPeriodForDate(
  periods: OpeningPeriod[],
  dateKey: string
): OpeningPeriod | null {
  if (!isValidDateKey(dateKey) || !Array.isArray(periods)) return null;
  const sorted = [...periods].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
  for (const p of sorted) {
    const start = String(p.startDate || "");
    const end = String(p.endDate || "");
    if (!isValidDateKey(start) || !isValidDateKey(end)) continue;
    if (dateKey >= start && dateKey <= end) return p;
  }
  return null;
}

export function getDayHoursForDate(params: {
  date: Date;
  dateKey: string;
  defaultWeek: WeekHours;
  periods: OpeningPeriod[];
  override: OpeningOverride | null;
}): DayHours {
  const { date, dateKey, defaultWeek, periods, override } = params;
  const period = findPeriodForDate(periods, dateKey);
  const baseWeek = mergeWeek(period?.week || defaultWeek);
  const dayKey = dayKeyFromDate(date);
  const baseHours = baseWeek[dayKey] || DEFAULT_DAY;

  if (override) {
    if (override.isClosed) {
      return { ...baseHours, isClosed: true };
    }
    if (override.open && override.close) {
      return { open: override.open, close: override.close, isClosed: false };
    }
  }

  return baseHours;
}

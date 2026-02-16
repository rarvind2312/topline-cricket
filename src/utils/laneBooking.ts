export type TimeBlock = { start: string; end: string };

export type LaneType = "short" | "long";

export const normalizeLaneType = (value: unknown): LaneType => {
  const v = String(value || "").trim().toLowerCase();
  return v === "long" ? "long" : "short";
};

export const toMinutes = (hhmm: string): number => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
};

export const toHHMM = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

type BlockRange = { startM: number; endM: number };

const toRange = (block: TimeBlock, openM: number, closeM: number): BlockRange | null => {
  const s = toMinutes(block.start);
  const e = toMinutes(block.end);
  if (s < 0 || e < 0 || e <= s) return null;
  const startM = Math.max(s, openM);
  const endM = Math.min(e, closeM);
  if (endM <= startM) return null;
  return { startM, endM };
};

const mergeRanges = (ranges: BlockRange[]): BlockRange[] => {
  const sorted = [...ranges].sort((a, b) => a.startM - b.startM);
  const merged: BlockRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...r });
      continue;
    }
    if (r.startM <= last.endM) {
      last.endM = Math.max(last.endM, r.endM);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
};

export const computeWindows = (
  open: string,
  close: string,
  blocks: TimeBlock[]
): TimeBlock[] => {
  const openM = toMinutes(open);
  const closeM = toMinutes(close);
  if (openM < 0 || closeM < 0 || closeM <= openM) return [];

  const ranges = blocks
    .map((b) => toRange(b, openM, closeM))
    .filter(Boolean) as BlockRange[];

  const merged = mergeRanges(ranges);
  if (merged.length === 0) return [{ start: open, end: close }];

  const windows: TimeBlock[] = [];
  let cursor = openM;
  for (const r of merged) {
    if (cursor < r.startM) {
      windows.push({ start: toHHMM(cursor), end: toHHMM(r.startM) });
    }
    cursor = Math.max(cursor, r.endM);
  }
  if (cursor < closeM) {
    windows.push({ start: toHHMM(cursor), end: toHHMM(closeM) });
  }
  return windows;
};

export const isSlotAvailable = (
  open: string,
  close: string,
  blocks: TimeBlock[],
  slotStart: string,
  slotEnd: string
): boolean => {
  const openM = toMinutes(open);
  const closeM = toMinutes(close);
  const s = toMinutes(slotStart);
  const e = toMinutes(slotEnd);
  if (openM < 0 || closeM < 0 || s < 0 || e < 0 || e <= s) return false;
  if (s < openM || e > closeM) return false;

  const ranges = blocks
    .map((b) => toRange(b, openM, closeM))
    .filter(Boolean) as BlockRange[];
  const merged = mergeRanges(ranges);
  return !merged.some((r) => s < r.endM && r.startM < e);
};

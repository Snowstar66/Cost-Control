import type { TimelineMonth } from "./types";

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function toMonthKey(date: Date | string): string {
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateOrToday(value?: string): Date {
  if (!value) return startOfMonth(new Date());
  const match = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  const parsed = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3] ?? "1")) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? startOfMonth(new Date()) : parsed;
}

export function monthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat("sv-SE", { month: "short" }).format(date).replace(".", "");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

export function buildTimelineMonths(monthsBack: number, monthsForward: number, now = new Date()): TimelineMonth[] {
  const current = startOfMonth(now);
  const months: TimelineMonth[] = [];
  for (let offset = -monthsBack; offset <= monthsForward; offset += 1) {
    const date = addMonths(current, offset);
    months.push({
      key: toMonthKey(date),
      label: `${monthLabel(date)} ${date.getFullYear()}`,
      date,
      isCurrentMonth: offset === 0
    });
  }
  return months;
}

export function isSameOrBeforeMonth(a: string | Date, b: string | Date): boolean {
  return toMonthKey(a) <= toMonthKey(b);
}

export function isSameOrAfterMonth(a: string | Date, b: string | Date): boolean {
  return toMonthKey(a) >= toMonthKey(b);
}

export function addNotice(date: Date, value = 0, unit: "days" | "months" = "months"): Date {
  if (unit === "days") {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + value);
    return copy;
  }
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + value);
  return copy;
}

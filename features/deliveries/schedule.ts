// AC-7: collection slots are two hours wide, run today or over the next six
// days, never in the past and never more than seven days out. Stored as the
// slot's start instant in UTC.

const OPEN_HOUR = 8;
const CLOSE_HOUR = 20;
const SLOT_HOURS = 2;
const DAY_COUNT = 7;
const HORIZON_MS = 7 * 24 * 60 * 60 * 1000;

const dayFormat = new Intl.DateTimeFormat('en-NG', { weekday: 'short' });
const timeFormat = new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit' });

export type DayOption = { index: number; date: Date };
export type Slot = { iso: string; from: string; to: string };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayOptions(now: Date): DayOption[] {
  const base = startOfDay(now);
  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    return { index, date };
  });
}

export function dayLabel(day: DayOption, labels: { today: string; tomorrow: string }): string {
  if (day.index === 0) return labels.today;
  if (day.index === 1) return labels.tomorrow;
  return dayFormat.format(day.date);
}

/** Every legal slot for one day, with past and beyond horizon windows dropped. */
export function slotsForDay(day: DayOption, now: Date): Slot[] {
  const horizon = now.getTime() + HORIZON_MS;
  const slots: Slot[] = [];
  for (let hour = OPEN_HOUR; hour + SLOT_HOURS <= CLOSE_HOUR; hour += SLOT_HOURS) {
    const from = new Date(day.date);
    from.setHours(hour, 0, 0, 0);
    const to = new Date(day.date);
    to.setHours(hour + SLOT_HOURS, 0, 0, 0);
    if (from.getTime() <= now.getTime() || from.getTime() > horizon) continue;
    slots.push({ iso: from.toISOString(), from: timeFormat.format(from), to: timeFormat.format(to) });
  }
  return slots;
}

/** A stored slot back into a display range, used by the summary and confirmation. */
export function formatSlot(iso: string, labels: { today: string; tomorrow: string }): string {
  const from = new Date(iso);
  const to = new Date(from.getTime() + SLOT_HOURS * 60 * 60 * 1000);
  return `${dayLabelFor(from, labels)}, ${timeFormat.format(from)} – ${timeFormat.format(to)}`;
}

function dayLabelFor(date: Date, labels: { today: string; tomorrow: string }): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.tomorrow;
  return dayFormat.format(date);
}

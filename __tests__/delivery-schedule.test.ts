import { dayOptions, formatSlot, slotsForDay } from '@/features/deliveries/schedule';

// AC-7: two hour slots, today through the sixth day after, never in the past
// and never more than seven days out. The maths is local to the device, so
// every assertion here is about the shape of the list, not a clock reading.

const labels = { today: 'Today', tomorrow: 'Tomorrow' };
const now = new Date(2026, 9, 18, 10, 30, 0, 0); // a Sunday morning, 10:30 local
const HORIZON_MS = 7 * 24 * 60 * 60 * 1000;

describe('dayOptions', () => {
  // covers: AC-7
  it('offers today plus the next six days', () => {
    const days = dayOptions(now);
    expect(days).toHaveLength(7);
    expect(days[0].date.toDateString()).toBe(new Date(2026, 9, 18).toDateString());
    expect(days[6].date.toDateString()).toBe(new Date(2026, 9, 24).toDateString());
  });
});

describe('slotsForDay', () => {
  // covers: AC-7
  it('is two hours wide across an eight to twenty working day', () => {
    const slots = slotsForDay(dayOptions(now)[1], now); // tomorrow: nothing is past
    expect(slots).toHaveLength(6);
    const starts = slots.map((slot) => new Date(slot.iso));
    expect(starts.map((from) => from.getHours())).toEqual([8, 10, 12, 14, 16, 18]);
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i].getTime() - starts[i - 1].getTime()).toBe(2 * 60 * 60 * 1000);
    }
  });

  // covers: AC-7
  it('drops the slots that have already gone today', () => {
    const slots = slotsForDay(dayOptions(now)[0], now);
    expect(slots.every((slot) => new Date(slot.iso).getTime() > now.getTime())).toBe(true);
    expect(slots.map((slot) => new Date(slot.iso).getHours())).toEqual([12, 14, 16, 18]);
  });

  // covers: AC-7
  it('keeps every slot inside the seven day horizon', () => {
    for (const day of dayOptions(now)) {
      for (const slot of slotsForDay(day, now)) {
        const from = new Date(slot.iso).getTime();
        expect(from).toBeLessThanOrEqual(now.getTime() + HORIZON_MS);
      }
    }
  });

  // covers: AC-7
  it('offers nothing once the last slot of the day has started', () => {
    const lateEvening = new Date(2026, 9, 24, 19, 45, 0, 0);
    expect(slotsForDay(dayOptions(lateEvening)[0], lateEvening)).toEqual([]);
    // Tomorrow is still open, and the day after that.
    expect(slotsForDay(dayOptions(lateEvening)[1], lateEvening)).toHaveLength(6);
  });
});

describe('formatSlot', () => {
  // covers: AC-7, AC-9
  it('shows a stored slot back as its day and window', () => {
    // The day words are relative to the real clock, so these two use today.
    const noonToday = new Date();
    noonToday.setHours(12, 0, 0, 0);
    const noonTomorrow = new Date();
    noonTomorrow.setDate(noonTomorrow.getDate() + 1);
    noonTomorrow.setHours(12, 0, 0, 0);

    expect(formatSlot(noonToday.toISOString(), labels)).toContain('Today');
    expect(formatSlot(noonTomorrow.toISOString(), labels)).toContain('Tomorrow');
    expect(formatSlot(noonToday.toISOString(), labels)).toMatch(/12/);
  });
});

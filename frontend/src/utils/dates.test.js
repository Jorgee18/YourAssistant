import { describe, expect, it } from 'vitest';
import { calendarDays, monthRange, sameDay } from './dates.js';

describe('calendar helpers', () => {
  it('creates a Monday-first grid with every day in the month', () => {
    const days = calendarDays(new Date(2026, 3, 15));
    const values = days.filter(Boolean);
    expect(days.length % 7).toBe(0);
    expect(values).toHaveLength(30);
    expect(values[0].getDate()).toBe(1);
    expect(values.at(-1).getDate()).toBe(30);
  });

  it('returns a half-open ISO range covering one local month', () => {
    const range = monthRange(new Date(2026, 3, 15));
    expect(new Date(range.from).getMonth()).toBe(3);
    expect(new Date(range.to).getMonth()).toBe(4);
    expect(new Date(range.from).getDate()).toBe(1);
    expect(new Date(range.to).getDate()).toBe(1);
  });

  it('compares calendar days without comparing their time', () => {
    expect(sameDay(new Date(2026, 3, 2, 8), new Date(2026, 3, 2, 22))).toBe(true);
    expect(sameDay(new Date(2026, 3, 2), new Date(2026, 3, 3))).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  describeOffset,
  getOffsetParts,
  toOffsetMinutes
} from './notification-offset.js';

describe('notification lead time', () => {
  it('formats common offsets and decomposes custom offsets', () => {
    expect(describeOffset(0)).toBe('A la hora');
    expect(describeOffset(10080)).toBe('1 semana antes');
    expect(getOffsetParts(2880)).toEqual({ amount: '2', unit: 'days' });
  });

  it('converts custom units and enforces the one-year maximum', () => {
    expect(toOffsetMinutes('3', 'days')).toBe(4320);
    expect(toOffsetMinutes('2', 'weeks')).toBe(20160);
    expect(toOffsetMinutes('400', 'days')).toBeNull();
    expect(toOffsetMinutes('0', 'hours')).toBeNull();
  });
});

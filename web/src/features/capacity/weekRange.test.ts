import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_WEEKS, parseWeekRange, shiftWeeks, weekCount, weeksStarting, withFrom, withTo } from './weekRange';

const range = { from: '2025-12-29', to: '2026-01-18' };

describe.each(['UTC', 'Pacific/Auckland', 'America/Los_Angeles'])('week ranges in %s', (timeZone) => {
  beforeEach(() => {
    vi.stubEnv('TZ', timeZone);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('starts on the Monday of the local week', () => {
    const lateSundayEvening = new Date(2026, 0, 4, 23, 30);
    expect(weeksStarting(lateSundayEvening, 2)).toEqual({ from: '2025-12-29', to: '2026-01-11' });
  });

  it('shifts by whole weeks across year and DST boundaries', () => {
    expect(shiftWeeks(range, 1)).toEqual({ from: '2026-01-05', to: '2026-01-25' });
    expect(shiftWeeks(range, -1)).toEqual({ from: '2025-12-22', to: '2026-01-11' });
    expect(shiftWeeks({ from: '2026-03-23', to: '2026-03-29' }, 1)).toEqual({ from: '2026-03-30', to: '2026-04-05' });
  });

  it('counts weeks', () => {
    expect(weekCount(range)).toBe(3);
  });
});

describe('withFrom / withTo', () => {
  it('snaps the chosen day to its week', () => {
    expect(withFrom(range, '2026-01-07')).toEqual({ from: '2026-01-05', to: '2026-01-18' });
    expect(withTo(range, '2026-01-07')).toEqual({ from: '2025-12-29', to: '2026-01-11' });
  });

  it('drags the other end along when the range would invert', () => {
    expect(withFrom(range, '2026-02-04')).toEqual({ from: '2026-02-02', to: '2026-02-08' });
    expect(withTo(range, '2025-12-10')).toEqual({ from: '2025-12-08', to: '2025-12-14' });
  });

  it('never exceeds the maximum span', () => {
    expect(weekCount(withFrom(range, '2025-01-06'))).toBe(MAX_WEEKS);
    expect(weekCount(withTo(range, '2026-12-31'))).toBe(MAX_WEEKS);
  });
});

describe('parseWeekRange', () => {
  it('accepts a valid range and snaps it to whole weeks', () => {
    expect(parseWeekRange('2025-12-31', '2026-01-14')).toEqual(range);
  });

  it('rejects missing, malformed, inverted, implausible or oversized ranges', () => {
    expect(parseWeekRange(null, '2026-01-14')).toBeNull();
    expect(parseWeekRange('2026-02-30', '2026-03-01')).toBeNull();
    expect(parseWeekRange('2026-01-14', '2025-12-31')).toBeNull();
    expect(parseWeekRange('0002-01-05', '2026-01-14')).toBeNull();
    expect(parseWeekRange('2025-01-06', '2026-01-04')).toBeNull();
  });
});

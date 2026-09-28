import { describe, expect, it } from 'vitest';
import { allocationStatus } from './allocation';

describe('allocationStatus', () => {
  it('classifies a week against capacity', () => {
    expect(allocationStatus(0, 40)).toBe('free');
    expect(allocationStatus(30, 40)).toBe('under');
    expect(allocationStatus(40, 40)).toBe('full');
    expect(allocationStatus(45, 40)).toBe('over');
  });

  it('treats any booking against zero capacity as over-allocated', () => {
    expect(allocationStatus(20, 0)).toBe('over');
    expect(allocationStatus(0, 0)).toBe('free');
  });
});

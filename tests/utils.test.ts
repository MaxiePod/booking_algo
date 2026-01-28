import { describe, it, expect } from 'vitest';
import {
  slotsOverlap,
  slotsAdjacent,
  slotDuration,
  mergeSlots,
  findFreeSlots,
  longestContiguousBlock,
  totalBookedMinutes,
  formatTime,
} from '../src/algorithm/utils';
import type { AssignedReservation } from '../src/algorithm/types';

describe('slotsOverlap', () => {
  it('detects overlapping slots', () => {
    expect(slotsOverlap({ start: 0, end: 60 }, { start: 30, end: 90 })).toBe(true);
  });

  it('adjacent slots do not overlap', () => {
    expect(slotsOverlap({ start: 0, end: 60 }, { start: 60, end: 120 })).toBe(false);
  });

  it('non-overlapping slots', () => {
    expect(slotsOverlap({ start: 0, end: 60 }, { start: 120, end: 180 })).toBe(false);
  });
});

describe('slotsAdjacent', () => {
  it('detects adjacent slots', () => {
    expect(slotsAdjacent({ start: 0, end: 60 }, { start: 60, end: 120 })).toBe(true);
    expect(slotsAdjacent({ start: 60, end: 120 }, { start: 0, end: 60 })).toBe(true);
  });

  it('non-adjacent slots', () => {
    expect(slotsAdjacent({ start: 0, end: 60 }, { start: 90, end: 120 })).toBe(false);
  });
});

describe('slotDuration', () => {
  it('calculates duration', () => {
    expect(slotDuration({ start: 480, end: 540 })).toBe(60);
    expect(slotDuration({ start: 0, end: 1440 })).toBe(1440);
  });
});

describe('mergeSlots', () => {
  it('merges adjacent slots', () => {
    const merged = mergeSlots({ start: 0, end: 60 }, { start: 60, end: 120 });
    expect(merged).toEqual({ start: 0, end: 120 });
  });

  it('merges overlapping slots', () => {
    const merged = mergeSlots({ start: 0, end: 90 }, { start: 60, end: 120 });
    expect(merged).toEqual({ start: 0, end: 120 });
  });
});

describe('findFreeSlots', () => {
  const makeRes = (id: string, start: number, end: number): AssignedReservation => ({
    id,
    slot: { start, end },
    mode: 'flexible',
    courtId: 'c1',
  });

  it('returns full range when no bookings', () => {
    const free = findFreeSlots([], 'c1', 480, 1320);
    expect(free).toEqual([{ start: 480, end: 1320 }]);
  });

  it('finds gaps between bookings', () => {
    const assignments = [
      makeRes('r1', 480, 540),
      makeRes('r2', 600, 660),
    ];
    const free = findFreeSlots(assignments, 'c1', 480, 1320);
    expect(free).toEqual([
      { start: 540, end: 600 },
      { start: 660, end: 1320 },
    ]);
  });

  it('returns no free slots when fully booked', () => {
    const assignments = [makeRes('r1', 480, 1320)];
    const free = findFreeSlots(assignments, 'c1', 480, 1320);
    expect(free).toHaveLength(0);
  });
});

describe('longestContiguousBlock', () => {
  const makeRes = (id: string, start: number, end: number): AssignedReservation => ({
    id,
    slot: { start, end },
    mode: 'flexible',
    courtId: 'c1',
  });

  it('returns 0 for no bookings', () => {
    expect(longestContiguousBlock([], 'c1')).toBe(0);
  });

  it('finds contiguous blocks', () => {
    const assignments = [
      makeRes('r1', 480, 540),
      makeRes('r2', 540, 600), // contiguous with r1
      makeRes('r3', 660, 720), // separate
    ];
    expect(longestContiguousBlock(assignments, 'c1')).toBe(120);
  });
});

describe('totalBookedMinutes', () => {
  it('sums booked minutes', () => {
    const assignments: AssignedReservation[] = [
      { id: 'r1', slot: { start: 480, end: 540 }, mode: 'flexible', courtId: 'c1' },
      { id: 'r2', slot: { start: 600, end: 720 }, mode: 'flexible', courtId: 'c1' },
    ];
    expect(totalBookedMinutes(assignments, 'c1')).toBe(180);
  });
});

describe('formatTime', () => {
  it('formats minutes to HH:MM', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(480)).toBe('08:00');
    expect(formatTime(810)).toBe('13:30');
    expect(formatTime(1320)).toBe('22:00');
  });
});

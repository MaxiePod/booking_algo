import { describe, it, expect } from 'vitest';
import {
  analyzeGaps,
  totalGapMinutes,
  fragmentationScore,
  largestUsableGap,
  gapsForCourt,
} from '../src/algorithm/gap-analyzer';
import type {
  AssignedReservation,
  Court,
  OperatingSchedule,
} from '../src/algorithm/types';

const courts: Court[] = [
  { id: 'c1', name: 'Court 1' },
  { id: 'c2', name: 'Court 2' },
];

const schedule: OperatingSchedule = {
  openTime: 480, // 8:00
  closeTime: 1320, // 22:00
  minSlotDuration: 60,
};

describe('analyzeGaps', () => {
  it('returns full operating hours as gap when no bookings', () => {
    const gaps = analyzeGaps([], courts, schedule);
    expect(gaps).toHaveLength(2); // one per court
    expect(gaps[0].duration).toBe(840); // 14 hours
    expect(gaps[0].stranded).toBe(false);
  });

  it('identifies gaps between bookings', () => {
    const assignments: AssignedReservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 540 },
        mode: 'flexible',
        courtId: 'c1',
      },
      {
        id: 'r2',
        slot: { start: 600, end: 660 },
        mode: 'flexible',
        courtId: 'c1',
      },
    ];

    const gaps = analyzeGaps(assignments, courts, schedule);
    const c1Gaps = gapsForCourt(gaps, 'c1');

    // Should have a 60-min gap between bookings and a gap at end
    expect(c1Gaps.length).toBe(2);
    expect(c1Gaps[0].slot.start).toBe(540);
    expect(c1Gaps[0].slot.end).toBe(600);
    expect(c1Gaps[0].duration).toBe(60);
  });

  it('marks small gaps as stranded', () => {
    const assignments: AssignedReservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 540 },
        mode: 'flexible',
        courtId: 'c1',
      },
      {
        id: 'r2',
        slot: { start: 570, end: 660 },
        mode: 'flexible',
        courtId: 'c1',
      },
    ];

    const gaps = analyzeGaps(assignments, courts, schedule);
    const c1Gaps = gapsForCourt(gaps, 'c1');
    const smallGap = c1Gaps.find(
      (g) => g.slot.start === 540 && g.slot.end === 570
    );
    expect(smallGap).toBeDefined();
    expect(smallGap!.duration).toBe(30);
    expect(smallGap!.stranded).toBe(true);
  });
});

describe('totalGapMinutes', () => {
  it('sums all gap durations', () => {
    const gaps = analyzeGaps([], courts, schedule);
    // 2 courts × 840 min = 1680
    expect(totalGapMinutes(gaps)).toBe(1680);
  });
});

describe('fragmentationScore', () => {
  it('returns 0 when no gaps', () => {
    // Fill both courts completely
    const assignments: AssignedReservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 1320 },
        mode: 'flexible',
        courtId: 'c1',
      },
      {
        id: 'r2',
        slot: { start: 480, end: 1320 },
        mode: 'flexible',
        courtId: 'c2',
      },
    ];
    const gaps = analyzeGaps(assignments, courts, schedule);
    expect(fragmentationScore(gaps, courts, schedule)).toBe(0);
  });

  it('returns > 0 when there are gaps', () => {
    const gaps = analyzeGaps([], courts, schedule);
    const score = fragmentationScore(gaps, courts, schedule);
    expect(score).toBeGreaterThan(0);
  });
});

describe('largestUsableGap', () => {
  it('returns null when no usable gaps', () => {
    const result = largestUsableGap([]);
    expect(result).toBeNull();
  });

  it('finds the largest non-stranded gap', () => {
    const assignments: AssignedReservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 600 },
        mode: 'flexible',
        courtId: 'c1',
      },
      {
        id: 'r2',
        slot: { start: 660, end: 780 },
        mode: 'flexible',
        courtId: 'c1',
      },
    ];
    const gaps = analyzeGaps(assignments, courts, schedule);
    const c1Gaps = gapsForCourt(gaps, 'c1');
    const largest = largestUsableGap(c1Gaps);
    expect(largest).toBeDefined();
    expect(largest!.duration).toBe(540); // gap from 780 to 1320
  });
});

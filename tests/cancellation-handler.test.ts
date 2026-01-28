import { describe, it, expect } from 'vitest';
import { handleCancellation } from '../src/algorithm/cancellation-handler';
import type {
  AssignedReservation,
  AssignerConfig,
  Court,
  OperatingSchedule,
} from '../src/algorithm/types';

const courts: Court[] = [
  { id: 'c1', name: 'Court 1' },
  { id: 'c2', name: 'Court 2' },
];

const schedule: OperatingSchedule = {
  openTime: 480,
  closeTime: 1320,
  minSlotDuration: 60,
};

const config: AssignerConfig = { courts, schedule };

describe('handleCancellation', () => {
  it('removes the cancelled reservation', () => {
    const assignments: AssignedReservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 540 },
        mode: 'flexible',
        courtId: 'c1',
      },
      {
        id: 'r2',
        slot: { start: 540, end: 600 },
        mode: 'flexible',
        courtId: 'c1',
      },
    ];

    const result = handleCancellation('r1', assignments, config);
    expect(result.assignments.find((a) => a.id === 'r1')).toBeUndefined();
    expect(result.assignments).toHaveLength(1);
  });

  it('handles cancelling non-existent reservation', () => {
    const assignments: AssignedReservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 540 },
        mode: 'flexible',
        courtId: 'c1',
      },
    ];

    const result = handleCancellation('nonexistent', assignments, config);
    expect(result.assignments).toHaveLength(1);
  });

  it('reassigns flexible reservations to fill gaps', () => {
    // r1 on c1, r2 on c2. r1 and r2 are adjacent in time.
    // Cancel r1 → r2 might move to c1 if it reduces gaps.
    const assignments: AssignedReservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 540 },
        mode: 'flexible',
        courtId: 'c1',
      },
      {
        id: 'r2',
        slot: { start: 540, end: 600 },
        mode: 'flexible',
        courtId: 'c1',
      },
      {
        id: 'r3',
        slot: { start: 480, end: 540 },
        mode: 'flexible',
        courtId: 'c2',
      },
    ];

    const result = handleCancellation('r1', assignments, config);
    expect(result.assignments.find((a) => a.id === 'r1')).toBeUndefined();
    // Total gap should be computed
    expect(result.totalGapMinutes).toBeGreaterThan(0);
  });

  it('does not move locked reservations during reassignment', () => {
    const assignments: AssignedReservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 540 },
        mode: 'locked',
        lockedCourtId: 'c1',
        courtId: 'c1',
      },
      {
        id: 'r2',
        slot: { start: 540, end: 600 },
        mode: 'flexible',
        courtId: 'c2',
      },
    ];

    const result = handleCancellation('r2', assignments, config);
    const locked = result.assignments.find((a) => a.id === 'r1');
    expect(locked?.courtId).toBe('c1');
  });
});

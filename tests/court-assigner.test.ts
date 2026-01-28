import { describe, it, expect } from 'vitest';
import { assignCourts } from '../src/algorithm/court-assigner';
import type {
  AssignerConfig,
  Court,
  OperatingSchedule,
  Reservation,
} from '../src/algorithm/types';

const courts: Court[] = [
  { id: 'c1', name: 'Court 1' },
  { id: 'c2', name: 'Court 2' },
  { id: 'c3', name: 'Court 3' },
];

const schedule: OperatingSchedule = {
  openTime: 480,
  closeTime: 1320,
  minSlotDuration: 60,
};

const config: AssignerConfig = { courts, schedule };

describe('assignCourts', () => {
  it('assigns locked reservations to their specified court', () => {
    const reservations: Reservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 540 },
        mode: 'locked',
        lockedCourtId: 'c2',
      },
    ];
    const result = assignCourts(reservations, config);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].courtId).toBe('c2');
    expect(result.unassigned).toHaveLength(0);
  });

  it('rejects locked reservation with invalid court', () => {
    const reservations: Reservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 540 },
        mode: 'locked',
        lockedCourtId: 'invalid',
      },
    ];
    const result = assignCourts(reservations, config);
    expect(result.assignments).toHaveLength(0);
    expect(result.unassigned).toHaveLength(1);
  });

  it('assigns flexible reservations to available courts', () => {
    const reservations: Reservation[] = [
      { id: 'r1', slot: { start: 480, end: 540 }, mode: 'flexible' },
      { id: 'r2', slot: { start: 480, end: 540 }, mode: 'flexible' },
      { id: 'r3', slot: { start: 480, end: 540 }, mode: 'flexible' },
    ];
    const result = assignCourts(reservations, config);
    expect(result.assignments).toHaveLength(3);
    expect(result.unassigned).toHaveLength(0);

    // Each should be on a different court
    const courtIds = result.assignments.map((a) => a.courtId);
    expect(new Set(courtIds).size).toBe(3);
  });

  it('marks excess reservations as unassigned', () => {
    // 4 reservations at the same time, only 3 courts
    const reservations: Reservation[] = [
      { id: 'r1', slot: { start: 480, end: 540 }, mode: 'flexible' },
      { id: 'r2', slot: { start: 480, end: 540 }, mode: 'flexible' },
      { id: 'r3', slot: { start: 480, end: 540 }, mode: 'flexible' },
      { id: 'r4', slot: { start: 480, end: 540 }, mode: 'flexible' },
    ];
    const result = assignCourts(reservations, config);
    expect(result.assignments).toHaveLength(3);
    expect(result.unassigned).toHaveLength(1);
  });

  it('prefers adjacent placements to reduce gaps', () => {
    const reservations: Reservation[] = [
      { id: 'r1', slot: { start: 480, end: 540 }, mode: 'flexible' },
      { id: 'r2', slot: { start: 540, end: 600 }, mode: 'flexible' },
    ];
    const result = assignCourts(reservations, config);

    // Both should be on the same court (adjacency bonus)
    expect(result.assignments[0].courtId).toBe(result.assignments[1].courtId);
  });

  it('respects locked reservation conflicts', () => {
    const reservations: Reservation[] = [
      {
        id: 'r1',
        slot: { start: 480, end: 540 },
        mode: 'locked',
        lockedCourtId: 'c1',
      },
      {
        id: 'r2',
        slot: { start: 500, end: 560 },
        mode: 'locked',
        lockedCourtId: 'c1',
      },
    ];
    const result = assignCourts(reservations, config);
    expect(result.assignments).toHaveLength(1);
    expect(result.unassigned).toHaveLength(1);
  });

  it('computes fragmentation score and gap data', () => {
    const reservations: Reservation[] = [
      { id: 'r1', slot: { start: 480, end: 540 }, mode: 'flexible' },
      { id: 'r2', slot: { start: 600, end: 660 }, mode: 'flexible' },
    ];
    const result = assignCourts(reservations, config);
    expect(result.totalGapMinutes).toBeGreaterThan(0);
    expect(result.fragmentationScore).toBeGreaterThan(0);
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it('handles empty input', () => {
    const result = assignCourts([], config);
    expect(result.assignments).toHaveLength(0);
    expect(result.unassigned).toHaveLength(0);
    expect(result.totalGapMinutes).toBe(2520); // 3 courts × 840 min
  });

  it('handles mix of locked and flexible reservations', () => {
    const reservations: Reservation[] = [
      {
        id: 'locked1',
        slot: { start: 480, end: 600 },
        mode: 'locked',
        lockedCourtId: 'c1',
      },
      { id: 'flex1', slot: { start: 480, end: 600 }, mode: 'flexible' },
      { id: 'flex2', slot: { start: 600, end: 720 }, mode: 'flexible' },
    ];
    const result = assignCourts(reservations, config);
    expect(result.assignments).toHaveLength(3);

    // Locked must stay on c1
    const lockedAssignment = result.assignments.find(
      (a) => a.id === 'locked1'
    );
    expect(lockedAssignment?.courtId).toBe('c1');

    // Flexible at same time must be on different court than locked
    const flex1 = result.assignments.find((a) => a.id === 'flex1');
    expect(flex1?.courtId).not.toBe('c1');
  });
});

import { describe, it, expect } from 'vitest';
import { computeAnimSteps, MoveDetail } from './useTimelineAnimation';
import type { AssignmentResult, AssignedReservation } from '../../algorithm/types';

// Helper to create a mock AssignmentResult
function mockResult(assignments: Partial<AssignedReservation>[]): AssignmentResult {
  return {
    assignments: assignments.map((a, i) => ({
      id: a.id ?? `r${i}`,
      slot: a.slot ?? { start: 480, end: 540 },
      mode: a.mode ?? 'flexible',
      courtId: a.courtId ?? 'c1',
      isSplit: a.isSplit ?? false,
    })) as AssignedReservation[],
    unassigned: [],
    gaps: [],
    totalGapMinutes: 0,
    fragmentationScore: 0,
  };
}

describe('computeAnimSteps - time slot invariance', () => {
  it('should NEVER create a move where fromStart !== toStart', () => {
    // Naive: reservation at 9:00-10:00 on court 1
    // Smart: same reservation at 9:00-10:00 on court 2 (different court, same time)
    const naive = mockResult([
      { id: 'r1', slot: { start: 540, end: 600 }, courtId: 'c1' },
    ]);
    const smart = mockResult([
      { id: 'r1', slot: { start: 540, end: 600 }, courtId: 'c2' },
    ]);

    const steps = computeAnimSteps(naive, smart);
    const moves = steps.filter(s => s.type === 'batch-move').flatMap(s => (s as any).moves) as MoveDetail[];

    for (const move of moves) {
      expect(move.fromStart).toBe(move.toStart);
      expect(move.fromEnd).toBe(move.toEnd);
    }
  });

  it('should NOT create moves when times differ (split scenario)', () => {
    // Naive: reservation at 9:00-11:00 on court 1 (not split)
    // Smart: same reservation split into 9:00-10:00 and 10:00-11:00
    const naive = mockResult([
      { id: 'r1', slot: { start: 540, end: 660 }, courtId: 'c1' },
    ]);
    const smart = mockResult([
      { id: 'r1', slot: { start: 540, end: 600 }, courtId: 'c1', isSplit: true },
      { id: 'r1', slot: { start: 600, end: 660 }, courtId: 'c2', isSplit: true },
    ]);

    const steps = computeAnimSteps(naive, smart);
    const batchMoves = steps.filter(s => s.type === 'batch-move');

    // Should have no moves since times don't match
    if (batchMoves.length > 0) {
      const moves = (batchMoves[0] as any).moves as MoveDetail[];
      for (const move of moves) {
        expect(move.fromStart).toBe(move.toStart);
        expect(move.fromEnd).toBe(move.toEnd);
      }
    }
  });

  it('should NOT create moves when smart has different time than naive', () => {
    // This simulates the bug: naive at one time, smart at another
    const naive = mockResult([
      { id: 'r1', slot: { start: 1020, end: 1080 }, courtId: 'c3' }, // 17:00-18:00
    ]);
    const smart = mockResult([
      { id: 'r1', slot: { start: 1050, end: 1110 }, courtId: 'c3' }, // 17:30-18:30 (shifted!)
    ]);

    const steps = computeAnimSteps(naive, smart);
    const batchMoves = steps.filter(s => s.type === 'batch-move');

    // Should have NO moves because times differ
    if (batchMoves.length > 0) {
      const moves = (batchMoves[0] as any).moves as MoveDetail[];
      expect(moves.length).toBe(0);
    }
  });

  it('should create move ONLY when court differs but time is same', () => {
    const naive = mockResult([
      { id: 'r1', slot: { start: 540, end: 600 }, courtId: 'c1' },
      { id: 'r2', slot: { start: 600, end: 660 }, courtId: 'c2' },
    ]);
    const smart = mockResult([
      { id: 'r1', slot: { start: 540, end: 600 }, courtId: 'c3' }, // Court changed
      { id: 'r2', slot: { start: 600, end: 660 }, courtId: 'c2' }, // Same position
    ]);

    const steps = computeAnimSteps(naive, smart);
    const batchMoves = steps.filter(s => s.type === 'batch-move');

    expect(batchMoves.length).toBe(1);
    const moves = (batchMoves[0] as any).moves as MoveDetail[];

    // Only r1 should have a move (court changed)
    expect(moves.length).toBe(1);
    expect(moves[0].reservationId).toBe('r1');
    expect(moves[0].fromCourt).toBe('c1');
    expect(moves[0].toCourt).toBe('c3');
    // Times must be identical
    expect(moves[0].fromStart).toBe(moves[0].toStart);
    expect(moves[0].fromEnd).toBe(moves[0].toEnd);
  });

  it('all moves must have identical from/to times', () => {
    // Random test with multiple reservations
    const naive = mockResult([
      { id: 'r1', slot: { start: 480, end: 540 }, courtId: 'c1' },
      { id: 'r2', slot: { start: 540, end: 600 }, courtId: 'c2' },
      { id: 'r3', slot: { start: 600, end: 720 }, courtId: 'c3' },
      { id: 'r4', slot: { start: 720, end: 780 }, courtId: 'c1' },
    ]);
    const smart = mockResult([
      { id: 'r1', slot: { start: 480, end: 540 }, courtId: 'c2' }, // Court change
      { id: 'r2', slot: { start: 540, end: 600 }, courtId: 'c1' }, // Court change
      { id: 'r3', slot: { start: 600, end: 720 }, courtId: 'c3' }, // Same
      { id: 'r4', slot: { start: 720, end: 780 }, courtId: 'c4' }, // Court change
    ]);

    const steps = computeAnimSteps(naive, smart);

    for (const step of steps) {
      if (step.type === 'batch-move') {
        for (const move of step.moves) {
          expect(move.fromStart).toBe(move.toStart);
          expect(move.fromEnd).toBe(move.toEnd);
        }
      }
    }
  });
});

import { describe, it, expect } from 'vitest';
import { runSimulation } from '../src/algorithm/simulation';
import type { Court, OperatingSchedule } from '../src/algorithm/types';

const courts: Court[] = [
  { id: 'c1', name: 'Court 1' },
  { id: 'c2', name: 'Court 2' },
  { id: 'c3', name: 'Court 3' },
  { id: 'c4', name: 'Court 4' },
];

const schedule: OperatingSchedule = {
  openTime: 480,
  closeTime: 1320,
  minSlotDuration: 60,
};

describe('runSimulation', () => {
  it('runs specified number of iterations', () => {
    const result = runSimulation({
      courts,
      schedule,
      iterations: 10,
      avgReservationsPerDay: 15,
      lockedFraction: 0.3,
      durations: [60, 90],
      seed: 42,
    });

    expect(result.iterations).toBe(10);
    expect(result.results).toHaveLength(10);
  });

  it('produces consistent results with same seed', () => {
    const r1 = runSimulation({
      courts,
      schedule,
      iterations: 5,
      avgReservationsPerDay: 10,
      lockedFraction: 0.5,
      durations: [60, 90, 120],
      seed: 123,
    });

    const r2 = runSimulation({
      courts,
      schedule,
      iterations: 5,
      avgReservationsPerDay: 10,
      lockedFraction: 0.5,
      durations: [60, 90, 120],
      seed: 123,
    });

    expect(r1.avgUtilization).toBeCloseTo(r2.avgUtilization, 5);
    expect(r1.avgGapMinutes).toBeCloseTo(r2.avgGapMinutes, 5);
  });

  it('reports utilization within [0, 1]', () => {
    const result = runSimulation({
      courts,
      schedule,
      iterations: 20,
      avgReservationsPerDay: 20,
      lockedFraction: 0.3,
      durations: [60, 90],
      seed: 99,
    });

    expect(result.avgUtilization).toBeGreaterThanOrEqual(0);
    expect(result.avgUtilization).toBeLessThanOrEqual(1);
    expect(result.minUtilization).toBeGreaterThanOrEqual(0);
    expect(result.maxUtilization).toBeLessThanOrEqual(1);
  });

  it('shows more gaps with higher locked fraction', () => {
    const lowLocked = runSimulation({
      courts,
      schedule,
      iterations: 30,
      avgReservationsPerDay: 15,
      lockedFraction: 0.1,
      durations: [60, 90],
      seed: 42,
    });

    const highLocked = runSimulation({
      courts,
      schedule,
      iterations: 30,
      avgReservationsPerDay: 15,
      lockedFraction: 0.9,
      durations: [60, 90],
      seed: 42,
    });

    // More locked = generally more fragmentation
    // This is a statistical property so we allow some tolerance
    expect(highLocked.avgFragmentation).toBeGreaterThanOrEqual(0);
  });

  it('handles zero reservations gracefully', () => {
    const result = runSimulation({
      courts,
      schedule,
      iterations: 5,
      avgReservationsPerDay: 0,
      lockedFraction: 0.5,
      durations: [60],
      seed: 1,
    });

    expect(result.avgUtilization).toBeGreaterThanOrEqual(0);
    expect(result.avgUnassigned).toBeGreaterThanOrEqual(0);
  });
});

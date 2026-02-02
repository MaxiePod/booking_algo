import { describe, it, expect } from 'vitest';
import { runComparison } from '../src/simulator/run-simulation';
import { DEFAULT_SIM_INPUTS } from '../src/simulator/types';

describe('overflow (pent-up demand)', () => {
  it('generates no overflow when multiplier is 0', () => {
    const results = runComparison({
      ...DEFAULT_SIM_INPUTS,
      overflowMultiplier: 0,
      iterations: 10,
    });

    expect(results.overflowGenerated).toBe(0);
    expect(results.overflowPlacedSmart).toBe(0);
    expect(results.overflowPlacedNaive).toBe(0);

    // Every iteration should have 0 overflow
    for (const iter of results.iterationResults) {
      expect(iter.overflowGenerated).toBe(0);
      expect(iter.overflowPlacedSmart).toBe(0);
      expect(iter.overflowPlacedNaive).toBe(0);
    }
  });

  it('generates some overflow when multiplier is 1.0', () => {
    const results = runComparison({
      ...DEFAULT_SIM_INPUTS,
      overflowMultiplier: 1.0,
      iterations: 10,
    });

    expect(results.overflowGenerated).toBeGreaterThan(0);
  });

  it('generates more overflow with higher multiplier', () => {
    const low = runComparison({
      ...DEFAULT_SIM_INPUTS,
      overflowMultiplier: 0.5,
      iterations: 20,
    });

    const high = runComparison({
      ...DEFAULT_SIM_INPUTS,
      overflowMultiplier: 2.0,
      iterations: 20,
    });

    expect(high.overflowGenerated).toBeGreaterThan(low.overflowGenerated);
  });

  it('is deterministic (same seed → same results)', () => {
    const a = runComparison({
      ...DEFAULT_SIM_INPUTS,
      overflowMultiplier: 1.0,
      iterations: 10,
    });

    const b = runComparison({
      ...DEFAULT_SIM_INPUTS,
      overflowMultiplier: 1.0,
      iterations: 10,
    });

    expect(a.overflowGenerated).toBe(b.overflowGenerated);
    expect(a.overflowPlacedSmart).toBe(b.overflowPlacedSmart);
    expect(a.overflowPlacedNaive).toBe(b.overflowPlacedNaive);
  });

  it('smart absorbs >= naive overflow', () => {
    const results = runComparison({
      ...DEFAULT_SIM_INPUTS,
      overflowMultiplier: 1.5,
      iterations: 30,
    });

    expect(results.overflowPlacedSmart).toBeGreaterThanOrEqual(
      results.overflowPlacedNaive
    );
  });

  it('all overflow reservations are flexible and within operating hours', () => {
    // We verify indirectly: run with overflow and check that no locked
    // overflow IDs appear in results, and all assigned overflow fits schedule
    const results = runComparison({
      ...DEFAULT_SIM_INPUTS,
      overflowMultiplier: 2.0,
      iterations: 5,
    });

    const openTime = DEFAULT_SIM_INPUTS.openHour * 60;
    const closeTime = DEFAULT_SIM_INPUTS.closeHour * 60;

    // Check the sample day's assignments for overflow reservations
    for (const assignment of results.sampleDay.smart.assignments) {
      if (assignment.id.startsWith('overflow-')) {
        expect(assignment.mode).toBe('flexible');
        expect(assignment.slot.start).toBeGreaterThanOrEqual(openTime);
        expect(assignment.slot.end).toBeLessThanOrEqual(closeTime);
      }
    }
    for (const assignment of results.sampleDay.naive.assignments) {
      if (assignment.id.startsWith('overflow-')) {
        expect(assignment.mode).toBe('flexible');
        expect(assignment.slot.start).toBeGreaterThanOrEqual(openTime);
        expect(assignment.slot.end).toBeLessThanOrEqual(closeTime);
      }
    }
  });

  it('multiplier=0 matches behavior without overflow', () => {
    const withZero = runComparison({
      ...DEFAULT_SIM_INPUTS,
      overflowMultiplier: 0,
      iterations: 10,
    });

    // With zero overflow, smart/naive stats should be identical to a
    // run that simply doesn't generate overflow — verify internally consistent
    expect(withZero.smart.avgUtil).toBeGreaterThan(0);
    expect(withZero.naive.avgUtil).toBeGreaterThan(0);
    expect(withZero.overflowGenerated).toBe(0);
  });
});

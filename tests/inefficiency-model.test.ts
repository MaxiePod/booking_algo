import { describe, it, expect } from 'vitest';
import {
  powerLawEfficiency,
  powerLawFactor,
  hillEfficiency,
  hillFactor,
  calculateSavings,
  calculateRevenue,
  periodMultiplier,
  DEFAULT_POWER_LAW,
  DEFAULT_HILL,
} from '../src/algorithm/inefficiency-model';

describe('powerLawEfficiency', () => {
  it('returns full utilization at 0% locked', () => {
    const result = powerLawEfficiency({
      baseUtilization: 0.8,
      lockedFraction: 0,
    });
    expect(result).toBeCloseTo(0.8, 5);
  });

  it('reduces utilization at 100% locked', () => {
    const result = powerLawEfficiency({
      baseUtilization: 0.8,
      lockedFraction: 1.0,
    });
    // effective = 0.8 * (1 - 0.25 * 1^1.8) = 0.8 * 0.75 = 0.6
    expect(result).toBeCloseTo(0.6, 5);
  });

  it('has modest loss at 50% locked', () => {
    const result = powerLawEfficiency({
      baseUtilization: 0.8,
      lockedFraction: 0.5,
    });
    expect(result).toBeGreaterThan(0.7);
    expect(result).toBeLessThan(0.8);
  });

  it('clamps locked fraction to [0, 1]', () => {
    const overOne = powerLawEfficiency({
      baseUtilization: 0.8,
      lockedFraction: 1.5,
    });
    const atOne = powerLawEfficiency({
      baseUtilization: 0.8,
      lockedFraction: 1.0,
    });
    expect(overOne).toBeCloseTo(atOne, 5);
  });

  it('accepts custom parameters', () => {
    const result = powerLawEfficiency(
      { baseUtilization: 1.0, lockedFraction: 1.0 },
      { k: 0.5, p: 1.0 }
    );
    expect(result).toBeCloseTo(0.5, 5);
  });
});

describe('powerLawFactor', () => {
  it('returns 1.0 at 0% locked', () => {
    expect(powerLawFactor(0)).toBeCloseTo(1.0, 5);
  });

  it('returns 0.75 at 100% locked (default k=0.25)', () => {
    expect(powerLawFactor(1.0)).toBeCloseTo(0.75, 5);
  });
});

describe('hillEfficiency', () => {
  it('returns near-full utilization at 0% locked', () => {
    const result = hillEfficiency({
      baseUtilization: 0.8,
      lockedFraction: 0,
    });
    // gap_rate(0) = g0 + (gmax-g0)*(0/(0+k^p)) = 0.02
    // effective = 0.8 * (1 - 0.02) = 0.784
    expect(result).toBeCloseTo(0.784, 3);
  });

  it('has significant loss at 100% locked', () => {
    const result = hillEfficiency({
      baseUtilization: 0.8,
      lockedFraction: 1.0,
    });
    expect(result).toBeGreaterThan(0.5);
    expect(result).toBeLessThan(0.65);
  });

  it('is monotonically decreasing with locked fraction', () => {
    let prev = 1.0;
    for (let L = 0; L <= 1.0; L += 0.1) {
      const result = hillEfficiency({
        baseUtilization: 0.8,
        lockedFraction: L,
      });
      expect(result).toBeLessThanOrEqual(prev + 0.0001);
      prev = result;
    }
  });
});

describe('hillFactor', () => {
  it('returns ~0.98 at 0% locked (g0=0.02)', () => {
    expect(hillFactor(0)).toBeCloseTo(0.98, 3);
  });

  it('returns less at 100% locked', () => {
    expect(hillFactor(1.0)).toBeLessThan(0.75);
  });
});

describe('calculateRevenue', () => {
  it('computes basic revenue correctly', () => {
    const revenue = calculateRevenue({
      numCourts: 4,
      operatingHoursPerDay: 14,
      pricePerHour: 80,
      effectiveUtilization: 0.75,
    });
    // 4 * 14 * 80 * 0.75 = 3360
    expect(revenue).toBeCloseTo(3360, 2);
  });
});

describe('periodMultiplier', () => {
  it('returns correct multipliers', () => {
    expect(periodMultiplier('daily')).toBe(1);
    expect(periodMultiplier('monthly')).toBe(30);
    expect(periodMultiplier('annually')).toBe(365);
  });
});

describe('calculateSavings', () => {
  it('shows zero savings at 100% locked (no algo, all naive)', () => {
    const result = calculateSavings({
      numCourts: 8,
      operatingHoursPerDay: 14,
      pricePerHour: 80,
      currentUtilization: 0.75,
      lockedFraction: 1.0,
      period: 'daily',
    });

    expect(result.savings).toBeCloseTo(0, 2);
    expect(result.savingsPercent).toBeCloseTo(0, 2);
    expect(result.effectiveUtilPodPlay).toBeCloseTo(result.effectiveUtilTraditional, 5);
  });

  it('shows maximum savings at 0% locked (all algo)', () => {
    const result = calculateSavings({
      numCourts: 8,
      operatingHoursPerDay: 14,
      pricePerHour: 80,
      currentUtilization: 0.75,
      lockedFraction: 0,
      period: 'daily',
    });

    expect(result.savings).toBeGreaterThan(0);
    expect(result.revenuePodPlay).toBeGreaterThan(result.revenueTraditional);
    expect(result.effectiveUtilPodPlay).toBeGreaterThan(result.effectiveUtilTraditional);
  });

  it('shows positive savings for intermediate locked %', () => {
    const result = calculateSavings({
      numCourts: 8,
      operatingHoursPerDay: 14,
      pricePerHour: 80,
      currentUtilization: 0.75,
      lockedFraction: 0.6,
      period: 'daily',
    });

    expect(result.savings).toBeGreaterThan(0);
    expect(result.savingsPercent).toBeGreaterThan(0);
  });

  it('savings decrease as locked fraction increases', () => {
    const atLow = calculateSavings({
      numCourts: 8,
      operatingHoursPerDay: 14,
      pricePerHour: 80,
      currentUtilization: 0.75,
      lockedFraction: 0.2,
      period: 'daily',
    });

    const atHigh = calculateSavings({
      numCourts: 8,
      operatingHoursPerDay: 14,
      pricePerHour: 80,
      currentUtilization: 0.75,
      lockedFraction: 0.8,
      period: 'daily',
    });

    expect(atLow.savings).toBeGreaterThan(atHigh.savings);
  });

  it('scales correctly with time period', () => {
    const daily = calculateSavings({
      numCourts: 4,
      operatingHoursPerDay: 14,
      pricePerHour: 80,
      currentUtilization: 0.75,
      lockedFraction: 0.5,
      period: 'daily',
    });

    const monthly = calculateSavings({
      numCourts: 4,
      operatingHoursPerDay: 14,
      pricePerHour: 80,
      currentUtilization: 0.75,
      lockedFraction: 0.5,
      period: 'monthly',
    });

    expect(monthly.savings).toBeCloseTo(daily.savings * 30, 2);
  });

  it('works with hill model', () => {
    const result = calculateSavings({
      numCourts: 8,
      operatingHoursPerDay: 14,
      pricePerHour: 80,
      currentUtilization: 0.75,
      lockedFraction: 0.6,
      period: 'daily',
      model: 'hill',
    });

    expect(result.savings).toBeGreaterThan(0);
  });

  it('returns both utilization values', () => {
    const result = calculateSavings({
      numCourts: 8,
      operatingHoursPerDay: 14,
      pricePerHour: 80,
      currentUtilization: 0.75,
      lockedFraction: 0.4,
      period: 'daily',
    });

    expect(result.effectiveUtilTraditional).toBeCloseTo(0.75, 5);
    expect(result.effectiveUtilPodPlay).toBeGreaterThan(0.75);
    expect(result.effectiveUtilPodPlay).toBeLessThanOrEqual(1.0);
  });
});

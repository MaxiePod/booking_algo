import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalculator } from '../src/calculator/hooks/useCalculator';

describe('useCalculator', () => {
  it('returns default inputs and computed results', () => {
    const { result } = renderHook(() => useCalculator());

    expect(result.current.inputs.numCourts).toBe(6);
    expect(result.current.inputs.targetUtilizationPercent).toBe(56);
    expect(result.current.inputs.pricePerHour).toBe(80);
    expect(result.current.inputs.lockedPercent).toBe(11);
    expect(result.current.inputs.period).toBe('monthly');

    expect(result.current.results.revenueSmart).toBeGreaterThan(0);
    expect(result.current.results.revenueNaive).toBeGreaterThan(0);
    expect(result.current.results.savings).toBeGreaterThan(0);
  });

  it('accepts initial overrides', () => {
    const { result } = renderHook(() =>
      useCalculator({ numCourts: 4, pricePerHour: 100 })
    );

    expect(result.current.inputs.numCourts).toBe(4);
    expect(result.current.inputs.pricePerHour).toBe(100);
    expect(result.current.inputs.targetUtilizationPercent).toBe(56);
  });

  it('updates results when inputs change', () => {
    const { result } = renderHook(() => useCalculator());

    const initialSavings = result.current.results.savings;

    act(() => {
      result.current.setLockedPercent(20);
    });

    // Higher locked % = more algo advantage = more savings
    expect(result.current.results.savings).toBeGreaterThan(initialSavings);
  });

  it('updates period', () => {
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setPeriod('daily');
    });

    const dailySavings = result.current.results.savings;

    act(() => {
      result.current.setPeriod('annually');
    });

    expect(result.current.results.savings).toBeCloseTo(dailySavings * 365, 0);
  });

  it('setInputs updates multiple values at once', () => {
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setInputs({ numCourts: 12, pricePerHour: 120 });
    });

    expect(result.current.inputs.numCourts).toBe(12);
    expect(result.current.inputs.pricePerHour).toBe(120);
  });

  it('shows zero savings when locked is 0%', () => {
    const { result } = renderHook(() =>
      useCalculator({ lockedPercent: 0 })
    );

    // At 0% locked, smart and naive perform the same
    expect(result.current.results.savings).toBeCloseTo(0, 0);
  });

  it('shows more savings with higher locked %', () => {
    const { result } = renderHook(() =>
      useCalculator({ lockedPercent: 50 })
    );

    expect(result.current.results.savings).toBeGreaterThan(0);
    expect(result.current.results.effectiveUtilSmart).toBeGreaterThan(
      result.current.results.effectiveUtilNaive
    );
  });

  it('returns both utilization values', () => {
    const { result } = renderHook(() =>
      useCalculator({ lockedPercent: 40, targetUtilizationPercent: 56 })
    );

    // Smart should be close to target, naive should be lower
    expect(result.current.results.effectiveUtilSmart).toBeCloseTo(0.56, 1);
    expect(result.current.results.effectiveUtilNaive).toBeLessThan(
      result.current.results.effectiveUtilSmart
    );
  });
});

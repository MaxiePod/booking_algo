import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalculator } from '../src/calculator/hooks/useCalculator';

describe('useCalculator', () => {
  it('returns default inputs and computed results', () => {
    const { result } = renderHook(() => useCalculator());

    expect(result.current.inputs.numCourts).toBe(8);
    expect(result.current.inputs.currentUtilizationPercent).toBe(75);
    expect(result.current.inputs.pricePerHour).toBe(80);
    expect(result.current.inputs.lockedPercent).toBe(60);
    expect(result.current.inputs.period).toBe('monthly');

    expect(result.current.results.revenuePodPlay).toBeGreaterThan(0);
    expect(result.current.results.revenueTraditional).toBeGreaterThan(0);
    expect(result.current.results.savings).toBeGreaterThan(0);
  });

  it('accepts initial overrides', () => {
    const { result } = renderHook(() =>
      useCalculator({ numCourts: 4, pricePerHour: 100 })
    );

    expect(result.current.inputs.numCourts).toBe(4);
    expect(result.current.inputs.pricePerHour).toBe(100);
    expect(result.current.inputs.currentUtilizationPercent).toBe(75);
  });

  it('updates results when inputs change', () => {
    const { result } = renderHook(() => useCalculator());

    const initialSavings = result.current.results.savings;

    act(() => {
      result.current.setLockedPercent(30);
    });

    // Lower locked % = more algo = more savings
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

  it('shows zero savings when locked is 100%', () => {
    const { result } = renderHook(() =>
      useCalculator({ lockedPercent: 100 })
    );

    expect(result.current.results.savings).toBeCloseTo(0, 2);
  });

  it('shows maximum savings when locked is 0%', () => {
    const { result } = renderHook(() =>
      useCalculator({ lockedPercent: 0 })
    );

    expect(result.current.results.savings).toBeGreaterThan(0);
    expect(result.current.results.effectiveUtilPodPlay).toBeGreaterThan(
      result.current.results.effectiveUtilTraditional
    );
  });

  it('returns both utilization values', () => {
    const { result } = renderHook(() =>
      useCalculator({ lockedPercent: 40 })
    );

    expect(result.current.results.effectiveUtilTraditional).toBeCloseTo(0.75, 2);
    expect(result.current.results.effectiveUtilPodPlay).toBeGreaterThan(0.75);
  });
});

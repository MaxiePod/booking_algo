import { useState, useMemo } from 'react';
import { calculateSavings } from '../../algorithm/inefficiency-model';
import type { CalculatorInputs, CalculatorResults } from '../../shared/types';
import { DEFAULT_INPUTS } from '../../shared/types';
import { DEFAULT_OPERATING_HOURS } from '../utils/constants';

export interface UseCalculatorReturn {
  inputs: CalculatorInputs;
  results: CalculatorResults;
  setNumCourts: (v: number) => void;
  setCurrentUtilizationPercent: (v: number) => void;
  setPricePerHour: (v: number) => void;
  setLockedPercent: (v: number) => void;
  setPeriod: (v: CalculatorInputs['period']) => void;
  setInputs: (partial: Partial<CalculatorInputs>) => void;
  resetInputs: () => void;
}

export function useCalculator(
  initialInputs?: Partial<CalculatorInputs>
): UseCalculatorReturn {
  const [inputs, setInputsState] = useState<CalculatorInputs>({
    ...DEFAULT_INPUTS,
    ...initialInputs,
  });

  const results = useMemo<CalculatorResults>(() => {
    const result = calculateSavings({
      numCourts: inputs.numCourts,
      operatingHoursPerDay: DEFAULT_OPERATING_HOURS,
      pricePerHour: inputs.pricePerHour,
      currentUtilization: inputs.currentUtilizationPercent / 100,
      lockedFraction: inputs.lockedPercent / 100,
      lockPremiumPerHour: inputs.lockPremiumPerHour,
      period: inputs.period,
    });

    return {
      revenuePodPlay: result.revenuePodPlay,
      revenueTraditional: result.revenueTraditional,
      savings: result.savings,
      savingsPercent: result.savingsPercent,
      lockPremiumRevenue: result.lockPremiumRevenue,
      effectiveUtilPodPlay: result.effectiveUtilPodPlay,
      effectiveUtilTraditional: result.effectiveUtilTraditional,
    };
  }, [inputs]);

  const setInputs = (partial: Partial<CalculatorInputs>) => {
    setInputsState((prev) => ({ ...prev, ...partial }));
  };

  const resetInputs = () => {
    setInputsState({ ...DEFAULT_INPUTS, ...initialInputs });
  };

  return {
    inputs,
    results,
    setNumCourts: (v) => setInputs({ numCourts: v }),
    setCurrentUtilizationPercent: (v) => setInputs({ currentUtilizationPercent: v }),
    setPricePerHour: (v) => setInputs({ pricePerHour: v }),
    setLockedPercent: (v) => setInputs({ lockedPercent: v }),
    setPeriod: (v) => setInputs({ period: v }),
    setInputs,
    resetInputs,
  };
}

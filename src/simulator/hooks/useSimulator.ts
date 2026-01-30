import { useState, useCallback, useMemo, useRef } from 'react';
import type { SimulatorInputs, SimulatorResults, DurationBinPcts } from '../types';
import { DEFAULT_SIM_INPUTS, computeAvgDuration } from '../types';
import { runComparison } from '../run-simulation';

function computeMaxReservations(inputs: SimulatorInputs): number {
  const operatingMinutes = (inputs.closeHour - inputs.openHour) * 60;
  const avgDuration = computeAvgDuration(
    inputs.minReservationMin, inputs.slotBlockMin, inputs.durationBinPcts, operatingMinutes
  );
  return avgDuration > 0 ? Math.floor((inputs.numCourts * operatingMinutes) / avgDuration) : 0;
}

export interface UseSimulatorReturn {
  inputs: SimulatorInputs;
  results: SimulatorResults | null;
  running: boolean;
  maxReservationsPerDay: number;
  setInputs: (partial: Partial<SimulatorInputs>) => void;
  resetInputs: () => void;
  run: () => void;
}

export function useSimulator(): UseSimulatorReturn {
  const [inputs, setInputsState] = useState<SimulatorInputs>(DEFAULT_SIM_INPUTS);
  const [results, setResults] = useState<SimulatorResults | null>(null);
  const [running, setRunning] = useState(false);

  const prevM = useRef(inputs.minReservationMin);
  const prevB = useRef(inputs.slotBlockMin);

  const maxReservationsPerDay = useMemo(
    () => computeMaxReservations(inputs),
    [inputs.numCourts, inputs.openHour, inputs.closeHour, inputs.minReservationMin, inputs.slotBlockMin, inputs.durationBinPcts]
  );

  const setInputs = (partial: Partial<SimulatorInputs>) => {
    setInputsState((prev) => {
      const next = { ...prev, ...partial };

      // Reset durationBinPcts when M or B changes
      const mChanged = next.minReservationMin !== prevM.current;
      const bChanged = next.slotBlockMin !== prevB.current;
      if (mChanged || bChanged) {
        next.durationBinPcts = [...DEFAULT_SIM_INPUTS.durationBinPcts] as DurationBinPcts;
        prevM.current = next.minReservationMin;
        prevB.current = next.slotBlockMin;
      }

      // Clamp reservationsPerDay to max
      const max = computeMaxReservations(next);
      if (next.reservationsPerDay > max) {
        next.reservationsPerDay = max;
      }

      return next;
    });
  };

  const resetInputs = useCallback(() => {
    setInputsState(DEFAULT_SIM_INPUTS);
    prevM.current = DEFAULT_SIM_INPUTS.minReservationMin;
    prevB.current = DEFAULT_SIM_INPUTS.slotBlockMin;
  }, []);

  const run = useCallback(() => {
    setRunning(true);
    // Use setTimeout to let the UI update before blocking on computation
    setTimeout(() => {
      const res = runComparison(inputs);
      setResults(res);
      setRunning(false);
    }, 50);
  }, [inputs]);

  return { inputs, results, running, maxReservationsPerDay, setInputs, resetInputs, run };
}

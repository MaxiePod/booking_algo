import { useState, useCallback } from 'react';
import type { SimulatorInputs, SimulatorResults } from '../types';
import { DEFAULT_SIM_INPUTS } from '../types';
import { runComparison } from '../run-simulation';

export interface UseSimulatorReturn {
  inputs: SimulatorInputs;
  results: SimulatorResults | null;
  running: boolean;
  setInputs: (partial: Partial<SimulatorInputs>) => void;
  run: () => void;
}

export function useSimulator(): UseSimulatorReturn {
  const [inputs, setInputsState] = useState<SimulatorInputs>(DEFAULT_SIM_INPUTS);
  const [results, setResults] = useState<SimulatorResults | null>(null);
  const [running, setRunning] = useState(false);

  const setInputs = (partial: Partial<SimulatorInputs>) => {
    setInputsState((prev) => ({ ...prev, ...partial }));
  };

  const run = useCallback(() => {
    setRunning(true);
    // Use setTimeout to let the UI update before blocking on computation
    setTimeout(() => {
      const res = runComparison(inputs);
      setResults(res);
      setRunning(false);
    }, 50);
  }, [inputs]);

  return { inputs, results, running, setInputs, run };
}

import type { AssignmentResult } from '../algorithm/types';

export interface SimulatorInputs {
  numCourts: number;
  openHour: number;
  closeHour: number;
  reservationsPerDay: number;
  lockedPercent: number;
  minReservationMin: number;
  slotBlockMin: number;
  durations: number[];
  iterations: number;
}

export interface SimulatorResults {
  smart: RunStats;
  naive: RunStats;
  deltaUtil: number;
  gapSaved: number;
  fragReduction: number;
  /** A sample day's raw results for timeline visualization */
  sampleDay: {
    smart: AssignmentResult;
    naive: AssignmentResult;
    courtNames: string[];
    openTime: number;
    closeTime: number;
  };
}

export interface RunStats {
  avgUtil: number;
  avgGapMinutes: number;
  avgFragmentation: number;
  avgUnassigned: number;
}

export const DEFAULT_SIM_INPUTS: SimulatorInputs = {
  numCourts: 6,
  openHour: 8,
  closeHour: 22,
  reservationsPerDay: 25,
  lockedPercent: 40,
  minReservationMin: 60,
  slotBlockMin: 30,
  durations: [60, 90, 120],
  iterations: 40,
};

import type { AssignmentResult } from '../algorithm/types';

/** Four-element tuple: percentage weights for each duration bin (must sum to 100). */
export type DurationBinPcts = [number, number, number, number];

export interface DurationBin {
  label: string;
  minutes: number;
}

/**
 * Compute the four duration bins from minReservationMin (M) and slotBlockMin (B).
 * Bins: M, M+B, M+2B, M+2B+ (the last bin is "M+2B or longer").
 */
export function computeDurationBins(M: number, B: number): DurationBin[] {
  const fmt = (min: number) =>
    min % 60 === 0 ? `${min / 60} hr` : `${(min / 60).toFixed(1)} hr`;
  return [
    { label: fmt(M), minutes: M },
    { label: fmt(M + B), minutes: M + B },
    { label: fmt(M + 2 * B), minutes: M + 2 * B },
    { label: `${fmt(M + 2 * B)}+`, minutes: M + 2 * B }, // placeholder; actual duration picked randomly
  ];
}

export interface SimulatorInputs {
  numCourts: number;
  openHour: number;
  closeHour: number;
  reservationsPerDay: number;
  lockedPercent: number;
  minReservationMin: number;
  slotBlockMin: number;
  durationBinPcts: DurationBinPcts;
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
  durationBinPcts: [25, 25, 25, 25],
  iterations: 40,
};

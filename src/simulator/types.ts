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

/**
 * Compute the weighted-average reservation duration from bin percentages.
 * Bin 3 (the "M+2B+" bin) averages the range [M+2B, min(operatingMinutes, 240)].
 */
export function computeAvgDuration(
  M: number, B: number, pcts: DurationBinPcts, operatingMinutes: number
): number {
  const bin0 = M;
  const bin1 = M + B;
  const bin2 = M + 2 * B;
  // Bin 3: random between M+2B and min(operatingMinutes, 240)
  const bin3Max = Math.min(operatingMinutes, 240);
  const bin3Avg = bin3Max > bin2 ? (bin2 + bin3Max) / 2 : bin2;

  return (
    (pcts[0] / 100) * bin0 +
    (pcts[1] / 100) * bin1 +
    (pcts[2] / 100) * bin2 +
    (pcts[3] / 100) * bin3Avg
  );
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
  pricePerHour: number;
  lockPremiumPerHour: number;
  varianceCV: number;
}

export interface SimulatorResults {
  smart: RunStats;
  naive: RunStats;
  deltaUtil: number;
  gapSaved: number;
  fragReduction: number;
  revenueSmartPerDay: number;
  revenueNaivePerDay: number;
  savingsPerDay: number;
  savingsPercent: number;
  lockPremiumPerDay: number;
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
  reservationsPerDay: 30,
  lockedPercent: 11,
  minReservationMin: 60,
  slotBlockMin: 30,
  durationBinPcts: [40, 30, 20, 10],
  iterations: 40,
  pricePerHour: 80,
  lockPremiumPerHour: 10,
  varianceCV: 15,
};

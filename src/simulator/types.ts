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
  overflowMultiplier: number;
  /** When true, allocates more demand pressure to peak hours (5pm-9pm) */
  modelPeakTimes: boolean;
  /** When true, reservations may be split across multiple courts as a last resort */
  allowSplitting: boolean;
}

export interface IterationResult {
  smartUtil: number;   // 0-1 fraction
  naiveUtil: number;
  overflowGenerated: number;
  overflowPlacedSmart: number;
  overflowPlacedNaive: number;
  /** Number of reservations that were split across courts (smart) */
  smartSplitCount: number;
  /** Number of reservations that were split across courts (naive) */
  naiveSplitCount: number;
}

export interface GapBreakdown {
  bookedMinutes: number;
  usableGapMinutes: number;   // gap.stranded === false
  strandedGapMinutes: number; // gap.stranded === true
  strandedCount: number;
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
  iterationResults: IterationResult[];
  overflowGenerated: number;
  overflowPlacedSmart: number;
  overflowPlacedNaive: number;
  smartGaps: GapBreakdown;
  naiveGaps: GapBreakdown;
  /** Average number of split reservations per day (smart algorithm) */
  avgSmartSplits: number;
  /** Average number of split reservations per day (naive algorithm) */
  avgNaiveSplits: number;
  /** 4-way revenue comparison for splitting analysis */
  splitting: {
    smartNoSplit: { revenue: number; splits: number; util: number };
    smartWithSplit: { revenue: number; splits: number; util: number };
    naiveNoSplit: { revenue: number; splits: number; util: number };
    naiveWithSplit: { revenue: number; splits: number; util: number };
  };
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

/** Peak hours: 5pm-9pm (17:00-21:00) — typical after-work rush for sports facilities */
export const PEAK_HOUR_START = 17;
export const PEAK_HOUR_END = 21;

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
  overflowMultiplier: 1.0,
  modelPeakTimes: false,
  allowSplitting: false,
};

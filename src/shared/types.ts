import type { TimePeriod } from '../algorithm/inefficiency-model';

/** Input state for the savings calculator */
export interface CalculatorInputs {
  numCourts: number;
  /** Current observed utilization (%) — what the venue sees today with all-naive booking */
  currentUtilizationPercent: number;
  pricePerHour: number;
  /** % of reservations that remain locked (customer-picked) even with PodPlay */
  lockedPercent: number;
  lockPremiumPerHour: number;
  period: TimePeriod;
}

/** Output from the savings calculation */
export interface CalculatorResults {
  revenuePodPlay: number;
  revenueTraditional: number;
  savings: number;
  savingsPercent: number;
  lockPremiumRevenue: number;
  /** Effective utilization with PodPlay (higher) */
  effectiveUtilPodPlay: number;
  /** Effective utilization without PodPlay / traditional (= current input) */
  effectiveUtilTraditional: number;
}

/** Default values for the calculator */
export const DEFAULT_INPUTS: CalculatorInputs = {
  numCourts: 8,
  currentUtilizationPercent: 75,
  pricePerHour: 80,
  lockedPercent: 11,
  lockPremiumPerHour: 10,
  period: 'monthly',
};

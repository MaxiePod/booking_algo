import type { TimePeriod } from '../algorithm/inefficiency-model';

/** Input state for the savings calculator */
export interface CalculatorInputs {
  numCourts: number;
  /** Target utilization (%) — the demand level you want to model */
  targetUtilizationPercent: number;
  pricePerHour: number;
  /** % of reservations that are locked (customer-picked court) */
  lockedPercent: number;
  lockPremiumPerHour: number;
  period: TimePeriod;
}

/** Output from the savings calculation */
export interface CalculatorResults {
  /** Revenue with smart algorithm */
  revenueSmart: number;
  /** Revenue with naive algorithm */
  revenueNaive: number;
  /** Additional revenue from smart vs naive */
  savings: number;
  savingsPercent: number;
  /** Additional revenue from lock premium */
  lockPremiumRevenue: number;
  /** Effective utilization with smart algorithm */
  effectiveUtilSmart: number;
  /** Effective utilization with naive algorithm */
  effectiveUtilNaive: number;
}

/** Default values for the calculator (aligned with simulator defaults) */
export const DEFAULT_INPUTS: CalculatorInputs = {
  numCourts: 6,
  targetUtilizationPercent: 56,
  pricePerHour: 80,
  lockedPercent: 11,
  lockPremiumPerHour: 10,
  period: 'monthly',
};

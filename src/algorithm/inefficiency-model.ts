/**
 * Inefficiency models that map locked-court percentage → effective utilization.
 *
 * When courts are "locked" (customer picks a specific court), scheduling
 * flexibility is reduced, creating gaps that lower effective utilization.
 */

export interface InefficiencyParams {
  /** Base utilization before inefficiency (0–1) */
  baseUtilization: number;
  /** Fraction of courts that are locked (0–1) */
  lockedFraction: number;
}

// ─── Power Law Model (default, simpler) ────────────────────────────────

export interface PowerLawParams {
  /** Inefficiency scaling factor (default 0.25) */
  k: number;
  /** Exponent controlling curve shape (default 1.8) */
  p: number;
}

export const DEFAULT_POWER_LAW: PowerLawParams = { k: 0.25, p: 1.8 };

/**
 * Power law model:
 *   effective_util = base_util × (1 - k × L^p)
 *
 * At L=0: full utilization. At L=1: 25% revenue loss (with default k=0.25).
 */
export function powerLawEfficiency(
  input: InefficiencyParams,
  params: PowerLawParams = DEFAULT_POWER_LAW
): number {
  const { baseUtilization, lockedFraction } = input;
  const L = clamp(lockedFraction, 0, 1);
  const loss = params.k * Math.pow(L, params.p);
  return baseUtilization * (1 - loss);
}

/**
 * Compute the efficiency factor at a given locked fraction (power law).
 * This is the multiplier applied to base utilization: (1 - k × L^p)
 */
export function powerLawFactor(
  lockedFraction: number,
  params: PowerLawParams = DEFAULT_POWER_LAW
): number {
  const L = clamp(lockedFraction, 0, 1);
  return 1 - params.k * Math.pow(L, params.p);
}

/**
 * Compute the efficiency factor at a given locked fraction (hill).
 * This is the multiplier applied to base utilization: (1 - gap_rate)
 */
export function hillFactor(
  lockedFraction: number,
  params: HillParams = DEFAULT_HILL
): number {
  const L = clamp(lockedFraction, 0, 1);
  const Lp = Math.pow(L, params.p);
  const kp = Math.pow(params.k, params.p);
  const gapRate = params.g0 + (params.gmax - params.g0) * (Lp / (Lp + kp));
  return 1 - gapRate;
}

// ─── Hill Function Model (advanced, sigmoid-shaped) ────────────────────

export interface HillParams {
  /** Baseline gap rate at L=0 (default 0.02) */
  g0: number;
  /** Maximum gap rate at L=1 (default 0.35) */
  gmax: number;
  /** Half-max locked fraction (default 0.50) */
  k: number;
  /** Hill coefficient (default 2.0) */
  p: number;
}

export const DEFAULT_HILL: HillParams = { g0: 0.02, gmax: 0.35, k: 0.5, p: 2.0 };

/**
 * Hill function model:
 *   gap_rate(L) = g0 + (gmax - g0) × (L^p / (L^p + k^p))
 *   effective_util = base_util × (1 - gap_rate)
 *
 * Sigmoid-shaped, naturally bounded, grounded in queuing theory.
 */
export function hillEfficiency(
  input: InefficiencyParams,
  params: HillParams = DEFAULT_HILL
): number {
  const { baseUtilization, lockedFraction } = input;
  const L = clamp(lockedFraction, 0, 1);
  const Lp = Math.pow(L, params.p);
  const kp = Math.pow(params.k, params.p);
  const gapRate = params.g0 + (params.gmax - params.g0) * (Lp / (Lp + kp));
  return baseUtilization * (1 - gapRate);
}

// ─── Revenue Calculations ──────────────────────────────────────────────

export interface RevenueInput {
  numCourts: number;
  operatingHoursPerDay: number;
  pricePerHour: number;
  effectiveUtilization: number;
}

/** Calculate revenue for a given time period */
export function calculateRevenue(input: RevenueInput): number {
  return (
    input.numCourts *
    input.operatingHoursPerDay *
    input.pricePerHour *
    input.effectiveUtilization
  );
}

export type TimePeriod = 'daily' | 'monthly' | 'annually';

export function periodMultiplier(period: TimePeriod): number {
  switch (period) {
    case 'daily':
      return 1;
    case 'monthly':
      return 30;
    case 'annually':
      return 365;
  }
}

/**
 * Calculate savings between PodPlay and traditional (all-locked) booking.
 *
 * Key semantics:
 * - `currentUtilization` = what the venue observes TODAY with 100% locked courts
 * - `lockedFraction` = what % of reservations remain locked WITH PodPlay
 *   (0% = PodPlay assigns everything; 100% = no change from today → savings = 0)
 *
 * We reverse-engineer the underlying demand from the current utilization,
 * then compute what PodPlay achieves at the given locked fraction.
 */
export function calculateSavings(input: {
  numCourts: number;
  operatingHoursPerDay: number;
  pricePerHour: number;
  currentUtilization: number;
  lockedFraction: number;
  lockPremiumPerHour?: number;
  period: TimePeriod;
  model?: 'powerLaw' | 'hill';
}): {
  revenuePodPlay: number;
  revenueTraditional: number;
  savings: number;
  savingsPercent: number;
  lockPremiumRevenue: number;
  effectiveUtilPodPlay: number;
  effectiveUtilTraditional: number;
} {
  const factorFn = input.model === 'hill' ? hillFactor : powerLawFactor;

  // Current utilization = trueDemand × factor(1.0)
  // So trueDemand = currentUtilization / factor(1.0)
  const factorAtFullLocked = factorFn(1.0);
  const trueDemand = Math.min(1.0, input.currentUtilization / factorAtFullLocked);

  // Traditional = 100% locked = what they have today
  const effectiveUtilTraditional = input.currentUtilization;

  // PodPlay = utilization at user's locked fraction
  const factorAtUserLocked = factorFn(input.lockedFraction);
  const effectiveUtilPodPlay = Math.min(1.0, trueDemand * factorAtUserLocked);

  const multiplier = periodMultiplier(input.period);

  const revenuePodPlay =
    calculateRevenue({
      numCourts: input.numCourts,
      operatingHoursPerDay: input.operatingHoursPerDay,
      pricePerHour: input.pricePerHour,
      effectiveUtilization: effectiveUtilPodPlay,
    }) * multiplier;

  const revenueTraditional =
    calculateRevenue({
      numCourts: input.numCourts,
      operatingHoursPerDay: input.operatingHoursPerDay,
      pricePerHour: input.pricePerHour,
      effectiveUtilization: effectiveUtilTraditional,
    }) * multiplier;

  const savings = revenuePodPlay - revenueTraditional;
  const savingsPercent =
    revenueTraditional > 0 ? (savings / revenueTraditional) * 100 : 0;

  // Lock premium: charged on locked court-hours booked with PodPlay
  const lockedBookedHours =
    input.numCourts *
    input.operatingHoursPerDay *
    effectiveUtilPodPlay *
    input.lockedFraction;
  const lockPremiumRevenue =
    lockedBookedHours * (input.lockPremiumPerHour ?? 0) * multiplier;

  return {
    revenuePodPlay,
    revenueTraditional,
    savings,
    savingsPercent,
    lockPremiumRevenue,
    effectiveUtilPodPlay,
    effectiveUtilTraditional,
  };
}

// ─── Simulator-Aligned Model ────────────────────────────────────────────

/**
 * Simulator-aligned savings calculation.
 *
 * Compares smart algorithm vs naive algorithm at the same locked percentage.
 * Calibrated from Monte Carlo simulation results:
 * - At 0% locked: smart ≈ naive (no packing advantage needed)
 * - As locked % increases, naive loses efficiency due to random court ordering
 * - Loss scales with both locked % and utilization pressure
 *
 * From simulator data (CV=15%, default settings):
 * - At 56% target, 11% locked: Smart 56.1%, Naive 54.2% (1.9pp gap, ~3.4% relative)
 * - At 80% target, 11% locked: Smart 83.5%, Naive 79.1% (4.4pp gap, ~5.3% relative)
 *
 * Model: naiveLoss = k × locked × targetUtil
 * Calibration: ~3.5% relative loss = k × 0.11 × 0.56 → k ≈ 0.55
 */
export function calculateSavingsSimulatorAligned(input: {
  numCourts: number;
  operatingHoursPerDay: number;
  pricePerHour: number;
  targetUtilization: number;
  lockedFraction: number;
  lockPremiumPerHour?: number;
  period: TimePeriod;
}): {
  revenueSmart: number;
  revenueNaive: number;
  savings: number;
  savingsPercent: number;
  lockPremiumRevenue: number;
  effectiveUtilSmart: number;
  effectiveUtilNaive: number;
} {
  const { targetUtilization, lockedFraction } = input;

  // Calibration constant from simulator results
  // At 56% util, 11% locked: ~3.4% relative loss for naive
  // At 80% util, 11% locked: ~5.3% relative loss for naive
  const k = 0.55;

  // Smart algorithm achieves target utilization
  const effectiveUtilSmart = Math.min(1.0, targetUtilization);

  // Naive algorithm loses efficiency due to random court ordering
  // Loss increases with both locked % and utilization pressure
  const naiveRelativeLoss = k * lockedFraction * targetUtilization;
  const effectiveUtilNaive = Math.min(
    1.0,
    targetUtilization * (1 - naiveRelativeLoss)
  );

  const multiplier = periodMultiplier(input.period);

  const revenueSmart =
    calculateRevenue({
      numCourts: input.numCourts,
      operatingHoursPerDay: input.operatingHoursPerDay,
      pricePerHour: input.pricePerHour,
      effectiveUtilization: effectiveUtilSmart,
    }) * multiplier;

  const revenueNaive =
    calculateRevenue({
      numCourts: input.numCourts,
      operatingHoursPerDay: input.operatingHoursPerDay,
      pricePerHour: input.pricePerHour,
      effectiveUtilization: effectiveUtilNaive,
    }) * multiplier;

  const savings = revenueSmart - revenueNaive;
  const savingsPercent = revenueNaive > 0 ? (savings / revenueNaive) * 100 : 0;

  // Lock premium: charged on locked court-hours with smart algorithm
  const lockedBookedHours =
    input.numCourts *
    input.operatingHoursPerDay *
    effectiveUtilSmart *
    lockedFraction;
  const lockPremiumRevenue =
    lockedBookedHours * (input.lockPremiumPerHour ?? 0) * multiplier;

  return {
    revenueSmart,
    revenueNaive,
    savings,
    savingsPercent,
    lockPremiumRevenue,
    effectiveUtilSmart,
    effectiveUtilNaive,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

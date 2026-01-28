/** Default operating hours per day */
export const DEFAULT_OPERATING_HOURS = 14;

/** Input limits */
export const LIMITS = {
  courts: { min: 1, max: 50 },
  utilization: { min: 10, max: 100 },
  price: { min: 10, max: 500 },
  locked: { min: 0, max: 100 },
} as const;

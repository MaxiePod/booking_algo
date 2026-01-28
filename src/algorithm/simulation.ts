import type {
  AssignmentResult,
  Court,
  OperatingSchedule,
  Reservation,
  AssignerConfig,
} from './types';
import { assignCourts } from './court-assigner';
import { slotDuration } from './utils';

/** Parameters for a Monte Carlo simulation run */
export interface SimulationParams {
  courts: Court[];
  schedule: OperatingSchedule;
  /** Number of simulation iterations */
  iterations: number;
  /** Average number of reservations per day */
  avgReservationsPerDay: number;
  /** Fraction of reservations that are locked (0–1) */
  lockedFraction: number;
  /** Possible durations in minutes (e.g., [60, 90, 120]) */
  durations: number[];
  /** Random seed (for reproducibility) */
  seed?: number;
}

/** Results of a simulation run */
export interface SimulationResult {
  iterations: number;
  avgGapMinutes: number;
  avgFragmentation: number;
  avgUtilization: number;
  minUtilization: number;
  maxUtilization: number;
  avgUnassigned: number;
  results: AssignmentResult[];
}

/**
 * Run a Monte Carlo simulation to evaluate the court assignment algorithm
 * across many random scenarios.
 */
export function runSimulation(params: SimulationParams): SimulationResult {
  const rng = createRng(params.seed ?? Date.now());
  const results: AssignmentResult[] = [];

  const config: AssignerConfig = {
    courts: params.courts,
    schedule: params.schedule,
  };

  const operatingMinutes =
    params.schedule.closeTime - params.schedule.openTime;

  for (let i = 0; i < params.iterations; i++) {
    const reservations = generateRandomReservations(
      params,
      operatingMinutes,
      rng
    );
    const result = assignCourts(reservations, config);
    results.push(result);
  }

  // Aggregate statistics
  const totalOperating = operatingMinutes * params.courts.length;

  const gapMinutesList = results.map((r) => r.totalGapMinutes);
  const fragList = results.map((r) => r.fragmentationScore);
  const utilList = results.map((r) => {
    const bookedMinutes = r.assignments.reduce(
      (sum, a) => sum + slotDuration(a.slot),
      0
    );
    return totalOperating > 0 ? bookedMinutes / totalOperating : 0;
  });
  const unassignedList = results.map((r) => r.unassigned.length);

  return {
    iterations: params.iterations,
    avgGapMinutes: avg(gapMinutesList),
    avgFragmentation: avg(fragList),
    avgUtilization: avg(utilList),
    minUtilization: Math.min(...utilList),
    maxUtilization: Math.max(...utilList),
    avgUnassigned: avg(unassignedList),
    results,
  };
}

/** Generate random reservations for one simulation iteration */
function generateRandomReservations(
  params: SimulationParams,
  operatingMinutes: number,
  rng: () => number
): Reservation[] {
  const count =
    params.avgReservationsPerDay + Math.floor((rng() - 0.5) * 4);
  const reservations: Reservation[] = [];

  for (let j = 0; j < count; j++) {
    const duration =
      params.durations[Math.floor(rng() * params.durations.length)];

    // Random start time within operating hours, aligned to 30-min slots
    const maxStart = operatingMinutes - duration;
    if (maxStart <= 0) continue;

    const slotSize = 30;
    const numSlots = Math.floor(maxStart / slotSize);
    const start =
      params.schedule.openTime + Math.floor(rng() * numSlots) * slotSize;
    const end = start + duration;

    const isLocked = rng() < params.lockedFraction;
    const courtIdx = Math.floor(rng() * params.courts.length);

    reservations.push({
      id: `sim-${j}`,
      slot: { start, end },
      mode: isLocked ? 'locked' : 'flexible',
      lockedCourtId: isLocked ? params.courts[courtIdx].id : undefined,
    });
  }

  return reservations;
}

/** Simple seeded pseudo-random number generator (mulberry32) */
function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

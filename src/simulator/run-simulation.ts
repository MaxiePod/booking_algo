import type {
  AssignerConfig,
  AssignmentResult,
  Court,
  OperatingSchedule,
  Reservation,
} from '../algorithm/types';
import { assignCourts } from '../algorithm/court-assigner';
import { naiveAssignCourts } from '../algorithm/naive-assigner';
import { slotDuration } from '../algorithm/utils';
import type { SimulatorInputs, SimulatorResults, RunStats, DurationBinPcts } from './types';

function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sample from a normal distribution using Box-Muller transform.
 * Returns round(normal(mean, cv * mean)), clamped to [1, max].
 */
function sampleNormal(mean: number, cv: number, max: number, rng: () => number): number {
  const stddev = cv * mean;
  const u1 = rng();
  const u2 = rng();
  // Box-Muller: convert two uniform samples to a standard normal
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  const value = Math.round(mean + stddev * z);
  return Math.max(1, Math.min(max, value));
}

/**
 * Pick a duration using cumulative-probability bin selection.
 * Bins 0-2 return exact durations: M, M+B, M+2B.
 * Bin 3 randomly picks from M+2B, M+3B, ... up to min(operatingMinutes, 240).
 */
function pickWeightedDuration(
  M: number,
  B: number,
  pcts: DurationBinPcts,
  operatingMinutes: number,
  rng: () => number
): number {
  const maxDuration = Math.min(operatingMinutes, 240);
  const r = rng() * 100;
  let cumulative = 0;

  for (let i = 0; i < 4; i++) {
    cumulative += pcts[i];
    if (r < cumulative) {
      if (i === 0) return M;
      if (i === 1) return Math.min(M + B, maxDuration);
      if (i === 2) return Math.min(M + 2 * B, maxDuration);
      // Bin 3: random from M+2B up to maxDuration in steps of B
      const minBin3 = M + 2 * B;
      if (minBin3 >= maxDuration) return maxDuration;
      const steps: number[] = [];
      for (let d = minBin3; d <= maxDuration; d += B) {
        steps.push(d);
      }
      if (steps.length === 0) return minBin3;
      return steps[Math.floor(rng() * steps.length)];
    }
  }

  // Fallback (shouldn't happen with valid pcts summing to 100)
  return M;
}

/**
 * Concurrency-based feasibility check for reservation generation.
 * Tracks how many reservations overlap at each slot-block boundary.
 * A new reservation is feasible iff:
 *   1. Global concurrency stays ≤ numCourts at every point it spans
 *   2. For locked: the specific court is free (no locked-locked conflicts)
 *   3. For flexible: at least one court is free of locked reservations
 *      for the entire span (prevents unassignable precoloring conflicts)
 */
function createConcurrencyTracker(openTime: number, closeTime: number, blockSize: number, numCourts: number, courtIds: string[]) {
  const totalSlots = Math.ceil((closeTime - openTime) / blockSize);
  const counts = new Int32Array(totalSlots);
  const courtCounts = new Map<string, Int32Array>();
  for (const id of courtIds) {
    courtCounts.set(id, new Int32Array(totalSlots));
  }

  function slotRange(start: number, end: number): [number, number] {
    return [
      Math.floor((start - openTime) / blockSize),
      Math.ceil((end - openTime) / blockSize),
    ];
  }

  return {
    canFit(start: number, end: number, lockedCourtId?: string): boolean {
      const [from, to] = slotRange(start, end);
      for (let i = from; i < to && i < totalSlots; i++) {
        if (counts[i] >= numCourts) return false;
      }
      if (lockedCourtId) {
        const cc = courtCounts.get(lockedCourtId);
        if (cc) {
          for (let i = from; i < to && i < totalSlots; i++) {
            if (cc[i] > 0) return false;
          }
        }
      } else {
        // Verify at least one court is entirely free of locked reservations
        // for the span, preventing unassignable precoloring edge cases.
        let hasFreeCourt = false;
        for (const cc of courtCounts.values()) {
          let courtFree = true;
          for (let i = from; i < to && i < totalSlots; i++) {
            if (cc[i] > 0) { courtFree = false; break; }
          }
          if (courtFree) { hasFreeCourt = true; break; }
        }
        if (!hasFreeCourt) return false;
      }
      return true;
    },
    add(start: number, end: number, lockedCourtId?: string): void {
      const [from, to] = slotRange(start, end);
      for (let i = from; i < to && i < totalSlots; i++) {
        counts[i]++;
      }
      if (lockedCourtId) {
        const cc = courtCounts.get(lockedCourtId);
        if (cc) {
          for (let i = from; i < to && i < totalSlots; i++) {
            cc[i]++;
          }
        }
      }
    },
  };
}

function generateReservations(
  count: number,
  lockedFraction: number,
  courts: Court[],
  schedule: OperatingSchedule,
  minReservationMin: number,
  slotBlockMin: number,
  durationBinPcts: DurationBinPcts,
  rng: () => number
): Reservation[] {
  const operatingMinutes = schedule.closeTime - schedule.openTime;
  const reservations: Reservation[] = [];
  const tracker = createConcurrencyTracker(
    schedule.openTime, schedule.closeTime, slotBlockMin, courts.length,
    courts.map((c) => c.id)
  );
  const MAX_RETRIES = 40;

  // Keep generating until `count` reservations are placed, or until we've
  // exhausted reasonable attempts. This prevents high-demand days (with CV>0)
  // from losing reservations to capacity, which would pull average utilization
  // below the target.
  let placed = 0;
  let attempts = 0;
  const maxAttempts = count * 3;

  while (placed < count && attempts < maxAttempts) {
    attempts++;
    const duration = pickWeightedDuration(
      minReservationMin,
      slotBlockMin,
      durationBinPcts,
      operatingMinutes,
      rng
    );
    const maxStart = operatingMinutes - duration;
    if (maxStart <= 0) continue;

    const numSlots = Math.floor(maxStart / slotBlockMin) + 1;
    const isLocked = rng() < lockedFraction;
    const courtIdx = Math.floor(rng() * courts.length);
    const lockedCourtId = isLocked ? courts[courtIdx].id : undefined;

    let fitted = false;
    // Phase 1: random start times (fast, covers most cases)
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const start =
        schedule.openTime + Math.floor(rng() * numSlots) * slotBlockMin;
      const end = start + duration;

      if (tracker.canFit(start, end, lockedCourtId)) {
        reservations.push({
          id: `r-${placed}`,
          slot: { start, end },
          mode: isLocked ? 'locked' : 'flexible',
          lockedCourtId,
        });
        tracker.add(start, end, lockedCourtId);
        fitted = true;
        break;
      }
    }

    // Phase 2: systematic scan from a random offset (guarantees placement
    // if any valid slot exists, preventing retry-exhaustion losses)
    if (!fitted) {
      const offset = Math.floor(rng() * numSlots);
      for (let k = 0; k < numSlots; k++) {
        const slotIdx = (offset + k) % numSlots;
        const start = schedule.openTime + slotIdx * slotBlockMin;
        const end = start + duration;
        if (tracker.canFit(start, end, lockedCourtId)) {
          reservations.push({
            id: `r-${placed}`,
            slot: { start, end },
            mode: isLocked ? 'locked' : 'flexible',
            lockedCourtId,
          });
          tracker.add(start, end, lockedCourtId);
          fitted = true;
          break;
        }
      }
    }

    if (fitted) placed++;
    // If not fitted, this duration/time/court combo can't fit — loop tries
    // again with new random parameters (different duration, locked status, etc.)
  }

  // Sort by start time (locked before flexible at same start) so greedy
  // first-fit assigners can find a valid court assignment.
  reservations.sort((a, b) => {
    const startDiff = a.slot.start - b.slot.start;
    if (startDiff !== 0) return startDiff;
    if (a.mode === 'locked' && b.mode !== 'locked') return -1;
    if (a.mode !== 'locked' && b.mode === 'locked') return 1;
    return 0;
  });

  return reservations;
}

function utilization(result: AssignmentResult, totalMinutes: number): number {
  const booked = result.assignments.reduce(
    (s, a) => s + slotDuration(a.slot),
    0
  );
  return totalMinutes > 0 ? booked / totalMinutes : 0;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function runComparison(inputs: SimulatorInputs): SimulatorResults {
  const courts: Court[] = Array.from({ length: inputs.numCourts }, (_, i) => ({
    id: `c${i + 1}`,
    name: `Court ${i + 1}`,
  }));

  const schedule: OperatingSchedule = {
    openTime: inputs.openHour * 60,
    closeTime: inputs.closeHour * 60,
    minSlotDuration: inputs.minReservationMin,
  };

  const config: AssignerConfig = { courts, schedule };
  const totalMinutes = inputs.numCourts * (schedule.closeTime - schedule.openTime);
  const lockedFraction = inputs.lockedPercent / 100;
  const baseSeed = 42;

  const smartResults: AssignmentResult[] = [];
  const naiveResults: AssignmentResult[] = [];

  const cv = inputs.varianceCV / 100; // convert percentage to fraction
  const maxPossible = Math.floor(
    ((schedule.closeTime - schedule.openTime) / inputs.minReservationMin) * inputs.numCourts
  );

  for (let i = 0; i < inputs.iterations; i++) {
    const rng = createRng(baseSeed + i * 1000);

    const count =
      cv > 0
        ? sampleNormal(inputs.reservationsPerDay, cv, maxPossible, rng)
        : inputs.reservationsPerDay;

    const reservations = generateReservations(
      count,
      lockedFraction,
      courts,
      schedule,
      inputs.minReservationMin,
      inputs.slotBlockMin,
      inputs.durationBinPcts,
      rng
    );

    smartResults.push(assignCourts(reservations, config));

    const naiveRng = createRng(baseSeed + i * 1000 + 500);
    naiveResults.push(naiveAssignCourts(reservations, config, naiveRng));
  }

  const smart: RunStats = {
    avgUtil: avg(smartResults.map((r) => utilization(r, totalMinutes))),
    avgGapMinutes: avg(smartResults.map((r) => r.totalGapMinutes)),
    avgFragmentation: avg(smartResults.map((r) => r.fragmentationScore)),
    avgUnassigned: avg(smartResults.map((r) => r.unassigned.length)),
  };

  const naive: RunStats = {
    avgUtil: avg(naiveResults.map((r) => utilization(r, totalMinutes))),
    avgGapMinutes: avg(naiveResults.map((r) => r.totalGapMinutes)),
    avgFragmentation: avg(naiveResults.map((r) => r.fragmentationScore)),
    avgUnassigned: avg(naiveResults.map((r) => r.unassigned.length)),
  };

  // Pick sample day with the biggest gap difference for visual impact
  let bestSampleIdx = 0;
  let bestDelta = 0;
  for (let i = 0; i < smartResults.length; i++) {
    const delta = naiveResults[i].totalGapMinutes - smartResults[i].totalGapMinutes;
    if (delta > bestDelta) {
      bestDelta = delta;
      bestSampleIdx = i;
    }
  }

  // Revenue computation
  const totalCourtMinutes = inputs.numCourts * (schedule.closeTime - schedule.openTime);
  const pricePerMinute = inputs.pricePerHour / 60;
  const revenueSmartPerDay = totalCourtMinutes * smart.avgUtil * pricePerMinute;
  const revenueNaivePerDay = totalCourtMinutes * naive.avgUtil * pricePerMinute;
  const savingsPerDay = revenueSmartPerDay - revenueNaivePerDay;
  const savingsPercent =
    revenueNaivePerDay > 0 ? (savingsPerDay / revenueNaivePerDay) * 100 : 0;

  // Lock premium: average locked court-hours per day × premium rate
  const avgLockedMinutes = avg(
    smartResults.map((r) =>
      r.assignments
        .filter((a) => a.mode === 'locked')
        .reduce((sum, a) => sum + (a.slot.end - a.slot.start), 0)
    )
  );
  const lockPremiumPerDay = (avgLockedMinutes / 60) * inputs.lockPremiumPerHour;

  return {
    smart,
    naive,
    deltaUtil: smart.avgUtil - naive.avgUtil,
    gapSaved: naive.avgGapMinutes - smart.avgGapMinutes,
    fragReduction: naive.avgFragmentation - smart.avgFragmentation,
    revenueSmartPerDay,
    revenueNaivePerDay,
    savingsPerDay,
    savingsPercent,
    lockPremiumPerDay,
    sampleDay: {
      smart: smartResults[bestSampleIdx],
      naive: naiveResults[bestSampleIdx],
      courtNames: courts.map((c) => c.name),
      openTime: schedule.openTime,
      closeTime: schedule.closeTime,
    },
  };
}

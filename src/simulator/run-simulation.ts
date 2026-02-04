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
import type { SimulatorInputs, SimulatorResults, RunStats, DurationBinPcts, IterationResult, GapBreakdown } from './types';
import { PEAK_HOUR_START, PEAK_HOUR_END } from './types';

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

/**
 * Generate overflow reservations — pent-up demand that targets congested time slots.
 * These represent customers who would book but can't because courts are full.
 * All overflow is flexible (walk-in/opportunistic).
 *
 * The effective multiplier scales exponentially with target utilization:
 *   effective = baseMultiplier * e^(2 * (targetUtil - 0.5))
 * This models the reality that high-utilization facilities have disproportionately
 * more pent-up demand due to frequent turn-aways.
 *
 * When modelPeakTimes is true, pressure is boosted 2x during peak hours (5pm-9pm).
 */
function generateOverflow(
  baseReservations: Reservation[],
  numCourts: number,
  schedule: OperatingSchedule,
  slotBlockMin: number,
  minReservationMin: number,
  durationBinPcts: DurationBinPcts,
  overflowMultiplier: number,
  targetUtilization: number,
  modelPeakTimes: boolean,
  rng: () => number
): Reservation[] {
  if (overflowMultiplier <= 0) return [];

  const openTime = schedule.openTime;
  const closeTime = schedule.closeTime;
  const operatingMinutes = closeTime - openTime;
  const numSlots = Math.ceil(operatingMinutes / slotBlockMin);

  // Convert peak hours to minutes from midnight for comparison
  const peakStartMin = PEAK_HOUR_START * 60;
  const peakEndMin = PEAK_HOUR_END * 60;

  // Step 1: Build per-slot occupancy from base reservations
  const slotOccupancy = new Float64Array(numSlots);
  for (const res of baseReservations) {
    const fromSlot = Math.floor((res.slot.start - openTime) / slotBlockMin);
    const toSlot = Math.ceil((res.slot.end - openTime) / slotBlockMin);
    for (let i = fromSlot; i < toSlot && i < numSlots; i++) {
      slotOccupancy[i]++;
    }
  }

  // Step 2: Compute pressure per slot: max(0, (f - 0.5))² / 0.25
  // Apply peak time boost if enabled
  const pressure = new Float64Array(numSlots);
  let totalPressure = 0;
  for (let i = 0; i < numSlots; i++) {
    const f = slotOccupancy[i] / numCourts;
    let p = f > 0.5 ? ((f - 0.5) * (f - 0.5)) / 0.25 : 0;

    // Apply 2x pressure boost during peak hours if enabled
    if (modelPeakTimes && p > 0) {
      const slotStartMin = openTime + i * slotBlockMin;
      if (slotStartMin >= peakStartMin && slotStartMin < peakEndMin) {
        p *= 2;
      }
    }

    pressure[i] = p;
    totalPressure += p;
  }

  if (totalPressure === 0) return [];

  // Step 3: Apply exponential scaling based on target utilization
  // e^(2*(u-0.5)) gives: ~0.37 at 0%, 1.0 at 50%, ~2.72 at 100%
  const utilizationScale = Math.exp(2 * (targetUtilization - 0.5));
  const effectiveMultiplier = overflowMultiplier * utilizationScale;

  // Step 4: Overflow count using effective multiplier
  const overflowCount = Math.round(totalPressure * effectiveMultiplier);
  if (overflowCount === 0) return [];

  // Step 5: Build CDF from pressure for weighted start-time sampling
  const cdf = new Float64Array(numSlots);
  cdf[0] = pressure[0];
  for (let i = 1; i < numSlots; i++) {
    cdf[i] = cdf[i - 1] + pressure[i];
  }
  // Normalize
  const cdfTotal = cdf[numSlots - 1];
  if (cdfTotal > 0) {
    for (let i = 0; i < numSlots; i++) {
      cdf[i] /= cdfTotal;
    }
  }

  // Step 6: Generate overflow reservations
  const overflow: Reservation[] = [];
  for (let j = 0; j < overflowCount; j++) {
    // Sample start from CDF (binary search)
    const u = rng();
    let lo = 0;
    let hi = numSlots - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    const startSlot = lo;
    const start = openTime + startSlot * slotBlockMin;

    // Sample duration
    const duration = pickWeightedDuration(
      minReservationMin, slotBlockMin, durationBinPcts, operatingMinutes, rng
    );

    // Skip if extends past close
    if (start + duration > closeTime) continue;

    overflow.push({
      id: `overflow-${j}`,
      slot: { start, end: start + duration },
      mode: 'flexible',
    });
  }

  return overflow;
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

function computeGapBreakdown(results: AssignmentResult[], totalMinutes: number): GapBreakdown {
  const bookedMinutes = avg(
    results.map((r) =>
      r.assignments.reduce((s, a) => s + slotDuration(a.slot), 0)
    )
  );
  const strandedGapMinutes = avg(
    results.map((r) =>
      r.gaps.filter((g) => g.stranded).reduce((s, g) => s + g.duration, 0)
    )
  );
  const usableGapMinutes = avg(
    results.map((r) =>
      r.gaps.filter((g) => !g.stranded).reduce((s, g) => s + g.duration, 0)
    )
  );
  const strandedCount = avg(
    results.map((r) => r.gaps.filter((g) => g.stranded).length)
  );
  return { bookedMinutes, usableGapMinutes, strandedGapMinutes, strandedCount };
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

  const config: AssignerConfig = {
    courts,
    schedule,
    allowSplitting: inputs.allowSplitting,
    splittingTolerance: inputs.splittingTolerance,
    pricePerHour: inputs.pricePerHour,
  };
  const configNoSplit: AssignerConfig = { courts, schedule, allowSplitting: false };
  const totalMinutes = inputs.numCourts * (schedule.closeTime - schedule.openTime);
  const lockedFraction = inputs.lockedPercent / 100;
  const baseSeed = 42;

  // Compute target utilization for exponential demand scaling
  const operatingMinutes = schedule.closeTime - schedule.openTime;
  const avgDuration =
    (inputs.durationBinPcts[0] / 100) * inputs.minReservationMin +
    (inputs.durationBinPcts[1] / 100) * (inputs.minReservationMin + inputs.slotBlockMin) +
    (inputs.durationBinPcts[2] / 100) * (inputs.minReservationMin + 2 * inputs.slotBlockMin) +
    (inputs.durationBinPcts[3] / 100) * ((inputs.minReservationMin + 2 * inputs.slotBlockMin + Math.min(operatingMinutes, 240)) / 2);
  const maxReservations = avgDuration > 0 ? Math.floor((inputs.numCourts * operatingMinutes) / avgDuration) : 1;
  const targetUtilization = maxReservations > 0 ? inputs.reservationsPerDay / maxReservations : 0;

  const smartResults: AssignmentResult[] = [];
  const naiveResults: AssignmentResult[] = [];
  // For 4-way splitting comparison
  const smartNoSplitResults: AssignmentResult[] = [];
  const naiveNoSplitResults: AssignmentResult[] = [];
  const iterationResults: IterationResult[] = [];

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

    const base = generateReservations(
      count,
      lockedFraction,
      courts,
      schedule,
      inputs.minReservationMin,
      inputs.slotBlockMin,
      inputs.durationBinPcts,
      rng
    );

    const overflow = generateOverflow(
      base,
      inputs.numCourts,
      schedule,
      inputs.slotBlockMin,
      inputs.minReservationMin,
      inputs.durationBinPcts,
      inputs.overflowMultiplier,
      targetUtilization,
      inputs.modelPeakTimes,
      rng
    );

    const reservations = [...base, ...overflow];

    const smartResult = assignCourts(reservations, config);
    smartResults.push(smartResult);

    const naiveRng = createRng(baseSeed + i * 1000 + 500);
    const naiveResult = naiveAssignCourts(reservations, config, naiveRng);
    naiveResults.push(naiveResult);

    // Run no-split versions for 4-way comparison when splitting is enabled
    if (inputs.allowSplitting) {
      const smartNoSplitResult = assignCourts(reservations, configNoSplit);
      smartNoSplitResults.push(smartNoSplitResult);

      const naiveNoSplitRng = createRng(baseSeed + i * 1000 + 600);
      const naiveNoSplitResult = naiveAssignCourts(reservations, configNoSplit, naiveNoSplitRng);
      naiveNoSplitResults.push(naiveNoSplitResult);
    }

    // Count overflow placements by checking which overflow IDs got assigned
    const overflowIds = new Set(overflow.map((r) => r.id));
    const overflowPlacedSmart = smartResult.assignments.filter((a) => overflowIds.has(a.id)).length;
    const overflowPlacedNaive = naiveResult.assignments.filter((a) => overflowIds.has(a.id)).length;

    // Count split reservations (unique reservation IDs that have isSplit=true)
    const smartSplitIds = new Set(
      smartResult.assignments.filter((a) => a.isSplit).map((a) => a.id)
    );
    const naiveSplitIds = new Set(
      naiveResult.assignments.filter((a) => a.isSplit).map((a) => a.id)
    );

    iterationResults.push({
      smartUtil: utilization(smartResult, totalMinutes),
      naiveUtil: utilization(naiveResult, totalMinutes),
      overflowGenerated: overflow.length,
      overflowPlacedSmart,
      overflowPlacedNaive,
      smartSplitCount: smartSplitIds.size,
      naiveSplitCount: naiveSplitIds.size,
    });
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

  // Pick sample day whose utilization is closest to target utilization
  // This ensures the animation reflects the configured capacity level
  let bestSampleIdx = 0;
  let bestUtilDiff = Infinity;
  for (let i = 0; i < smartResults.length; i++) {
    const smartUtil = utilization(smartResults[i], totalMinutes);
    const utilDiff = Math.abs(smartUtil - targetUtilization);
    if (utilDiff < bestUtilDiff) {
      bestUtilDiff = utilDiff;
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

  // Split metrics
  const avgSmartSplits = avg(iterationResults.map((r) => r.smartSplitCount));
  const avgNaiveSplits = avg(iterationResults.map((r) => r.naiveSplitCount));

  // 4-way splitting comparison
  const smartNoSplitUtil = inputs.allowSplitting && smartNoSplitResults.length > 0
    ? avg(smartNoSplitResults.map((r) => utilization(r, totalMinutes)))
    : smart.avgUtil;
  const naiveNoSplitUtil = inputs.allowSplitting && naiveNoSplitResults.length > 0
    ? avg(naiveNoSplitResults.map((r) => utilization(r, totalMinutes)))
    : naive.avgUtil;

  const splitting = {
    smartNoSplit: {
      revenue: totalCourtMinutes * smartNoSplitUtil * pricePerMinute,
      splits: 0,
      util: smartNoSplitUtil,
    },
    smartWithSplit: {
      revenue: revenueSmartPerDay,
      splits: avgSmartSplits,
      util: smart.avgUtil,
    },
    naiveNoSplit: {
      revenue: totalCourtMinutes * naiveNoSplitUtil * pricePerMinute,
      splits: 0,
      util: naiveNoSplitUtil,
    },
    naiveWithSplit: {
      revenue: revenueNaivePerDay,
      splits: avgNaiveSplits,
      util: naive.avgUtil,
    },
  };

  // Lock premium: average locked court-hours per day × premium rate
  const avgLockedMinutes = avg(
    smartResults.map((r) =>
      r.assignments
        .filter((a) => a.mode === 'locked')
        .reduce((sum, a) => sum + (a.slot.end - a.slot.start), 0)
    )
  );
  const lockPremiumPerDay = (avgLockedMinutes / 60) * inputs.lockPremiumPerHour;

  const smartGaps = computeGapBreakdown(smartResults, totalMinutes);
  const naiveGaps = computeGapBreakdown(naiveResults, totalMinutes);

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
    iterationResults,
    overflowGenerated: avg(iterationResults.map((r) => r.overflowGenerated)),
    overflowPlacedSmart: avg(iterationResults.map((r) => r.overflowPlacedSmart)),
    overflowPlacedNaive: avg(iterationResults.map((r) => r.overflowPlacedNaive)),
    smartGaps,
    naiveGaps,
    avgSmartSplits,
    avgNaiveSplits,
    splitting,
    sampleDay: {
      smart: smartResults[bestSampleIdx],
      naive: naiveResults[bestSampleIdx],
      courtNames: courts.map((c) => c.name),
      openTime: schedule.openTime,
      closeTime: schedule.closeTime,
    },
  };
}

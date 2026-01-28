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
import type { SimulatorInputs, SimulatorResults, RunStats } from './types';

function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateReservations(
  count: number,
  lockedFraction: number,
  courts: Court[],
  schedule: OperatingSchedule,
  durations: number[],
  slotBlockMin: number,
  rng: () => number
): Reservation[] {
  const operatingMinutes = schedule.closeTime - schedule.openTime;
  const reservations: Reservation[] = [];

  for (let j = 0; j < count; j++) {
    const duration = durations[Math.floor(rng() * durations.length)];
    const maxStart = operatingMinutes - duration;
    if (maxStart <= 0) continue;

    const numSlots = Math.floor(maxStart / slotBlockMin);
    const start =
      schedule.openTime + Math.floor(rng() * numSlots) * slotBlockMin;
    const end = start + duration;

    const isLocked = rng() < lockedFraction;
    const courtIdx = Math.floor(rng() * courts.length);

    reservations.push({
      id: `r-${j}`,
      slot: { start, end },
      mode: isLocked ? 'locked' : 'flexible',
      lockedCourtId: isLocked ? courts[courtIdx].id : undefined,
    });
  }

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

  for (let i = 0; i < inputs.iterations; i++) {
    const rng = createRng(baseSeed + i * 1000);
    const reservations = generateReservations(
      inputs.reservationsPerDay,
      lockedFraction,
      courts,
      schedule,
      inputs.durations,
      inputs.slotBlockMin,
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

  return {
    smart,
    naive,
    deltaUtil: smart.avgUtil - naive.avgUtil,
    gapSaved: naive.avgGapMinutes - smart.avgGapMinutes,
    fragReduction: naive.avgFragmentation - smart.avgFragmentation,
    sampleDay: {
      smart: smartResults[bestSampleIdx],
      naive: naiveResults[bestSampleIdx],
      courtNames: courts.map((c) => c.name),
      openTime: schedule.openTime,
      closeTime: schedule.closeTime,
    },
  };
}

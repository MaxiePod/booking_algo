/**
 * CLI benchmark: compares the smart court assigner vs. naive random assignment
 * across varying locked fractions and reservation loads.
 *
 * Run with: npx tsx src/benchmark.ts
 */

import type {
  AssignerConfig,
  AssignmentResult,
  Court,
  OperatingSchedule,
  Reservation,
} from './algorithm/types';
import { assignCourts } from './algorithm/court-assigner';
import { naiveAssignCourts } from './algorithm/naive-assigner';
import { slotDuration } from './algorithm/utils';

// ─── Configuration ─────────────────────────────────────────────────────

const NUM_COURTS = 6;
const OPEN_TIME = 480;   // 08:00
const CLOSE_TIME = 1320; // 22:00
const MIN_SLOT = 60;
const ITERATIONS = 50;
const SEED = 42;
const DURATIONS = [60, 90, 120];
const RESERVATION_COUNTS = [15, 25, 35];
const LOCKED_FRACTIONS = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

// ─── Helpers ───────────────────────────────────────────────────────────

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
  rng: () => number
): Reservation[] {
  const operatingMinutes = schedule.closeTime - schedule.openTime;
  const reservations: Reservation[] = [];

  for (let j = 0; j < count; j++) {
    const duration = DURATIONS[Math.floor(rng() * DURATIONS.length)];
    const maxStart = operatingMinutes - duration;
    if (maxStart <= 0) continue;

    const slotSize = 30;
    const numSlots = Math.floor(maxStart / slotSize);
    const start = schedule.openTime + Math.floor(rng() * numSlots) * slotSize;
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
  const booked = result.assignments.reduce((s, a) => s + slotDuration(a.slot), 0);
  return totalMinutes > 0 ? booked / totalMinutes : 0;
}

interface Stats {
  avgUtil: number;
  avgGap: number;
  avgFrag: number;
  avgUnassigned: number;
}

function runBench(
  reservationCount: number,
  lockedFraction: number,
  courts: Court[],
  config: AssignerConfig,
  totalMinutes: number,
  baseSeed: number
): { smart: Stats; naive: Stats } {
  const smartResults: AssignmentResult[] = [];
  const naiveResults: AssignmentResult[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const rng = createRng(baseSeed + i * 1000);
    const reservations = generateReservations(
      reservationCount,
      lockedFraction,
      courts,
      config.schedule,
      rng
    );

    smartResults.push(assignCourts(reservations, config));

    const naiveRng = createRng(baseSeed + i * 1000 + 500);
    naiveResults.push(naiveAssignCourts(reservations, config, naiveRng));
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    smart: {
      avgUtil: avg(smartResults.map((r) => utilization(r, totalMinutes))),
      avgGap: avg(smartResults.map((r) => r.totalGapMinutes)),
      avgFrag: avg(smartResults.map((r) => r.fragmentationScore)),
      avgUnassigned: avg(smartResults.map((r) => r.unassigned.length)),
    },
    naive: {
      avgUtil: avg(naiveResults.map((r) => utilization(r, totalMinutes))),
      avgGap: avg(naiveResults.map((r) => r.totalGapMinutes)),
      avgFrag: avg(naiveResults.map((r) => r.fragmentationScore)),
      avgUnassigned: avg(naiveResults.map((r) => r.unassigned.length)),
    },
  };
}

// ─── Main ──────────────────────────────────────────────────────────────

const courts: Court[] = Array.from({ length: NUM_COURTS }, (_, i) => ({
  id: `c${i + 1}`,
  name: `Court ${i + 1}`,
}));

const schedule: OperatingSchedule = {
  openTime: OPEN_TIME,
  closeTime: CLOSE_TIME,
  minSlotDuration: MIN_SLOT,
};

const config: AssignerConfig = { courts, schedule };
const totalMinutes = NUM_COURTS * (CLOSE_TIME - OPEN_TIME);

console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    COURT ASSIGNMENT ALGORITHM BENCHMARK                             ║');
console.log('╠══════════════════════════════════════════════════════════════════════════════════════╣');
console.log(`║  Courts: ${NUM_COURTS}  |  Hours: ${(CLOSE_TIME - OPEN_TIME) / 60}h (${fmt(OPEN_TIME)}–${fmt(CLOSE_TIME)})  |  Iterations: ${ITERATIONS}  |  Durations: ${DURATIONS.join('/')} min`);
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝');
console.log();

for (const count of RESERVATION_COUNTS) {
  console.log(`┌─── ${count} reservations/day ${'─'.repeat(60)}`);
  console.log('│');
  console.log(
    '│  Locked%  │  Smart Util  │  Naive Util  │  Δ Util  │  Smart Gap  │  Naive Gap  │  Gap Saved  │  Smart Frag  │  Naive Frag'
  );
  console.log(
    '│  ───────  │  ──────────  │  ──────────  │  ──────  │  ─────────  │  ─────────  │  ─────────  │  ──────────  │  ──────────'
  );

  for (const locked of LOCKED_FRACTIONS) {
    const { smart, naive } = runBench(
      count,
      locked,
      courts,
      config,
      totalMinutes,
      SEED
    );

    const deltaUtil = smart.avgUtil - naive.avgUtil;
    const gapSaved = naive.avgGap - smart.avgGap;

    console.log(
      `│  ${pct(locked, 5)}  │  ${pct(smart.avgUtil, 10)}  │  ${pct(naive.avgUtil, 10)}  │  ${signed(deltaUtil, 6)}  │  ${pad(smart.avgGap.toFixed(0), 9)} min │  ${pad(naive.avgGap.toFixed(0), 9)} min │  ${pad(gapSaved.toFixed(0), 9)} min │  ${pct(smart.avgFrag, 10)}  │  ${pct(naive.avgFrag, 10)}`
    );
  }

  console.log('│');
}

console.log('Done.');

// ─── Formatting helpers ────────────────────────────────────────────────

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function pct(value: number, width: number): string {
  return `${(value * 100).toFixed(1)}%`.padStart(width);
}

function signed(value: number, width: number): string {
  const s = `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
  return s.padStart(width);
}

function pad(s: string, width: number): string {
  return s.padStart(width);
}

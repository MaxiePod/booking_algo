import type {
  AssignedReservation,
  Court,
  Gap,
  OperatingSchedule,
} from './types';
import { findFreeSlots, slotDuration } from './utils';

/**
 * Analyze gaps across all courts for a given set of assignments.
 */
export function analyzeGaps(
  assignments: AssignedReservation[],
  courts: Court[],
  schedule: OperatingSchedule
): Gap[] {
  const gaps: Gap[] = [];

  for (const court of courts) {
    const freeSlots = findFreeSlots(
      assignments,
      court.id,
      schedule.openTime,
      schedule.closeTime
    );

    for (const slot of freeSlots) {
      const duration = slotDuration(slot);
      gaps.push({
        courtId: court.id,
        slot,
        duration,
        stranded: duration < schedule.minSlotDuration,
      });
    }
  }

  return gaps;
}

/**
 * Calculate the total gap minutes across all courts.
 */
export function totalGapMinutes(gaps: Gap[]): number {
  return gaps.reduce((sum, g) => sum + g.duration, 0);
}

/**
 * Calculate a fragmentation score (0–1).
 * 0 = perfectly packed, 1 = maximally fragmented.
 *
 * Score is based on the ratio of stranded gaps to total available time,
 * weighted by the number of gap segments (more segments = more fragmented).
 */
export function fragmentationScore(
  gaps: Gap[],
  courts: Court[],
  schedule: OperatingSchedule
): number {
  if (courts.length === 0) return 0;

  const totalOperatingMinutes =
    courts.length * (schedule.closeTime - schedule.openTime);
  if (totalOperatingMinutes === 0) return 0;

  const totalGap = totalGapMinutes(gaps);
  if (totalGap === 0) return 0;

  const strandedMinutes = gaps
    .filter((g) => g.stranded)
    .reduce((sum, g) => sum + g.duration, 0);

  // Base: ratio of gap time to total time
  const gapRatio = totalGap / totalOperatingMinutes;

  // Penalty: stranded gaps are worse than usable gaps
  const strandedRatio = totalGap > 0 ? strandedMinutes / totalGap : 0;

  // Segment penalty: more separate gaps = worse fragmentation
  const maxPossibleGaps = courts.length * 10; // heuristic cap
  const segmentPenalty = Math.min(gaps.length / maxPossibleGaps, 1);

  // Weighted combination
  const score = gapRatio * 0.4 + strandedRatio * 0.4 + segmentPenalty * 0.2;
  return Math.min(1, score);
}

/**
 * Find the largest usable gap on any court.
 */
export function largestUsableGap(gaps: Gap[]): Gap | null {
  const usable = gaps.filter((g) => !g.stranded);
  if (usable.length === 0) return null;
  return usable.reduce((max, g) => (g.duration > max.duration ? g : max));
}

/**
 * Get gaps for a specific court.
 */
export function gapsForCourt(gaps: Gap[], courtId: string): Gap[] {
  return gaps.filter((g) => g.courtId === courtId);
}

import type {
  AssignedReservation,
  AssignerConfig,
  AssignmentResult,
  CourtId,
  Reservation,
} from './types';
import { findFreeSlots, slotFitsIn, slotsOverlap, getCourtReservations } from './utils';
import { analyzeGaps, fragmentationScore, totalGapMinutes } from './gap-analyzer';

/**
 * Naive random splitting — splits reservation across random available courts.
 * No optimization for minimizing splits.
 */
function naiveTrySplit(
  reservation: Reservation,
  currentAssignments: AssignedReservation[],
  config: AssignerConfig,
  rng: () => number
): AssignedReservation[] {
  const { start, end } = reservation.slot;
  const minSlot = config.schedule.minSlotDuration;

  // Collect all free slots across all courts that overlap with the reservation
  type FreeSlotInfo = { courtId: CourtId; start: number; end: number };
  const allFreeSlots: FreeSlotInfo[] = [];

  for (const court of config.courts) {
    const freeSlots = findFreeSlots(
      currentAssignments,
      court.id,
      config.schedule.openTime,
      config.schedule.closeTime
    );
    for (const fs of freeSlots) {
      const overlapStart = Math.max(fs.start, start);
      const overlapEnd = Math.min(fs.end, end);
      if (overlapEnd > overlapStart && overlapEnd - overlapStart >= minSlot) {
        allFreeSlots.push({
          courtId: court.id,
          start: overlapStart,
          end: overlapEnd,
        });
      }
    }
  }

  if (allFreeSlots.length === 0) return [];

  // Shuffle for randomness (naive behavior)
  allFreeSlots.sort(() => rng() - 0.5);

  // Greedy covering in random order
  const result: AssignedReservation[] = [];
  let currentTime = start;

  while (currentTime < end) {
    let bestSlot: FreeSlotInfo | null = null;
    let bestEnd = currentTime;

    // Find any slot that can extend from currentTime (first found in random order)
    for (const slot of allFreeSlots) {
      if (slot.start <= currentTime && slot.end > currentTime) {
        if (!bestSlot || slot.end > bestEnd) {
          bestSlot = slot;
          bestEnd = slot.end;
        }
      }
    }

    if (!bestSlot || bestEnd <= currentTime) {
      return [];
    }

    const segmentStart = currentTime;
    const segmentEnd = Math.min(bestEnd, end);

    result.push({
      ...reservation,
      slot: { start: segmentStart, end: segmentEnd },
      courtId: bestSlot.courtId,
      isSplit: true,
    });

    // Remove used portion
    const usedIdx = allFreeSlots.findIndex(
      (s) => s.courtId === bestSlot!.courtId && s.start === bestSlot!.start && s.end === bestSlot!.end
    );
    if (usedIdx >= 0) {
      const used = allFreeSlots[usedIdx];
      allFreeSlots.splice(usedIdx, 1);
      if (used.start < segmentStart) {
        allFreeSlots.push({ courtId: used.courtId, start: used.start, end: segmentStart });
      }
      if (used.end > segmentEnd) {
        allFreeSlots.push({ courtId: used.courtId, start: segmentEnd, end: used.end });
      }
    }

    currentTime = segmentEnd;
  }

  return result;
}

/**
 * Naive random court assignment — baseline for benchmarking.
 * Assigns each reservation to the first court that has space,
 * iterating courts in random order. No scoring, no compaction.
 */
export function naiveAssignCourts(
  reservations: Reservation[],
  config: AssignerConfig,
  rng: () => number
): AssignmentResult {
  const assignments: AssignedReservation[] = [];
  const unassigned: Reservation[] = [];

  // Place locked first
  const locked = reservations.filter((r) => r.mode === 'locked');
  const flexible = reservations.filter((r) => r.mode === 'flexible');

  for (const res of locked) {
    if (
      res.lockedCourtId &&
      config.courts.some((c) => c.id === res.lockedCourtId)
    ) {
      const courtBookings = getCourtReservations(assignments, res.lockedCourtId);
      const conflicts = courtBookings.some((b) => slotsOverlap(b.slot, res.slot));
      if (!conflicts) {
        assignments.push({ ...res, courtId: res.lockedCourtId });
      } else {
        unassigned.push(res);
      }
    } else {
      unassigned.push(res);
    }
  }

  // Assign flexible to random court (first-fit, random order)
  for (const res of flexible) {
    const shuffled = [...config.courts].sort(() => rng() - 0.5);
    let placed = false;

    for (const court of shuffled) {
      const freeSlots = findFreeSlots(
        assignments,
        court.id,
        config.schedule.openTime,
        config.schedule.closeTime
      );
      const fits = freeSlots.some((fs) => slotFitsIn(res.slot, fs));
      if (fits) {
        assignments.push({ ...res, courtId: court.id });
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Try splitting if allowed
      if (config.allowSplitting) {
        const splitResult = naiveTrySplit(res, assignments, config, rng);
        if (splitResult.length > 0) {
          assignments.push(...splitResult);
          placed = true;
        }
      }
      if (!placed) {
        unassigned.push(res);
      }
    }
  }

  const gaps = analyzeGaps(assignments, config.courts, config.schedule);

  return {
    assignments,
    unassigned,
    gaps,
    totalGapMinutes: totalGapMinutes(gaps),
    fragmentationScore: fragmentationScore(gaps, config.courts, config.schedule),
  };
}

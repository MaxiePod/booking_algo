import type {
  AssignedReservation,
  AssignerConfig,
  AssignmentResult,
  Reservation,
} from './types';
import { findFreeSlots, slotFitsIn, slotsOverlap, getCourtReservations } from './utils';
import { analyzeGaps, fragmentationScore, totalGapMinutes } from './gap-analyzer';

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
      unassigned.push(res);
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

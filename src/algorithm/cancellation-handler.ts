import type {
  AssignedReservation,
  AssignerConfig,
  AssignmentResult,
  ReservationId,
} from './types';
import {
  findFreeSlots,
  getCourtReservations,
  slotFitsIn,
  slotsAdjacent,
  slotDuration,
} from './utils';
import { analyzeGaps, fragmentationScore, totalGapMinutes } from './gap-analyzer';

/**
 * Handle a cancellation by removing the reservation and attempting
 * to reassign flexible reservations to fill the resulting gap.
 *
 * Uses up to `maxChainDepth` chained reassignments (default 2).
 */
export function handleCancellation(
  reservationId: ReservationId,
  currentAssignments: AssignedReservation[],
  config: AssignerConfig,
  maxChainDepth: number = 2
): AssignmentResult {
  // Remove the cancelled reservation
  const cancelled = currentAssignments.find((a) => a.id === reservationId);
  if (!cancelled) {
    const gaps = analyzeGaps(currentAssignments, config.courts, config.schedule);
    return {
      assignments: [...currentAssignments],
      unassigned: [],
      gaps,
      totalGapMinutes: totalGapMinutes(gaps),
      fragmentationScore: fragmentationScore(gaps, config.courts, config.schedule),
    };
  }

  let assignments = currentAssignments.filter((a) => a.id !== reservationId);

  // Try chain reassignments to fill the gap
  for (let depth = 0; depth < maxChainDepth; depth++) {
    const moved = tryFillGaps(assignments, config);
    if (!moved) break;
    assignments = moved;
  }

  const gaps = analyzeGaps(assignments, config.courts, config.schedule);

  return {
    assignments,
    unassigned: [],
    gaps,
    totalGapMinutes: totalGapMinutes(gaps),
    fragmentationScore: fragmentationScore(gaps, config.courts, config.schedule),
  };
}

/**
 * Try to move one flexible reservation to reduce gaps.
 * Returns the updated assignments if a beneficial move was found, null otherwise.
 */
function tryFillGaps(
  assignments: AssignedReservation[],
  config: AssignerConfig
): AssignedReservation[] | null {
  const currentGapTotal = totalGapMinutes(
    analyzeGaps(assignments, config.courts, config.schedule)
  );

  // Find flexible reservations that could be moved
  const flexible = assignments
    .map((a, i) => ({ assignment: a, index: i }))
    .filter(({ assignment }) => assignment.mode === 'flexible');

  let bestMove: { index: number; newCourtId: string; gapReduction: number } | null = null;

  for (const { assignment, index } of flexible) {
    for (const court of config.courts) {
      if (court.id === assignment.courtId) continue;

      // Check if it fits on the target court
      const withoutCurrent = assignments.filter((_, i) => i !== index);
      const freeSlots = findFreeSlots(
        withoutCurrent,
        court.id,
        config.schedule.openTime,
        config.schedule.closeTime
      );

      const fits = freeSlots.some((fs) => slotFitsIn(assignment.slot, fs));
      if (!fits) continue;

      // Check if this is adjacent to existing bookings (prefer gap-filling moves)
      const courtBookings = getCourtReservations(withoutCurrent, court.id);
      const isAdjacent = courtBookings.some((b) =>
        slotsAdjacent(b.slot, assignment.slot)
      );

      const testAssignments = [
        ...withoutCurrent,
        { ...assignment, courtId: court.id },
      ];
      const newGapTotal = totalGapMinutes(
        analyzeGaps(testAssignments, config.courts, config.schedule)
      );

      const gapReduction = currentGapTotal - newGapTotal;

      // Only consider moves that reduce gaps; prefer adjacent placements
      if (
        gapReduction > 0 &&
        (!bestMove ||
          gapReduction > bestMove.gapReduction ||
          (gapReduction === bestMove.gapReduction && isAdjacent))
      ) {
        bestMove = { index, newCourtId: court.id, gapReduction };
      }
    }
  }

  if (!bestMove) return null;

  const result = [...assignments];
  result[bestMove.index] = {
    ...result[bestMove.index],
    courtId: bestMove.newCourtId,
  };
  return result;
}

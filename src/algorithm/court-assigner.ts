import type {
  AssignedReservation,
  AssignerConfig,
  AssignmentResult,
  Court,
  CourtId,
  PlacementScore,
  Reservation,
  ScoringWeights,
  DEFAULT_WEIGHTS,
} from './types';
import { DEFAULT_WEIGHTS as WEIGHTS } from './types';
import {
  findFreeSlots,
  getCourtReservations,
  longestContiguousBlock,
  slotDuration,
  slotsAdjacent,
  slotsOverlap,
  totalBookedMinutes,
  slotFitsIn,
} from './utils';
import { analyzeGaps, fragmentationScore, totalGapMinutes } from './gap-analyzer';

/**
 * First-Fit-Decreasing bin-packing adapted for court scheduling.
 *
 * 1. Place locked reservations first (immovable constraints)
 * 2. Sort flexible reservations by start time, then duration descending
 * 3. Score each court for each flexible reservation
 * 4. Assign to highest-scoring court
 * 5. Post-assignment compaction pass
 */
export function assignCourts(
  reservations: Reservation[],
  config: AssignerConfig
): AssignmentResult {
  const weights = config.weights ?? WEIGHTS;
  const assignments: AssignedReservation[] = [];
  const unassigned: Reservation[] = [];

  // Step 1: Partition into locked and flexible
  const locked = reservations.filter((r) => r.mode === 'locked');
  const flexible = reservations.filter((r) => r.mode === 'flexible');

  // Step 2: Place locked reservations
  for (const res of locked) {
    if (
      res.lockedCourtId &&
      config.courts.some((c) => c.id === res.lockedCourtId)
    ) {
      const courtBookings = getCourtReservations(
        assignments,
        res.lockedCourtId
      );
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

  // Step 3: Sort flexible — by start time, then duration descending
  const sortedFlexible = [...flexible].sort((a, b) => {
    const startDiff = a.slot.start - b.slot.start;
    if (startDiff !== 0) return startDiff;
    return slotDuration(b.slot) - slotDuration(a.slot);
  });

  // Step 4 & 5: Score and assign each flexible reservation
  for (const res of sortedFlexible) {
    const scores = config.courts
      .map((court) => scorePlacement(res, court, assignments, config, weights))
      .filter((s) => s !== null) as PlacementScore[];

    if (scores.length === 0) {
      // No single court can fit this reservation
      if (config.allowSplitting) {
        // Try to split across multiple courts
        const splitResult = trySplitReservation(res, assignments, config);
        if (splitResult.length > 0) {
          assignments.push(...splitResult);
          continue;
        }
      }
      unassigned.push(res);
      continue;
    }

    // Pick highest total score; break ties by lowest load
    scores.sort((a, b) => {
      const scoreDiff = b.total - a.total;
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      return a.loadTiebreaker - b.loadTiebreaker;
    });

    assignments.push({ ...res, courtId: scores[0].courtId });
  }

  // Step 6: Post-assignment compaction pass
  compactAssignments(assignments, config, weights);

  // Compute final metrics
  const gaps = analyzeGaps(assignments, config.courts, config.schedule);

  return {
    assignments,
    unassigned,
    gaps,
    totalGapMinutes: totalGapMinutes(gaps),
    fragmentationScore: fragmentationScore(gaps, config.courts, config.schedule),
  };
}

/**
 * Try to split a reservation across multiple courts when it can't fit on a single court.
 * Uses a greedy approach that minimizes the number of splits.
 * Returns the split assignments if successful, or empty array if the reservation cannot be placed.
 */
function trySplitReservation(
  reservation: Reservation,
  currentAssignments: AssignedReservation[],
  config: AssignerConfig
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
      // Only consider slots that overlap with the reservation
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

  // Sort by largest coverage first (greedy: maximize coverage per split)
  allFreeSlots.sort((a, b) => (b.end - b.start) - (a.end - a.start));

  // Greedy covering: pick slots to cover [start, end]
  const result: AssignedReservation[] = [];
  let currentTime = start;

  while (currentTime < end) {
    // Find the best slot that starts at or before currentTime and extends furthest
    let bestSlot: FreeSlotInfo | null = null;
    let bestEnd = currentTime;

    for (const slot of allFreeSlots) {
      if (slot.start <= currentTime && slot.end > bestEnd) {
        bestSlot = slot;
        bestEnd = slot.end;
      }
    }

    if (!bestSlot || bestEnd <= currentTime) {
      // Can't cover the remaining time
      return [];
    }

    // Create a split assignment for this segment
    const segmentStart = currentTime;
    const segmentEnd = Math.min(bestEnd, end);

    result.push({
      ...reservation,
      slot: { start: segmentStart, end: segmentEnd },
      courtId: bestSlot.courtId,
      isSplit: true,
    });

    // Remove the used portion from available slots
    const usedIdx = allFreeSlots.findIndex(
      (s) => s.courtId === bestSlot!.courtId && s.start === bestSlot!.start && s.end === bestSlot!.end
    );
    if (usedIdx >= 0) {
      const used = allFreeSlots[usedIdx];
      allFreeSlots.splice(usedIdx, 1);
      // Add back any remaining portions
      if (used.start < segmentStart) {
        allFreeSlots.push({ courtId: used.courtId, start: used.start, end: segmentStart });
      }
      if (used.end > segmentEnd) {
        allFreeSlots.push({ courtId: used.courtId, start: segmentEnd, end: used.end });
      }
      // Re-sort
      allFreeSlots.sort((a, b) => (b.end - b.start) - (a.end - a.start));
    }

    currentTime = segmentEnd;
  }

  return result;
}

/**
 * Score a candidate placement of a reservation on a court.
 * Returns null if the reservation doesn't fit.
 */
function scorePlacement(
  reservation: Reservation,
  court: Court,
  currentAssignments: AssignedReservation[],
  config: AssignerConfig,
  weights: ScoringWeights
): PlacementScore | null {
  // Check if the slot fits in any free slot on this court
  const freeSlots = findFreeSlots(
    currentAssignments,
    court.id,
    config.schedule.openTime,
    config.schedule.closeTime
  );

  const fitsInFreeSlot = freeSlots.some((fs) =>
    slotFitsIn(reservation.slot, fs)
  );
  if (!fitsInFreeSlot) return null;

  const courtBookings = getCourtReservations(currentAssignments, court.id);

  // Adjacency bonus: slot is adjacent to an existing booking
  const adjacencyBonus = courtBookings.some((b) =>
    slotsAdjacent(b.slot, reservation.slot)
  )
    ? weights.adjacency
    : 0;

  // Contiguity bonus: extends the longest contiguous block
  const currentLongest = longestContiguousBlock(currentAssignments, court.id);
  const testAssignments = [
    ...currentAssignments,
    { ...reservation, courtId: court.id },
  ];
  const newLongest = longestContiguousBlock(testAssignments, court.id);
  const contiguityBonus =
    newLongest > currentLongest
      ? weights.contiguity * ((newLongest - currentLongest) / slotDuration(reservation.slot))
      : 0;

  // Gap creation penalty: does this create a new stranded gap?
  const newFreeSlots = findFreeSlots(
    testAssignments,
    court.id,
    config.schedule.openTime,
    config.schedule.closeTime
  );
  const newStrandedGaps = newFreeSlots.filter(
    (fs) => slotDuration(fs) < config.schedule.minSlotDuration && slotDuration(fs) > 0
  );
  const gapPenalty = newStrandedGaps.length > 0 ? weights.gapPenalty * newStrandedGaps.length : 0;

  // Fill bonus: completely fills an existing gap
  const fillBonus = freeSlots.some(
    (fs) =>
      fs.start === reservation.slot.start && fs.end === reservation.slot.end
  )
    ? weights.fill
    : 0;

  // Load tiebreaker: prefer less loaded courts
  const loadTiebreaker = totalBookedMinutes(currentAssignments, court.id);

  const total = adjacencyBonus + contiguityBonus + gapPenalty + fillBonus;

  return {
    courtId: court.id,
    total,
    adjacencyBonus,
    contiguityBonus,
    gapPenalty,
    fillBonus,
    loadTiebreaker,
  };
}

/**
 * Post-assignment compaction: try swapping flexible reservations
 * between courts to reduce total gaps.
 */
function compactAssignments(
  assignments: AssignedReservation[],
  config: AssignerConfig,
  weights: ScoringWeights
): void {
  const flexibleIndices = assignments
    .map((a, i) => (a.mode === 'flexible' ? i : -1))
    .filter((i) => i >= 0);

  let improved = true;
  let iterations = 0;
  const maxIterations = flexibleIndices.length * config.courts.length;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (const idx of flexibleIndices) {
      const res = assignments[idx];
      const currentCourtId = res.courtId;

      // Try moving to each other court
      for (const court of config.courts) {
        if (court.id === currentCourtId) continue;

        // Temporarily remove from current position
        const withoutCurrent = assignments.filter((_, i) => i !== idx);

        // Check if it fits on the new court
        const freeSlots = findFreeSlots(
          withoutCurrent,
          court.id,
          config.schedule.openTime,
          config.schedule.closeTime
        );

        const fits = freeSlots.some((fs) => slotFitsIn(res.slot, fs));
        if (!fits) continue;

        // Calculate gap improvement
        const currentGaps = analyzeGaps(assignments, config.courts, config.schedule);
        const currentTotalGap = totalGapMinutes(currentGaps);

        const testAssignments = [
          ...withoutCurrent,
          { ...res, courtId: court.id },
        ];
        const newGaps = analyzeGaps(testAssignments, config.courts, config.schedule);
        const newTotalGap = totalGapMinutes(newGaps);

        if (newTotalGap < currentTotalGap) {
          assignments[idx] = { ...res, courtId: court.id };
          improved = true;
          break;
        }
      }
    }
  }
}

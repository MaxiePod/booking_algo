import type { TimeSlot, MinuteOfDay, AssignedReservation, CourtId } from './types';

/** Check if two time slots overlap */
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Check if two time slots are adjacent (one ends where the other begins) */
export function slotsAdjacent(a: TimeSlot, b: TimeSlot): boolean {
  return a.end === b.start || b.end === a.start;
}

/** Duration of a time slot in minutes */
export function slotDuration(slot: TimeSlot): number {
  return slot.end - slot.start;
}

/** Merge two adjacent or overlapping slots into one */
export function mergeSlots(a: TimeSlot, b: TimeSlot): TimeSlot {
  return {
    start: Math.min(a.start, b.start),
    end: Math.max(a.end, b.end),
  };
}

/** Get all reservations for a specific court, sorted by start time */
export function getCourtReservations(
  assignments: AssignedReservation[],
  courtId: CourtId
): AssignedReservation[] {
  return assignments
    .filter((a) => a.courtId === courtId)
    .sort((a, b) => a.slot.start - b.slot.start);
}

/** Find free slots on a court between open and close time */
export function findFreeSlots(
  assignments: AssignedReservation[],
  courtId: CourtId,
  openTime: MinuteOfDay,
  closeTime: MinuteOfDay
): TimeSlot[] {
  const booked = getCourtReservations(assignments, courtId);
  const freeSlots: TimeSlot[] = [];

  let cursor = openTime;
  for (const res of booked) {
    if (res.slot.start > cursor) {
      freeSlots.push({ start: cursor, end: res.slot.start });
    }
    cursor = Math.max(cursor, res.slot.end);
  }
  if (cursor < closeTime) {
    freeSlots.push({ start: cursor, end: closeTime });
  }
  return freeSlots;
}

/** Check if a slot fits within a free slot */
export function slotFitsIn(slot: TimeSlot, freeSlot: TimeSlot): boolean {
  return slot.start >= freeSlot.start && slot.end <= freeSlot.end;
}

/** Find the longest contiguous booked block on a court */
export function longestContiguousBlock(
  assignments: AssignedReservation[],
  courtId: CourtId
): number {
  const booked = getCourtReservations(assignments, courtId);
  if (booked.length === 0) return 0;

  let maxBlock = slotDuration(booked[0].slot);
  let currentBlock = slotDuration(booked[0].slot);
  let currentEnd = booked[0].slot.end;

  for (let i = 1; i < booked.length; i++) {
    if (booked[i].slot.start === currentEnd) {
      currentBlock += slotDuration(booked[i].slot);
      currentEnd = booked[i].slot.end;
    } else {
      currentBlock = slotDuration(booked[i].slot);
      currentEnd = booked[i].slot.end;
    }
    maxBlock = Math.max(maxBlock, currentBlock);
  }
  return maxBlock;
}

/** Total booked minutes on a court */
export function totalBookedMinutes(
  assignments: AssignedReservation[],
  courtId: CourtId
): number {
  return getCourtReservations(assignments, courtId).reduce(
    (sum, r) => sum + slotDuration(r.slot),
    0
  );
}

/** Format minutes-since-midnight to HH:MM string */
export function formatTime(minutes: MinuteOfDay): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

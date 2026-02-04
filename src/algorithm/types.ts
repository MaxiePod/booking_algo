/** Unique identifier for a court */
export type CourtId = string;

/** Unique identifier for a reservation */
export type ReservationId = string;

/** Minutes since midnight (0–1440) */
export type MinuteOfDay = number;

/** A court available for booking */
export interface Court {
  id: CourtId;
  name: string;
  /** Optional attributes for future use (surface type, indoor/outdoor, etc.) */
  attributes?: Record<string, string>;
}

/** A time slot defined by start and end in minutes since midnight */
export interface TimeSlot {
  start: MinuteOfDay;
  end: MinuteOfDay;
}

/** Whether the reservation is locked to a specific court or flexible */
export type AssignmentMode = 'locked' | 'flexible';

/** A reservation request before court assignment */
export interface Reservation {
  id: ReservationId;
  slot: TimeSlot;
  mode: AssignmentMode;
  /** If locked, which court was selected */
  lockedCourtId?: CourtId;
  /** Optional priority (higher = assign first among equals) */
  priority?: number;
}

/** A reservation that has been assigned to a court */
export interface AssignedReservation extends Reservation {
  courtId: CourtId;
  /** True if this reservation was split across multiple courts */
  isSplit?: boolean;
}

/** A gap (unbooked interval) on a specific court */
export interface Gap {
  courtId: CourtId;
  slot: TimeSlot;
  /** Duration in minutes */
  duration: number;
  /** Whether this gap is "stranded" (too small to book) */
  stranded: boolean;
}

/** Score breakdown for a candidate court placement */
export interface PlacementScore {
  courtId: CourtId;
  total: number;
  adjacencyBonus: number;
  contiguityBonus: number;
  gapPenalty: number;
  fillBonus: number;
  loadTiebreaker: number;
}

/** Result of running the assignment algorithm */
export interface AssignmentResult {
  assignments: AssignedReservation[];
  unassigned: Reservation[];
  gaps: Gap[];
  totalGapMinutes: number;
  fragmentationScore: number;
}

/** Operating schedule for a day */
export interface OperatingSchedule {
  /** Start of operating hours in minutes since midnight */
  openTime: MinuteOfDay;
  /** End of operating hours in minutes since midnight */
  closeTime: MinuteOfDay;
  /** Minimum bookable slot in minutes */
  minSlotDuration: number;
}

/** Configuration for the assignment algorithm */
export interface AssignerConfig {
  courts: Court[];
  schedule: OperatingSchedule;
  weights?: ScoringWeights;
  /** When true, reservations may be split across multiple courts as a last resort */
  allowSplitting?: boolean;
  /** 0-100: Controls willingness to split. 0 = only split high-value, 100 = split freely */
  splittingTolerance?: number;
  /** Price per hour, used for revenue-based split decisions */
  pricePerHour?: number;
}

/** Tunable weights for the scoring function */
export interface ScoringWeights {
  adjacency: number;
  contiguity: number;
  gapPenalty: number;
  fill: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  adjacency: 1.0,
  contiguity: 1.5,
  gapPenalty: -2.0,
  fill: 3.0,
};

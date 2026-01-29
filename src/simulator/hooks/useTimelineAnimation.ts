import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { AssignmentResult } from '../../algorithm/types';

export interface MoveDetail {
  reservationId: string;
  fromCourt: string;
  fromStart: number;
  fromEnd: number;
  toCourt: string;
  toStart: number;
  toEnd: number;
}

export type AnimStep =
  | { type: 'batch-move'; moves: MoveDetail[] }
  | { type: 'add'; reservationId: string; court: string; start: number; end: number };

export type AnimPhase = 'idle' | 'playing' | 'paused' | 'done';

/**
 * Build animation steps: one batch-move step (all repositions simultaneously)
 * followed by individual add steps for newly placed reservations.
 * Locked and same-position-in-both reservations are excluded.
 */
export function computeAnimSteps(
  naiveAssignments: AssignmentResult,
  smartAssignments: AssignmentResult
): AnimStep[] {
  const naiveById = new Map(
    naiveAssignments.assignments.map((a) => [a.id, a])
  );

  const moves: MoveDetail[] = [];
  const adds: { type: 'add'; reservationId: string; court: string; start: number; end: number }[] = [];

  for (const sa of smartAssignments.assignments) {
    if (sa.mode === 'locked') continue;

    const na = naiveById.get(sa.id);

    if (!na) {
      adds.push({
        type: 'add',
        reservationId: sa.id,
        court: sa.courtId,
        start: sa.slot.start,
        end: sa.slot.end,
      });
      continue;
    }

    // Same position in both → skip
    if (
      na.courtId === sa.courtId &&
      na.slot.start === sa.slot.start &&
      na.slot.end === sa.slot.end
    ) {
      continue;
    }

    moves.push({
      reservationId: sa.id,
      fromCourt: na.courtId,
      fromStart: na.slot.start,
      fromEnd: na.slot.end,
      toCourt: sa.courtId,
      toStart: sa.slot.start,
      toEnd: sa.slot.end,
    });
  }

  // Sort moves by destination court then start
  moves.sort((a, b) => {
    if (a.toCourt < b.toCourt) return -1;
    if (a.toCourt > b.toCourt) return 1;
    return a.toStart - b.toStart;
  });

  // Sort adds by court then start
  adds.sort((a, b) => {
    if (a.court < b.court) return -1;
    if (a.court > b.court) return 1;
    return a.start - b.start;
  });

  const steps: AnimStep[] = [];
  if (moves.length > 0) {
    steps.push({ type: 'batch-move', moves });
  }
  steps.push(...adds);
  return steps;
}

/** Base timing in ms — batch moves get more time for visual clarity. */
function stepBaseMs(step: AnimStep): number {
  return step.type === 'batch-move' ? 1500 : 800;
}

export interface TimelineAnimationState {
  steps: AnimStep[];
  currentStepIndex: number;
  phase: AnimPhase;
  speed: number;
  isTransitioning: boolean;
  play: () => void;
  pause: () => void;
  reset: () => void;
  stepForward: () => void;
  setSpeed: (s: number) => void;
}

export function useTimelineAnimation(
  naiveAssignments: AssignmentResult,
  smartAssignments: AssignmentResult
): TimelineAnimationState {
  const steps = useMemo(
    () => computeAnimSteps(naiveAssignments, smartAssignments),
    [naiveAssignments, smartAssignments]
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [speed, setSpeedState] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef(phase);
  const speedRef = useRef(speed);
  const indexRef = useRef(currentStepIndex);

  phaseRef.current = phase;
  speedRef.current = speed;
  indexRef.current = currentStepIndex;

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (transTimerRef.current !== null) {
      clearTimeout(transTimerRef.current);
      transTimerRef.current = null;
    }
  }, []);

  /** Schedule the next step. Called after current transition completes. */
  const scheduleNext = useCallback(() => {
    const nextIdx = indexRef.current + 1;
    if (nextIdx >= steps.length) {
      setPhase('done');
      phaseRef.current = 'done';
      return;
    }

    const step = steps[nextIdx];
    const base = stepBaseMs(step);
    const pauseMs = (base * 0.3) / speedRef.current;
    const transMs = (base * 0.6) / speedRef.current;

    timerRef.current = setTimeout(() => {
      setCurrentStepIndex(nextIdx);
      indexRef.current = nextIdx;
      setIsTransitioning(true);

      transTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        if (nextIdx >= steps.length - 1) {
          setPhase('done');
          phaseRef.current = 'done';
        } else if (phaseRef.current === 'playing') {
          scheduleNext();
        }
      }, transMs);
    }, pauseMs);
  }, [steps]);

  const play = useCallback(() => {
    clearTimers();
    if (indexRef.current >= steps.length - 1 && phase === 'done') {
      setCurrentStepIndex(-1);
      indexRef.current = -1;
      setIsTransitioning(false);
    }
    setPhase('playing');
    phaseRef.current = 'playing';
    scheduleNext();
  }, [clearTimers, scheduleNext, steps.length, phase]);

  const pause = useCallback(() => {
    clearTimers();
    setPhase('paused');
    phaseRef.current = 'paused';
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setCurrentStepIndex(-1);
    indexRef.current = -1;
    setPhase('idle');
    phaseRef.current = 'idle';
    setIsTransitioning(false);
  }, [clearTimers]);

  const stepForward = useCallback(() => {
    clearTimers();
    if (phaseRef.current !== 'paused' && phaseRef.current !== 'idle') {
      setPhase('paused');
      phaseRef.current = 'paused';
    }

    const nextIdx = indexRef.current + 1;
    if (nextIdx >= steps.length) {
      setPhase('done');
      phaseRef.current = 'done';
      return;
    }

    const step = steps[nextIdx];
    const transMs = (stepBaseMs(step) * 0.6) / speedRef.current;

    setCurrentStepIndex(nextIdx);
    indexRef.current = nextIdx;
    setPhase('paused');
    phaseRef.current = 'paused';
    setIsTransitioning(true);

    transTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      if (nextIdx >= steps.length - 1) {
        setPhase('done');
        phaseRef.current = 'done';
      }
    }, transMs);
  }, [clearTimers, steps]);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
    speedRef.current = s;
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    clearTimers();
    setCurrentStepIndex(-1);
    indexRef.current = -1;
    setPhase('idle');
    phaseRef.current = 'idle';
    setIsTransitioning(false);
  }, [naiveAssignments, smartAssignments, clearTimers]);

  return {
    steps,
    currentStepIndex,
    phase,
    speed,
    isTransitioning,
    play,
    pause,
    reset,
    stepForward,
    setSpeed,
  };
}

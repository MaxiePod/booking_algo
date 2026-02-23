import React, { useMemo, useRef, useEffect, useState } from 'react';
import type { AssignmentResult, AssignedReservation } from '../../algorithm/types';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';
import { formatHour } from './CourtTimeline';
import { useTimelineAnimation } from '../hooks/useTimelineAnimation';
import type { MoveDetail } from '../hooks/useTimelineAnimation';

// Frozen position when paused mid-animation
interface FrozenPosition {
  left: string;
  top: string;
  width: string;
  opacity: string;
}

interface AnimatedTimelineProps {
  smart: AssignmentResult;
  naive: AssignmentResult;
  courtNames: string[];
  openTime: number;
  closeTime: number;
}

const COURT_LABEL_WIDTH = 70;
const LABEL_GAP = 12;
const ROW_HEIGHT = 26;
const ROW_GAP = 4;
const HOUR_ROW_HEIGHT = 20;

const BLOCK_COLORS = {
  locked: '#E5E1D8',     // cream/beige — customer-picked (premium)
  naive: '#6B6B6B',      // medium grey — naive/starting position
  optimized: '#10b981',  // green — optimized position after move
  moving: '#A3A3A3',     // light grey — currently animating
  newBlock: '#3B82F6',   // blue — newly placed (wasn't possible before)
  ghost: 'transparent',  // transparent background for ghost
  ghostBorder: '#737373', // grey dashed border for ghost outline
};

// Darker border shades for each block color
const BORDER_FOR: Record<string, string> = {
  [BLOCK_COLORS.locked]: '#D4CFC4',
  [BLOCK_COLORS.naive]: '#525252',
  [BLOCK_COLORS.optimized]: '#059669',
  [BLOCK_COLORS.moving]: '#737373',
  [BLOCK_COLORS.newBlock]: '#2563EB',
};

export const AnimatedTimeline: React.FC<AnimatedTimelineProps> = ({
  smart,
  naive,
  courtNames,
  openTime,
  closeTime,
}) => {
  const totalMinutes = closeTime - openTime;
  const anim = useTimelineAnimation(naive, smart);

  // Refs and state for pause-freeze functionality
  const blocksContainerRef = useRef<HTMLDivElement>(null);
  const [frozenPositions, setFrozenPositions] = useState<Map<string, FrozenPosition>>(new Map());
  const wasPausedRef = useRef(false);

  // Capture block positions when pausing
  useEffect(() => {
    if (anim.isPaused && !wasPausedRef.current && blocksContainerRef.current) {
      const container = blocksContainerRef.current;
      const blockElements = container.querySelectorAll('[data-block-key]');
      const positions = new Map<string, FrozenPosition>();

      blockElements.forEach((el) => {
        const key = el.getAttribute('data-block-key');
        if (key) {
          const computed = window.getComputedStyle(el);
          positions.set(key, {
            left: computed.left,
            top: computed.top,
            width: computed.width,
            opacity: computed.opacity,
          });
        }
      });

      setFrozenPositions(positions);
    } else if (!anim.isPaused && wasPausedRef.current) {
      setFrozenPositions(new Map());
    }
    wasPausedRef.current = anim.isPaused;
  }, [anim.isPaused]);

  const hourLabels = useMemo(() => {
    const labels: number[] = [];
    for (let m = openTime; m <= closeTime; m += 60) labels.push(m);
    return labels;
  }, [openTime, closeTime]);

  const courtIdToRow = useMemo(() => {
    const m = new Map<string, number>();
    courtNames.forEach((_, i) => m.set(`c${i + 1}`, i));
    return m;
  }, [courtNames]);

  // Dynamic transition duration based on current step type
  const currentStep =
    anim.currentStepIndex >= 0 && anim.currentStepIndex < anim.steps.length
      ? anim.steps[anim.currentStepIndex]
      : null;
  const baseMs = currentStep?.type === 'batch-move' ? 4300 : 2300;
  const transitionMs = (baseMs * 0.6) / anim.speed;

  // ── Identify the batch-move step ──────────────────────────────────────
  const batchStep = useMemo(() => {
    if (anim.steps.length > 0 && anim.steps[0].type === 'batch-move') {
      return anim.steps[0] as { type: 'batch-move'; moves: MoveDetail[] };
    }
    return null;
  }, [anim.steps]);

  // ── Build block list with clear phase logic ───────────────────────────
  const blocks = useMemo(() => {
    const pct = (m: number) => ((m - openTime) / totalMinutes) * 100;
    const wPct = (s: number, e: number) => ((e - s) / totalMinutes) * 100;

    // Phase flags
    const isIdle = anim.phase === 'idle';
    const isDone = anim.phase === 'done';
    const batchStarted = anim.currentStepIndex >= 0;
    const batchTransitioning = batchStep && anim.currentStepIndex === 0 && anim.isTransitioning;
    const batchComplete = batchStarted && !batchTransitioning;

    // Build lookups
    const moveMap = new Map<string, MoveDetail[]>();
    if (batchStep) {
      for (const m of batchStep.moves) {
        const existing = moveMap.get(m.reservationId) || [];
        existing.push(m);
        moveMap.set(m.reservationId, existing);
      }
    }

    const addMap = new Map<string, { stepIndex: number; court: string; start: number; end: number }[]>();
    anim.steps.forEach((s, i) => {
      if (s.type === 'add') {
        const existing = addMap.get(s.reservationId) || [];
        existing.push({ stepIndex: i, court: s.court, start: s.start, end: s.end });
        addMap.set(s.reservationId, existing);
      }
    });

    // Group assignments by ID
    const naiveById = new Map<string, AssignedReservation[]>();
    for (const a of naive.assignments) {
      const existing = naiveById.get(a.id) || [];
      existing.push(a);
      naiveById.set(a.id, existing);
    }

    const smartById = new Map<string, AssignedReservation[]>();
    for (const a of smart.assignments) {
      const existing = smartById.get(a.id) || [];
      existing.push(a);
      smartById.set(a.id, existing);
    }

    // Collect all unique reservation IDs
    const allIds = new Set<string>();
    naive.assignments.forEach((a) => allIds.add(a.id));
    smart.assignments.forEach((a) => allIds.add(a.id));

    const result: {
      key: string;
      courtRow: number;
      startPct: number;
      widthPct: number;
      color: string;
      opacity: number;
      highlight: boolean;
      isGhost: boolean;
      isNew: boolean;
      zIndex: number;
      noTransition?: boolean; // For split reservations that shouldn't animate
    }[] = [];

    // Pre-compute all ghost positions (where blocks moved FROM)
    // This must be done before the main loop so add blocks can check overlap
    // Only count moves where the court changed (time stays the same)
    const ghostPositions: { court: string; start: number; end: number }[] = [];
    if (batchComplete && batchStep) {
      for (const move of batchStep.moves) {
        // Only show ghost if court changed (reservations can't move in time)
        if (move.fromCourt !== move.toCourt) {
          ghostPositions.push({
            court: move.fromCourt,
            start: move.fromStart,
            end: move.fromEnd,
          });
        }
      }
    }

    for (const id of allIds) {
      const naiveList = naiveById.get(id) || [];
      const smartList = smartById.get(id) || [];
      const moves = moveMap.get(id);
      const addInfos = addMap.get(id);

      // ── LOCKED reservations: always show at their position ──────────
      if ((smartList[0]?.mode === 'locked') || (naiveList[0]?.mode === 'locked')) {
        const res = smartList[0] || naiveList[0];
        if (!res) continue;
        const row = courtIdToRow.get(res.courtId);
        if (row === undefined) continue;
        result.push({
          key: id,
          courtRow: row,
          startPct: pct(res.slot.start),
          widthPct: wPct(res.slot.start, res.slot.end),
          color: BLOCK_COLORS.locked,
          opacity: 1,
          highlight: false,
          isGhost: false,
          isNew: false,
          zIndex: 5,
        });
        continue;
      }

      // ── MOVE reservations: animate from naive → smart ───────────────
      // Filter to only valid moves (times must match - reservations can only change courts)
      const validMoves = moves?.filter(m =>
        m.fromStart === m.toStart && m.fromEnd === m.toEnd
      ) ?? [];

      // DEBUG: Log moves that were filtered out (time mismatch)
      const invalidMoves = moves?.filter(m =>
        m.fromStart !== m.toStart || m.fromEnd !== m.toEnd
      ) ?? [];
      if (invalidMoves.length > 0) {
        console.log(`[Animation] INVALID moves filtered out for ${id}:`, invalidMoves.map(m =>
          `${m.fromCourt}(${m.fromStart}-${m.fromEnd}) -> ${m.toCourt}(${m.toStart}-${m.toEnd})`
        ));
      }

      if (validMoves.length > 0) {
        for (let i = 0; i < validMoves.length; i++) {
          const move = validMoves[i];
          const blockKey = validMoves.length > 1 ? `${id}-part${i}` : id;

          // Time slot is fixed - only court changes
          const start = move.fromStart;
          const end = move.fromEnd;

          // Determine court and style based on animation phase
          let court: string;
          let color: string;
          let opacity: number;
          let highlight = false;

          if (isIdle) {
            // Before animation: show at naive court
            court = move.fromCourt;
            color = BLOCK_COLORS.naive;
            opacity = 0.85;
          } else if (batchTransitioning) {
            // During animation: moving to smart court
            court = move.toCourt;
            color = BLOCK_COLORS.moving;
            opacity = 1;
            highlight = true;
          } else {
            // After animation: at smart court
            court = move.toCourt;
            color = BLOCK_COLORS.optimized;
            opacity = 1;
          }

          const row = courtIdToRow.get(court);
          if (row === undefined) continue;

          result.push({
            key: blockKey,
            courtRow: row,
            startPct: pct(start),
            widthPct: wPct(start, end),
            color,
            opacity,
            highlight,
            isGhost: false,
            isNew: false,
            zIndex: highlight ? 10 : 3,
          });

          // Add ghost at original position after batch completes
          // Only show ghost if the court changed
          if (batchComplete) {
            const didMove = move.fromCourt !== move.toCourt;
            if (didMove) {
              const ghostRow = courtIdToRow.get(move.fromCourt);
              if (ghostRow !== undefined) {
                const ghostKey = validMoves.length > 1 ? `${id}-part${i}-ghost` : `${id}-ghost`;
                result.push({
                  key: ghostKey,
                  courtRow: ghostRow,
                  startPct: pct(move.fromStart),
                  widthPct: wPct(move.fromStart, move.fromEnd),
                  color: BLOCK_COLORS.ghost,
                  opacity: 1,
                  highlight: false,
                  isGhost: true,
                  isNew: false,
                  zIndex: 0,
                });
              }
            }
          }
        }
        continue;
      }

      // ── ADD reservations: appear after batch, only in smart ─────────
      // DEFENSIVE: Only process as "add" if the reservation does NOT exist in naive
      // This prevents reservations with different times from getting blue borders
      const inNaiveForAdd = naiveById.has(id) && (naiveById.get(id)?.length ?? 0) > 0;
      if (addInfos && addInfos.length > 0 && !inNaiveForAdd) {
        for (let i = 0; i < addInfos.length; i++) {
          const { stepIndex, court, start, end } = addInfos[i];
          const processed = stepIndex <= anim.currentStepIndex;
          const active = stepIndex === anim.currentStepIndex && anim.isTransitioning;
          const row = courtIdToRow.get(court);
          if (row === undefined) continue;

          const blockKey = addInfos.length > 1 ? `${id}-part${i}` : id;

          // Only show if step has been processed
          if (!processed && !active) continue;

          // Check if this add overlaps with any ghost position (freed space)
          // This validates that the new reservation uses space created by optimization
          const overlapsGhost = ghostPositions.some(
            (ghost) =>
              ghost.court === court &&
              ghost.start < end &&
              ghost.end > start
          );

          result.push({
            key: blockKey,
            courtRow: row,
            startPct: pct(start),
            widthPct: wPct(start, end),
            color: active ? BLOCK_COLORS.moving : BLOCK_COLORS.newBlock,
            opacity: active ? 0.8 : 1,
            highlight: active,
            isGhost: false,
            isNew: true,
            // Show with emphasis if it overlaps a ghost (using freed space)
            zIndex: active ? 10 : (overlapsGhost ? 4 : 3),
          });
        }
        continue;
      }

      // ── STATIC reservations: same position in both or no move needed ─
      const inSmart = smartList.length > 0;
      const inNaive = naiveList.length > 0;

      // Check if positions actually match between naive and smart
      const positionsMatch = inSmart && inNaive && smartList.every((s, idx) => {
        const n = naiveList[idx];
        return n && s.courtId === n.courtId && s.slot.start === n.slot.start && s.slot.end === n.slot.end;
      });

      if (inSmart && inNaive && !positionsMatch) {
        // Same reservation ID but different positions (likely due to splitting)
        // DEBUG: Log this case to understand why positions don't match
        console.log(`[Animation] !positionsMatch for ${id}:`);
        console.log(`  Naive:`, naiveList.map(n => `${n.courtId} @ ${n.slot.start}-${n.slot.end}`));
        console.log(`  Smart:`, smartList.map(s => `${s.courtId} @ ${s.slot.start}-${s.slot.end}`));

        // Always show at SMART positions - no animation, no switching
        // This prevents any visual "movement in time"
        for (let i = 0; i < smartList.length; i++) {
          const res = smartList[i];
          const row = courtIdToRow.get(res.courtId);
          if (row === undefined) continue;
          const blockKey = smartList.length > 1 ? `${id}-split-part${i}` : `${id}-split`;
          result.push({
            key: blockKey,
            courtRow: row,
            startPct: pct(res.slot.start),
            widthPct: wPct(res.slot.start, res.slot.end),
            color: isDone ? BLOCK_COLORS.optimized : BLOCK_COLORS.naive,
            opacity: isDone ? 1 : 0.85,
            highlight: false,
            isGhost: false,
            isNew: false,
            zIndex: 2,
            noTransition: true,
          });
        }
        continue;
      }

      const resList = smartList.length > 0 ? smartList : naiveList;

      for (let i = 0; i < resList.length; i++) {
        const res = resList[i];
        const row = courtIdToRow.get(res.courtId);
        if (row === undefined) continue;

        const blockKey = resList.length > 1 ? `${id}-part${i}` : id;

        // Reservation exists in both at same position - no animation needed
        if (inSmart && inNaive && positionsMatch) {
          result.push({
            key: blockKey,
            courtRow: row,
            startPct: pct(res.slot.start),
            widthPct: wPct(res.slot.start, res.slot.end),
            color: isDone ? BLOCK_COLORS.optimized : BLOCK_COLORS.naive,
            opacity: isDone ? 1 : 0.85,
            highlight: false,
            isGhost: false,
            isNew: false,
            zIndex: 2,
          });
        } else if (inNaive && !inSmart) {
          // Only in naive - check if this position is being used by a smart block
          // (either a moved block or an add block)
          const isReplacedByMove = batchStep?.moves.some(
            (m) =>
              m.toCourt === res.courtId &&
              m.toStart < res.slot.end &&
              m.toEnd > res.slot.start
          ) ?? false;

          const replacingAddInfo = anim.steps.find(
            (step) =>
              step.type === 'add' &&
              step.court === res.courtId &&
              step.start < res.slot.end &&
              step.end > res.slot.start
          );
          const isReplacedByAdd = !!replacingAddInfo;

          // Determine visibility based on whether replacement has occurred
          let shouldShow = true;
          let opacity = 0.85;

          if (isReplacedByMove && batchStarted) {
            // A moved block has taken this position - hide completely
            shouldShow = false;
          } else if (isReplacedByAdd && replacingAddInfo) {
            const addStepIndex = anim.steps.indexOf(replacingAddInfo);
            if (addStepIndex <= anim.currentStepIndex) {
              // The add has been processed - hide this block
              shouldShow = false;
            }
          } else if (isDone) {
            // No replacement but done - fade it out
            opacity = 0.2;
          }

          if (shouldShow) {
            result.push({
              key: blockKey,
              courtRow: row,
              startPct: pct(res.slot.start),
              widthPct: wPct(res.slot.start, res.slot.end),
              color: BLOCK_COLORS.naive,
              opacity,
              highlight: false,
              isGhost: false,
              isNew: false,
              zIndex: 1,
            });
          }
        }
      }
    }

    return result;
  }, [
    smart, naive, anim.steps, anim.currentStepIndex,
    anim.isTransitioning, anim.phase, courtIdToRow,
    openTime, totalMinutes, batchStep,
  ]);

  // ── Compute split connectors ────────────────────────────────────────
  const splitConnectors = useMemo(() => {
    if (anim.phase !== 'done') return [];

    const pct = (m: number) => ((m - openTime) / totalMinutes) * 100;

    // Group split assignments by reservation ID
    const splitGroups = new Map<string, typeof smart.assignments>();
    for (const a of smart.assignments) {
      if (a.isSplit) {
        const existing = splitGroups.get(a.id) || [];
        existing.push(a);
        splitGroups.set(a.id, existing);
      }
    }

    const connectors: {
      id: string;
      fromRow: number;
      toRow: number;
      fromX: number;
      toX: number;
    }[] = [];

    for (const [id, parts] of splitGroups) {
      if (parts.length < 2) continue;

      const sorted = [...parts].sort((a, b) => a.slot.start - b.slot.start);

      for (let i = 0; i < sorted.length - 1; i++) {
        const from = sorted[i];
        const to = sorted[i + 1];
        const fromRow = courtIdToRow.get(from.courtId);
        const toRow = courtIdToRow.get(to.courtId);
        if (fromRow === undefined || toRow === undefined) continue;

        connectors.push({
          id: `${id}-connector-${i}`,
          fromRow,
          toRow,
          fromX: pct(from.slot.end),
          toX: pct(to.slot.start),
        });
      }
    }

    return connectors;
  }, [smart.assignments, courtIdToRow, openTime, totalMinutes, anim.phase]);

  // ── Derived counts ──────────────────────────────────────────────────
  const trackAreaHeight = courtNames.length * (ROW_HEIGHT + ROW_GAP);
  const gapReduction = Math.round(naive.totalGapMinutes - smart.totalGapMinutes);
  const moveCount = batchStep ? batchStep.moves.length : 0;
  const addCount = anim.steps.filter((s) => s.type === 'add').length;
  const atLastStep =
    anim.currentStepIndex >= anim.steps.length - 1 || anim.phase === 'done';

  const toPercent = (m: number) => ((m - openTime) / totalMinutes) * 100;

  // ── Subtitle text ───────────────────────────────────────────────────
  const inBatchTransition =
    batchStep && anim.currentStepIndex === 0 && anim.isTransitioning;

  const subtitleText =
    anim.phase === 'idle'
      ? 'Showing current placement (before optimization). Press ▶ to watch the algorithm work.'
      : anim.phase === 'done'
        ? 'Optimization complete — all reservations in their optimal positions.'
        : inBatchTransition
          ? 'Moving flexible reservations to minimize gaps…'
          : 'Placing additional reservations in freed slots…';

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Header: title left, controls right */}
      <div style={styles.headerRow}>
        <h3 style={styles.title}>Sample Day — Court Timeline</h3>
        <div style={styles.controls}>
          <button
            style={{
              ...styles.primaryBtn,
              ...(anim.phase === 'playing' ? styles.primaryBtnDisabled : {}),
            }}
            onClick={anim.play}
            disabled={anim.phase === 'playing'}
            title={anim.phase === 'done' ? 'Replay' : 'Play'}
          >
            {anim.phase === 'done' ? '↻' : '▶'}
          </button>
          <button
            style={{
              ...styles.primaryBtn,
              ...(anim.phase !== 'playing' ? styles.primaryBtnDisabled : {}),
            }}
            onClick={anim.pause}
            disabled={anim.phase !== 'playing'}
            title="Pause"
          >
            {'⏸'}
          </button>

          <button
            style={{
              ...styles.primaryBtn,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            }}
            onClick={anim.reset}
            title="Reset"
          >
            {'↺'}
          </button>
          <button
            style={{
              ...styles.primaryBtn,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
              ...(atLastStep ? styles.primaryBtnDisabled : {}),
            }}
            onClick={anim.stepForward}
            disabled={atLastStep}
            title="Step forward"
          >
            {'⏭'}
          </button>

          <div style={styles.divider} />

          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              style={{
                ...styles.speedChip,
                ...(anim.speed === s ? styles.speedChipActive : {}),
              }}
              onClick={() => anim.setSpeed(s)}
            >
              {s}x
            </button>
          ))}

          <span style={styles.stepCounter}>
            {Math.max(0, anim.currentStepIndex + 1)}
            {'\u2009/\u2009'}
            {anim.steps.length}
          </span>
        </div>
      </div>

      <p style={styles.subtitle}>{subtitleText}</p>

      {/* Legend */}
      <div style={styles.legend}>
        <LegendItem color={BLOCK_COLORS.locked} label="Locked (customer-picked)" />
        <LegendItem color={BLOCK_COLORS.naive} label="Starting position" opacity={0.85} />
        <LegendItem color={BLOCK_COLORS.optimized} label="Optimized position" />
        <LegendItem color={BLOCK_COLORS.newBlock} label="New (extra capacity)" />
        <LegendItem color={BLOCK_COLORS.moving} label="Moving" />
        <LegendItem
          color={BLOCK_COLORS.ghostBorder}
          label="Previous position"
          dashed
        />
      </div>

      {/* Timeline */}
      <div style={styles.timelineWrapper}>
        {/* Hour labels */}
        <div style={styles.hourRow}>
          <div style={styles.courtLabel} />
          <div style={styles.trackContainer}>
            {hourLabels.map((m) => (
              <div
                key={m}
                style={{
                  position: 'absolute',
                  left: `${toPercent(m)}%`,
                  fontSize: '10px',
                  color: colors.textMuted,
                  transform: 'translateX(-50%)',
                  top: 0,
                }}
              >
                {formatHour(m)}
              </div>
            ))}
          </div>
        </div>

        {/* Court rows (background tracks + grid lines) */}
        {courtNames.map((name, idx) => (
          <div key={idx} style={styles.courtRow}>
            <div style={styles.courtLabel}>{name}</div>
            <div style={styles.track}>
              {hourLabels.map((m) => (
                <div
                  key={m}
                  style={{
                    position: 'absolute',
                    left: `${toPercent(m)}%`,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: colors.borderLight,
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Overlay: reservation blocks */}
        <div
          ref={blocksContainerRef}
          style={{
            position: 'absolute',
            left: COURT_LABEL_WIDTH + LABEL_GAP,
            top: HOUR_ROW_HEIGHT + 6,
            right: 0,
            height: trackAreaHeight,
            pointerEvents: 'none',
          }}
        >
          {blocks.map((bp) => {
            const frozen = anim.isPaused ? frozenPositions.get(bp.key) : null;
            return (
              <div
                key={bp.key}
                data-block-key={bp.key}
                style={{
                  position: 'absolute',
                  boxSizing: 'border-box',
                  left: frozen ? frozen.left : `${bp.startPct}%`,
                  width: frozen ? frozen.width : `${bp.widthPct}%`,
                  top: frozen ? frozen.top : bp.courtRow * (ROW_HEIGHT + ROW_GAP) + 3,
                  height: ROW_HEIGHT - 6,
                  backgroundColor: bp.color,
                  border: bp.isGhost
                    ? `2px dashed ${BLOCK_COLORS.ghostBorder}`
                    : bp.isNew
                      ? `2px solid ${BORDER_FOR[BLOCK_COLORS.newBlock]}`
                      : `1px solid ${BORDER_FOR[bp.color] || 'transparent'}`,
                  borderRadius: '3px',
                  transition: bp.isGhost || anim.isPaused || bp.noTransition
                    ? 'none'
                    : `left ${transitionMs}ms ease-in-out, top ${transitionMs}ms ease-in-out, width ${transitionMs}ms ease-in-out, opacity ${transitionMs}ms ease-in-out, background-color 0.3s ease`,
                  opacity: frozen ? parseFloat(frozen.opacity) : bp.opacity,
                  zIndex: bp.zIndex,
                  boxShadow: bp.highlight
                    ? `0 0 12px ${BLOCK_COLORS.moving}, 0 0 4px ${BLOCK_COLORS.moving}`
                    : 'none',
                }}
              />
            );
          })}

          {/* Split reservation connectors */}
          {splitConnectors.length > 0 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              {splitConnectors.map((conn) => {
                const fromY = conn.fromRow * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT / 2;
                const toY = conn.toRow * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT / 2;
                return (
                  <line
                    key={conn.id}
                    x1={`${conn.fromX}%`}
                    y1={fromY}
                    x2={`${conn.toX}%`}
                    y2={toY}
                    stroke={colors.textMuted}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    opacity={0.6}
                  />
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Summary when done */}
      {anim.phase === 'done' && (
        <div style={styles.summary}>
          {moveCount > 0 && (
            <span>{moveCount} reservation{moveCount !== 1 ? 's' : ''} repositioned</span>
          )}
          {moveCount > 0 && addCount > 0 && (
            <span style={styles.dot}>·</span>
          )}
          {addCount > 0 && (
            <span style={{ color: BLOCK_COLORS.newBlock }}>{addCount} additional reservation{addCount !== 1 ? 's' : ''} placed</span>
          )}
          {(moveCount > 0 || addCount > 0) && gapReduction > 0 && (
            <>
              <span style={styles.dot}>·</span>
              <span>Gap time reduced by {gapReduction} min</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Legend ─────────────────────────────────────────────────────────────

const LegendItem: React.FC<{
  color: string;
  label: string;
  dashed?: boolean;
  opacity?: number;
}> = ({ color, label, dashed, opacity }) => (
  <div style={styles.legendItem}>
    <div
      style={{
        width: '14px',
        height: '14px',
        borderRadius: '3px',
        backgroundColor: dashed ? 'transparent' : color,
        border: dashed
          ? `2px dashed ${color}`
          : 'none',
        opacity: opacity ?? 1,
        flexShrink: 0,
        boxSizing: 'border-box' as const,
      }}
    />
    <span style={{ fontSize: '12px', color: colors.textSecondary }}>
      {label}
    </span>
  </div>
);

// ─── Styles ────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    margin: 0,
    whiteSpace: 'nowrap' as const,
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
    marginTop: 0,
    marginBottom: spacing.lg,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    padding: 0,
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    color: '#ffffff',
    fontSize: '20px',
    cursor: 'pointer',
    fontFamily: fonts.family,
    transition: 'all 0.15s',
    lineHeight: 1,
  },
  primaryBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  divider: {
    width: '1px',
    height: '20px',
    backgroundColor: colors.border,
    margin: '0 4px',
  },
  speedChip: {
    padding: '4px 8px',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    fontSize: '11px',
    fontWeight: fonts.weightMedium,
    cursor: 'pointer',
    fontFamily: fonts.family,
    transition: 'all 0.15s',
  },
  speedChipActive: {
    backgroundColor: colors.primary,
    color: '#ffffff',
    borderColor: colors.primary,
  },
  stepCounter: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    fontWeight: fonts.weightMedium,
    fontVariantNumeric: 'tabular-nums',
    minWidth: '44px',
    textAlign: 'right' as const,
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  timelineWrapper: {
    position: 'relative' as const,
  },
  hourRow: {
    display: 'flex',
    alignItems: 'flex-end',
    height: `${HOUR_ROW_HEIGHT}px`,
    marginBottom: '4px',
  },
  trackContainer: {
    flex: 1,
    position: 'relative' as const,
    height: `${HOUR_ROW_HEIGHT}px`,
  },
  courtRow: {
    display: 'flex',
    alignItems: 'center',
    height: `${ROW_HEIGHT}px`,
    marginBottom: `${ROW_GAP}px`,
  },
  courtLabel: {
    width: `${COURT_LABEL_WIDTH}px`,
    flexShrink: 0,
    fontSize: '11px',
    color: colors.textSecondary,
    fontWeight: fonts.weightMedium,
    textAlign: 'right' as const,
    paddingRight: `${LABEL_GAP}px`,
    boxSizing: 'content-box' as const,
  },
  track: {
    flex: 1,
    position: 'relative' as const,
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  summary: {
    marginTop: spacing.md,
    padding: spacing.sm,
    textAlign: 'center' as const,
    fontSize: fonts.sizeBase,
    fontWeight: fonts.weightMedium,
    color: colors.successDark,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.sm,
  },
  dot: {
    margin: '0 10px',
    color: colors.textMuted,
  },
};

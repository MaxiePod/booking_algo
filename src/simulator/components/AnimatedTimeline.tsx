import React, { useMemo, useRef, useEffect, useState } from 'react';
import type { AssignmentResult } from '../../algorithm/types';
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
  naive: '#6B6B6B',      // medium grey — random placement
  placed: '#10b981',     // green — optimized by algorithm
  moving: '#A3A3A3',     // light grey — currently being moved/added
  ghost: 'rgba(115, 115, 115, 0.2)',  // subtle grey background for ghost
  ghostBorder: '#737373',  // grey dashed border for ghost
  newBorder: '#E5E1D8',  // cream border — newly added reservation
  split: '#8B8B8B',      // grey — split reservation connector
};

// Darker border shades for each block color
const BORDER_FOR: Record<string, string> = {
  [BLOCK_COLORS.locked]: '#D4CFC4',
  [BLOCK_COLORS.naive]: '#525252',
  [BLOCK_COLORS.placed]: '#059669',
  [BLOCK_COLORS.moving]: '#737373',
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
      // Just became paused - capture current positions
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
      // Just resumed - clear frozen positions
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

  // ── Identify the batch-move step (always index 0 if it exists) ──────
  const batchStep = useMemo(() => {
    if (anim.steps.length > 0 && anim.steps[0].type === 'batch-move') {
      return anim.steps[0] as { type: 'batch-move'; moves: MoveDetail[] };
    }
    return null;
  }, [anim.steps]);

  // ── Build block list ────────────────────────────────────────────────
  const blocks = useMemo(() => {
    const pct = (m: number) => ((m - openTime) / totalMinutes) * 100;
    const wPct = (s: number, e: number) => ((e - s) / totalMinutes) * 100;

    const batchProcessed = batchStep !== null && anim.currentStepIndex >= 0;
    const batchActive = batchProcessed && anim.currentStepIndex === 0 && anim.isTransitioning;
    const showGhosts = batchProcessed && anim.phase !== 'done';

    // Build move lookup: reservationId → MoveDetail[]
    // Note: Split reservations can have multiple moves with the same ID
    const moveMap = new Map<string, MoveDetail[]>();
    if (batchStep) {
      for (const m of batchStep.moves) {
        const existing = moveMap.get(m.reservationId) || [];
        existing.push(m);
        moveMap.set(m.reservationId, existing);
      }
    }

    // Build add lookup: reservationId → add step info[]
    // Note: Split reservations can have multiple add steps with the same ID
    const addMap = new Map<string, { stepIndex: number; court: string; start: number; end: number }[]>();
    anim.steps.forEach((s, i) => {
      if (s.type === 'add') {
        const existing = addMap.get(s.reservationId) || [];
        existing.push({ stepIndex: i, court: s.court, start: s.start, end: s.end });
        addMap.set(s.reservationId, existing);
      }
    });

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
    }[] = [];

    // Group all assignments by ID (handles split reservations with same ID)
    const naiveById = new Map<string, typeof naive.assignments>();
    for (const a of naive.assignments) {
      const existing = naiveById.get(a.id) || [];
      existing.push(a);
      naiveById.set(a.id, existing);
    }

    const smartById = new Map<string, typeof smart.assignments>();
    for (const a of smart.assignments) {
      const existing = smartById.get(a.id) || [];
      existing.push(a);
      smartById.set(a.id, existing);
    }

    // Collect every unique reservation ID
    const allIds = new Set<string>();
    naive.assignments.forEach((a) => allIds.add(a.id));
    smart.assignments.forEach((a) => allIds.add(a.id));

    // Track positions of solid blocks to avoid ghost overlaps
    const solidBlockPositions: { court: string; start: number; end: number }[] = [];

    for (const id of allIds) {
      const naiveResList = naiveById.get(id) || [];
      const smartResList = smartById.get(id) || [];
      const naiveRes = naiveResList[0]; // For mode check
      const smartRes = smartResList[0]; // For mode check

      // ── Locked ──────────────────────────────────────────────────
      if (smartRes?.mode === 'locked' || naiveRes?.mode === 'locked') {
        const res = smartRes || naiveRes;
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
          zIndex: 2,
        });
        solidBlockPositions.push({ court: res.courtId, start: res.slot.start, end: res.slot.end });
        continue;
      }

      // ── Move (part of batch) — handle all parts ─────────────────
      const moves = moveMap.get(id);
      if (moves && moves.length > 0) {
        for (let i = 0; i < moves.length; i++) {
          const move = moves[i];
          const atSmart = batchProcessed;
          const court = atSmart ? move.toCourt : move.fromCourt;
          const start = atSmart ? move.toStart : move.fromStart;
          const end = atSmart ? move.toEnd : move.fromEnd;
          const row = courtIdToRow.get(court);
          if (row === undefined) continue;

          const blockKey = moves.length > 1 ? `${id}-part${i}` : id;
          result.push({
            key: blockKey,
            courtRow: row,
            startPct: pct(start),
            widthPct: wPct(start, end),
            color: batchActive
              ? BLOCK_COLORS.moving
              : atSmart
                ? BLOCK_COLORS.placed
                : BLOCK_COLORS.naive,
            opacity: atSmart ? 1 : 0.7,
            highlight: batchActive,
            isGhost: false,
            isNew: false,
            zIndex: batchActive ? 10 : atSmart ? 3 : 1,
          });

          // Track solid position for ghost collision detection
          solidBlockPositions.push({ court, start, end });
        }
        continue;
      }

      // ── Add (individual step) — handle all parts ────────────────
      const addInfos = addMap.get(id);
      if (addInfos && addInfos.length > 0) {
        for (let i = 0; i < addInfos.length; i++) {
          const { stepIndex, court, start, end } = addInfos[i];
          const processed = stepIndex <= anim.currentStepIndex;
          const active = stepIndex === anim.currentStepIndex && anim.isTransitioning;
          const row = courtIdToRow.get(court);
          if (row === undefined) continue;

          const blockKey = addInfos.length > 1 ? `${id}-part${i}` : id;
          result.push({
            key: blockKey,
            courtRow: row,
            startPct: pct(start),
            widthPct: wPct(start, end),
            color: active
              ? BLOCK_COLORS.moving
              : processed
                ? BLOCK_COLORS.placed
                : 'transparent',
            opacity: processed ? 1 : 0,
            highlight: active,
            isGhost: false,
            isNew: processed,
            zIndex: active ? 10 : processed ? 3 : 0,
          });

          if (processed) {
            solidBlockPositions.push({ court, start, end });
          }
        }
        continue;
      }

      // ── No step — same position in both or naive-only ───────────
      // Handle all parts (for split reservations in both naive and smart at same positions)
      const resList = smartResList.length > 0 ? smartResList : naiveResList;
      const inSmart = smartResList.length > 0;

      for (let i = 0; i < resList.length; i++) {
        const res = resList[i];
        const row = courtIdToRow.get(res.courtId);
        if (row === undefined) continue;

        // For naive-only reservations (not in smart), check if a moved or added block is
        // targeting this position.
        let isBeingReplaced = false;
        let replacementProcessed = false;

        if (!inSmart && anim.phase !== 'idle') {
          // Check if a moved block is targeting this position
          const isReplacedByMove = batchStep?.moves.some(
            (m) =>
              m.toCourt === res.courtId &&
              m.toStart < res.slot.end &&
              m.toEnd > res.slot.start
          ) ?? false;

          // Check if an add block is targeting this position
          const replacingAddStep = anim.steps.find(
            (step) =>
              step.type === 'add' &&
              step.court === res.courtId &&
              step.start < res.slot.end &&
              step.end > res.slot.start
          );
          const isReplacedByAdd = !!replacingAddStep;

          isBeingReplaced = isReplacedByMove || isReplacedByAdd;

          // Check if the replacement has been processed
          if (isReplacedByMove) {
            // Move replacements are processed when batch step is done (currentStepIndex >= 0)
            replacementProcessed = anim.currentStepIndex >= 0;
          } else if (isReplacedByAdd && replacingAddStep) {
            // Add replacements are processed when their step index is reached
            const addStepIndex = anim.steps.indexOf(replacingAddStep);
            replacementProcessed = addStepIndex <= anim.currentStepIndex;
          }
        }

        const blockKey = resList.length > 1 ? `${id}-part${i}` : id;

        // If being replaced and replacement is processed, don't show at all
        if (isBeingReplaced && replacementProcessed && anim.phase === 'done') {
          continue;
        }

        // If being replaced but replacement not yet processed, show as ghost
        const showAsGhost = isBeingReplaced && !replacementProcessed;

        result.push({
          key: blockKey,
          courtRow: row,
          startPct: pct(res.slot.start),
          widthPct: wPct(res.slot.start, res.slot.end),
          color: showAsGhost ? BLOCK_COLORS.ghost : (anim.phase === 'done' && inSmart ? BLOCK_COLORS.placed : BLOCK_COLORS.naive),
          opacity: showAsGhost ? 0.5 : (anim.phase === 'done' && !inSmart ? 0.15 : anim.phase === 'done' ? 1 : 0.7),
          highlight: false,
          isGhost: showAsGhost,
          isNew: false,
          zIndex: showAsGhost ? 0 : (inSmart ? 2 : 1),
        });

        solidBlockPositions.push({ court: res.courtId, start: res.slot.start, end: res.slot.end });
      }
    }

    // Add ghosts for moves, avoiding overlap with solid blocks
    if (showGhosts && batchStep) {
      for (const move of batchStep.moves) {
        const ghostRow = courtIdToRow.get(move.fromCourt);
        if (ghostRow === undefined) continue;

        // Check if a solid block is at/near this position (skip ghost if so)
        const hasOverlap = solidBlockPositions.some(
          (pos) =>
            pos.court === move.fromCourt &&
            pos.start < move.fromEnd &&
            pos.end > move.fromStart
        );
        if (hasOverlap) continue;

        result.push({
          key: `${move.reservationId}-ghost`,
          courtRow: ghostRow,
          startPct: pct(move.fromStart),
          widthPct: wPct(move.fromStart, move.fromEnd),
          color: BLOCK_COLORS.ghost,
          opacity: 0.7,
          highlight: false,
          isGhost: true,
          isNew: false,
          zIndex: 0,
        });
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

    // For each split group, create connectors between consecutive parts
    for (const [id, parts] of splitGroups) {
      if (parts.length < 2) continue;

      // Sort by start time
      const sorted = [...parts].sort((a, b) => a.slot.start - b.slot.start);

      for (let i = 0; i < sorted.length - 1; i++) {
        const from = sorted[i];
        const to = sorted[i + 1];
        const fromRow = courtIdToRow.get(from.courtId);
        const toRow = courtIdToRow.get(to.courtId);
        if (fromRow === undefined || toRow === undefined) continue;

        // Connect from end of first block to start of second block
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
  }, [smart.assignments, courtIdToRow, openTime, totalMinutes]);

  // ── Derived counts ──────────────────────────────────────────────────
  const trackAreaHeight = courtNames.length * (ROW_HEIGHT + ROW_GAP);
  const gapReduction = Math.round(naive.totalGapMinutes - smart.totalGapMinutes);
  const moveCount = batchStep ? batchStep.moves.length : 0;
  const addCount = anim.steps.filter((s) => s.type === 'add').length;
  const naiveStranded = naive.gaps.filter((g) => g.stranded);
  const smartStranded = smart.gaps.filter((g) => g.stranded);
  const strandedCountDelta = naiveStranded.length - smartStranded.length;
  const strandedMinDelta = Math.round(
    naiveStranded.reduce((s, g) => s + g.duration, 0) -
    smartStranded.reduce((s, g) => s + g.duration, 0)
  );
  const atLastStep =
    anim.currentStepIndex >= anim.steps.length - 1 || anim.phase === 'done';

  const toPercent = (m: number) => ((m - openTime) / totalMinutes) * 100;

  // ── Subtitle text ───────────────────────────────────────────────────
  const inBatchTransition =
    batchStep && anim.currentStepIndex === 0 && anim.isTransitioning;

  const subtitleText =
    anim.phase === 'idle'
      ? 'Showing naive random placement. Press \u25B6 to watch the algorithm optimize.'
      : anim.phase === 'done'
        ? 'Optimization complete \u2014 all flexible reservations in their smart positions.'
        : inBatchTransition
          ? 'Repositioning flexible reservations to minimize gaps\u2026'
          : 'Placing additional reservations in freed slots\u2026';

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
            {anim.phase === 'done' ? '\u21BB' : '\u25B6'}
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
            {'\u23F8'}
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
            {'\u21BA'}
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
            {'\u23ED'}
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
        <LegendItem color={BLOCK_COLORS.naive} label="Naive position" opacity={0.7} />
        <LegendItem color={BLOCK_COLORS.placed} label="Optimized position" />
        <LegendItem color={BLOCK_COLORS.placed} label="Newly placed" solidBorder={BLOCK_COLORS.newBorder} />
        <LegendItem color={BLOCK_COLORS.moving} label="Currently moving" />
        <LegendItem
          color={BLOCK_COLORS.ghostBorder}
          label="Previous position"
          dashed
        />
        {splitConnectors.length > 0 && (
          <LegendItem
            color={BLOCK_COLORS.split}
            label="Split reservation"
            dashed
          />
        )}
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
                      ? `2px solid ${BLOCK_COLORS.newBorder}`
                      : `1px solid ${BORDER_FOR[bp.color] || 'transparent'}`,
                  borderRadius: '3px',
                  transition: bp.isGhost || anim.isPaused
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
                    stroke={BLOCK_COLORS.split}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    opacity={anim.phase === 'done' ? 0.8 : 0.5}
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
            <span>{moveCount} reservations repositioned</span>
          )}
          {moveCount > 0 && addCount > 0 && (
            <span style={styles.dot}>{'\u00B7'}</span>
          )}
          {addCount > 0 && (
            <span>{addCount} additional reservations placed</span>
          )}
          {(moveCount > 0 || addCount > 0) && gapReduction > 0 && (
            <>
              <span style={styles.dot}>{'\u00B7'}</span>
              <span>Gap time reduced by {gapReduction} min</span>
            </>
          )}
          {strandedCountDelta > 0 && (
            <>
              <span style={styles.dot}>{'\u00B7'}</span>
              <span>{strandedCountDelta} fewer stranded gap{strandedCountDelta !== 1 ? 's' : ''} ({strandedMinDelta} min saved)</span>
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
  solidBorder?: string;
  opacity?: number;
}> = ({ color, label, dashed, solidBorder, opacity }) => (
  <div style={styles.legendItem}>
    <div
      style={{
        width: '14px',
        height: '14px',
        borderRadius: '3px',
        backgroundColor: dashed ? 'transparent' : color,
        border: dashed
          ? `2px dashed ${color}`
          : solidBorder
            ? `2px solid ${solidBorder}`
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

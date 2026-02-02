import React, { useMemo } from 'react';
import type { AssignmentResult } from '../../algorithm/types';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';
import { formatHour } from './CourtTimeline';
import { useTimelineAnimation } from '../hooks/useTimelineAnimation';
import type { MoveDetail } from '../hooks/useTimelineAnimation';

interface AnimatedTimelineProps {
  smart: AssignmentResult;
  naive: AssignmentResult;
  courtNames: string[];
  openTime: number;
  closeTime: number;
}

const COURT_LABEL_WIDTH = 60;
const ROW_HEIGHT = 28;
const ROW_GAP = 3;
const HOUR_ROW_HEIGHT = 18;

const BLOCK_COLORS = {
  locked: '#818cf8',     // lighter indigo/purple — customer-picked
  naive: '#3b82f6',      // blue — random placement
  placed: '#22c55e',     // green — optimized by algorithm
  moving: '#fbbf24',     // amber — currently being moved/added
  ghost: 'rgba(248, 113, 113, 0.25)',
  ghostBorder: '#f87171',
  newBorder: '#ef4444',  // red border — newly added reservation
};

// Darker border shades for each block color
const BORDER_FOR: Record<string, string> = {
  [BLOCK_COLORS.locked]: '#6366f1',
  [BLOCK_COLORS.naive]: '#2563eb',
  [BLOCK_COLORS.placed]: '#16a34a',
  [BLOCK_COLORS.moving]: '#d97706',
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

    // Build move lookup: reservationId → MoveDetail
    const moveMap = new Map<string, MoveDetail>();
    if (batchStep) {
      for (const m of batchStep.moves) {
        moveMap.set(m.reservationId, m);
      }
    }

    // Build add lookup: reservationId → stepIndex
    const addMap = new Map<string, { stepIndex: number; court: string; start: number; end: number }>();
    anim.steps.forEach((s, i) => {
      if (s.type === 'add') {
        addMap.set(s.reservationId, { stepIndex: i, court: s.court, start: s.start, end: s.end });
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

    const naiveById = new Map(naive.assignments.map((a) => [a.id, a]));
    const smartById = new Map(smart.assignments.map((a) => [a.id, a]));

    // Collect every unique reservation ID
    const allIds = new Set<string>();
    naive.assignments.forEach((a) => allIds.add(a.id));
    smart.assignments.forEach((a) => allIds.add(a.id));

    for (const id of allIds) {
      const naiveRes = naiveById.get(id);
      const smartRes = smartById.get(id);

      // ── Locked ──────────────────────────────────────────────────
      if (smartRes?.mode === 'locked' || naiveRes?.mode === 'locked') {
        const res = (smartRes || naiveRes)!;
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
        continue;
      }

      // ── Move (part of batch) ────────────────────────────────────
      const move = moveMap.get(id);
      if (move) {
        const atSmart = batchProcessed;
        const court = atSmart ? move.toCourt : move.fromCourt;
        const start = atSmart ? move.toStart : move.fromStart;
        const end = atSmart ? move.toEnd : move.fromEnd;
        const row = courtIdToRow.get(court);
        if (row === undefined) continue;

        result.push({
          key: id,
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

        // Ghost at old position — persists from batch move until done
        if (showGhosts) {
          const ghostRow = courtIdToRow.get(move.fromCourt);
          if (ghostRow !== undefined) {
            result.push({
              key: `${id}-ghost`,
              courtRow: ghostRow,
              startPct: pct(move.fromStart),
              widthPct: wPct(move.fromStart, move.fromEnd),
              color: BLOCK_COLORS.ghost,
              opacity: 0.5,
              highlight: false,
              isGhost: true,
              isNew: false,
              zIndex: 1,
            });
          }
        }
        continue;
      }

      // ── Add (individual step) ───────────────────────────────────
      const addInfo = addMap.get(id);
      if (addInfo) {
        const { stepIndex, court, start, end } = addInfo;
        const processed = stepIndex <= anim.currentStepIndex;
        const active = stepIndex === anim.currentStepIndex && anim.isTransitioning;
        const row = courtIdToRow.get(court);
        if (row === undefined) continue;

        result.push({
          key: id,
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
        continue;
      }

      // ── No step — same position in both or naive-only ───────────
      const res = naiveRes || smartRes;
      if (!res) continue;
      const row = courtIdToRow.get(res.courtId);
      if (row === undefined) continue;

      const inSmart = !!smartRes;
      result.push({
        key: id,
        courtRow: row,
        startPct: pct(res.slot.start),
        widthPct: wPct(res.slot.start, res.slot.end),
        color: anim.phase === 'done' && inSmart ? BLOCK_COLORS.placed : BLOCK_COLORS.naive,
        opacity: anim.phase === 'done' && !inSmart ? 0.15 : anim.phase === 'done' ? 1 : 0.7,
        highlight: false,
        isGhost: false,
        isNew: false,
        zIndex: inSmart ? 2 : 1,
      });
    }

    return result;
  }, [
    smart, naive, anim.steps, anim.currentStepIndex,
    anim.isTransitioning, anim.phase, courtIdToRow,
    openTime, totalMinutes, batchStep,
  ]);

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
      </div>

      {/* Timeline */}
      <div style={styles.timelineWrapper}>
        {/* Hour labels */}
        <div style={styles.hourRow}>
          <div style={{ width: COURT_LABEL_WIDTH, flexShrink: 0 }} />
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
          style={{
            position: 'absolute',
            left: COURT_LABEL_WIDTH,
            top: HOUR_ROW_HEIGHT + 2,
            right: 0,
            height: trackAreaHeight,
            pointerEvents: 'none',
          }}
        >
          {blocks.map((bp) => (
            <div
              key={bp.key}
              style={{
                position: 'absolute',
                boxSizing: 'border-box',
                left: `${bp.startPct}%`,
                width: `${bp.widthPct}%`,
                top: bp.courtRow * (ROW_HEIGHT + ROW_GAP) + 2,
                height: ROW_HEIGHT - 4,
                backgroundColor: bp.color,
                border: bp.isGhost
                  ? `2px dashed ${BLOCK_COLORS.ghostBorder}`
                  : bp.isNew
                    ? `2px solid ${BLOCK_COLORS.newBorder}`
                    : `1px solid ${BORDER_FOR[bp.color] || 'transparent'}`,
                borderRadius: '3px',
                transition: bp.isGhost
                  ? 'none'
                  : `left ${transitionMs}ms ease-in-out, top ${transitionMs}ms ease-in-out, width ${transitionMs}ms ease-in-out, opacity ${transitionMs}ms ease-in-out, background-color 0.3s ease`,
                opacity: bp.opacity,
                zIndex: bp.zIndex,
                boxShadow: bp.highlight
                  ? `0 0 12px ${BLOCK_COLORS.moving}, 0 0 4px ${BLOCK_COLORS.moving}`
                  : 'none',
              }}
            />
          ))}
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
    marginBottom: '2px',
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
    paddingRight: spacing.sm,
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

import React, { useMemo } from 'react';
import type { AssignmentResult, AssignedReservation } from '../../algorithm/types';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

interface CourtTimelineProps {
  smart: AssignmentResult;
  naive: AssignmentResult;
  courtNames: string[];
  openTime: number;
  closeTime: number;
}

/**
 * Side-by-side court timeline showing Smart vs Naive assignments.
 * Highlights slots that are usable in smart but wasted as gaps in naive.
 */
export const CourtTimeline: React.FC<CourtTimelineProps> = ({
  smart,
  naive,
  courtNames,
  openTime,
  closeTime,
}) => {
  const totalMinutes = closeTime - openTime;

  // Build a set of "recovered" slots — booked in smart but gap in naive
  const recoveredSlots = useMemo(() => {
    const naiveMap = buildCourtMap(naive.assignments);
    const recovered: { courtIdx: number; start: number; end: number }[] = [];

    for (const a of smart.assignments) {
      const courtIdx = courtNames.indexOf(
        courtNames.find((_, i) => `c${i + 1}` === a.courtId) ?? ''
      );
      if (courtIdx < 0) continue;

      // Check if this slot overlaps with a gap in naive
      const naiveBookings = naiveMap.get(a.courtId) ?? [];
      const isGapInNaive = !naiveBookings.some(
        (nb) => nb.slot.start < a.slot.end && nb.slot.end > a.slot.start
      );

      if (isGapInNaive) {
        recovered.push({
          courtIdx,
          start: a.slot.start,
          end: a.slot.end,
        });
      }
    }
    return recovered;
  }, [smart, naive, courtNames]);

  const hourLabels = useMemo(() => {
    const labels: number[] = [];
    for (let m = openTime; m <= closeTime; m += 60) {
      labels.push(m);
    }
    return labels;
  }, [openTime, closeTime]);

  const toPercent = (m: number) => ((m - openTime) / totalMinutes) * 100;

  // Check if there are any split reservations
  const hasSplits = smart.assignments.some((a) => a.isSplit) || naive.assignments.some((a) => a.isSplit);

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Sample Day — Court Timeline</h4>
      <p style={styles.subtitle}>
        Showing an iteration representative of the target capacity utilization.
      </p>

      <div style={styles.legend}>
        <LegendItem color={COLORS.locked} label="Locked (customer-picked)" />
        <LegendItem color={COLORS.flexible} label="Flexible (auto-assigned)" />
        <LegendItem color={COLORS.recovered} label="Recovered (gap in Naive, booked in Smart)" />
        <LegendItem color={COLORS.gap} label="Unused gap" />
        {hasSplits && <LegendItem color={COLORS.split} label="Split reservation" dashed />}
      </div>

      <div className="podplay-timeline-row" style={styles.panelRow}>
        {/* Smart timeline */}
        <div style={styles.timelinePanel}>
          <div style={styles.panelLabel}>Smart Assignment</div>
          <TimelineGrid
            assignments={smart.assignments}
            courtNames={courtNames}
            openTime={openTime}
            closeTime={closeTime}
            totalMinutes={totalMinutes}
            hourLabels={hourLabels}
            toPercent={toPercent}
            recoveredSlots={recoveredSlots}
            showRecovered
          />
          <TimelineStat
            booked={smart.assignments.reduce((s, a) => s + (a.slot.end - a.slot.start), 0)}
            gaps={smart.totalGapMinutes}
            stranded={smart.gaps.filter((g) => g.stranded).length}
          />
        </div>

        {/* Naive timeline */}
        <div style={styles.timelinePanel}>
          <div style={styles.panelLabel}>Naive (Random) Assignment</div>
          <TimelineGrid
            assignments={naive.assignments}
            courtNames={courtNames}
            openTime={openTime}
            closeTime={closeTime}
            totalMinutes={totalMinutes}
            hourLabels={hourLabels}
            toPercent={toPercent}
            recoveredSlots={[]}
            showRecovered={false}
          />
          <TimelineStat
            booked={naive.assignments.reduce((s, a) => s + (a.slot.end - a.slot.start), 0)}
            gaps={naive.totalGapMinutes}
            stranded={naive.gaps.filter((g) => g.stranded).length}
          />
        </div>
      </div>
    </div>
  );
};

const COURT_LABEL_WIDTH = 70;
const LABEL_GAP = 12;
const ROW_HEIGHT = 26;
const ROW_GAP = 4;
const HOUR_ROW_HEIGHT = 20;

// ─── Timeline Grid Sub-component ───────────────────────────────────────

const TimelineGrid: React.FC<{
  assignments: AssignedReservation[];
  courtNames: string[];
  openTime: number;
  closeTime: number;
  totalMinutes: number;
  hourLabels: number[];
  toPercent: (m: number) => number;
  recoveredSlots: { courtIdx: number; start: number; end: number }[];
  showRecovered: boolean;
}> = ({
  assignments,
  courtNames,
  openTime,
  closeTime,
  totalMinutes,
  hourLabels,
  toPercent,
  recoveredSlots,
  showRecovered,
}) => {
  const courtMap = buildCourtMap(assignments);

  // Compute split connectors
  const splitConnectors = useMemo(() => {
    const courtIdToRow = new Map<string, number>();
    courtNames.forEach((_, i) => courtIdToRow.set(`c${i + 1}`, i));

    // Group split assignments by reservation ID
    const splitGroups = new Map<string, AssignedReservation[]>();
    for (const a of assignments) {
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
          fromX: toPercent(from.slot.end),
          toX: toPercent(to.slot.start),
        });
      }
    }

    return connectors;
  }, [assignments, courtNames, toPercent]);

  return (
    <div style={styles.grid}>
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

      {/* Court rows */}
      {courtNames.map((name, idx) => {
        const courtId = `c${idx + 1}`;
        const bookings = courtMap.get(courtId) ?? [];

        return (
          <div key={courtId} style={styles.courtRow}>
            <div style={styles.courtLabel}>{name}</div>
            <div style={styles.track}>
              {/* Hour grid lines */}
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

              {/* Booking blocks */}
              {bookings.map((b) => {
                const isRecovered =
                  showRecovered &&
                  recoveredSlots.some(
                    (r) =>
                      r.courtIdx === idx &&
                      r.start === b.slot.start &&
                      r.end === b.slot.end
                  );

                const bgColor = isRecovered
                  ? COLORS.recovered
                  : b.mode === 'locked'
                    ? COLORS.locked
                    : COLORS.flexible;

                const isSplit = b.isSplit;

                return (
                  <div
                    key={`${b.id}-${b.slot.start}`}
                    title={`${b.id}${isSplit ? ' (split)' : ''} (${b.mode}) ${formatHour(b.slot.start)}–${formatHour(b.slot.end)}`}
                    style={{
                      position: 'absolute',
                      left: `${toPercent(b.slot.start)}%`,
                      width: `${((b.slot.end - b.slot.start) / totalMinutes) * 100}%`,
                      top: '3px',
                      bottom: '3px',
                      backgroundColor: bgColor,
                      borderRadius: '3px',
                      border: isRecovered
                        ? `1px solid ${COLORS.recoveredBorder}`
                        : isSplit
                          ? `2px solid ${COLORS.split}`
                          : 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Split reservation connectors */}
      {splitConnectors.length > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: HOUR_ROW_HEIGHT + 4,
            left: COURT_LABEL_WIDTH + LABEL_GAP,
            width: `calc(100% - ${COURT_LABEL_WIDTH + LABEL_GAP}px)`,
            height: courtNames.length * (ROW_HEIGHT + ROW_GAP),
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
                stroke={COLORS.split}
                strokeWidth="2"
                strokeDasharray="4 2"
                opacity={0.8}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};

// ─── Stats line under each timeline ────────────────────────────────────

const TimelineStat: React.FC<{
  booked: number;
  gaps: number;
  stranded: number;
}> = ({ booked, gaps, stranded }) => (
  <div style={styles.statRow}>
    <span>
      Booked: <strong>{Math.round(booked)} min</strong>
    </span>
    <span>
      Gap: <strong>{Math.round(gaps)} min</strong>
    </span>
    <span>
      Stranded gaps: <strong>{stranded}</strong>
    </span>
  </div>
);

// ─── Legend ─────────────────────────────────────────────────────────────

const LegendItem: React.FC<{ color: string; label: string; dashed?: boolean }> = ({
  color,
  label,
  dashed,
}) => (
  <div style={styles.legendItem}>
    <div
      style={{
        width: '14px',
        height: '14px',
        borderRadius: '3px',
        backgroundColor: dashed ? 'transparent' : color,
        border: dashed ? `2px dashed ${color}` : 'none',
        boxSizing: 'border-box' as const,
        flexShrink: 0,
      }}
    />
    <span style={{ fontSize: '12px', color: colors.textSecondary }}>{label}</span>
  </div>
);

// ─── Helpers ───────────────────────────────────────────────────────────

export function buildCourtMap(
  assignments: AssignedReservation[]
): Map<string, AssignedReservation[]> {
  const map = new Map<string, AssignedReservation[]>();
  for (const a of assignments) {
    if (!map.has(a.courtId)) map.set(a.courtId, []);
    map.get(a.courtId)!.push(a);
  }
  // Sort each court's bookings by start time
  for (const bookings of map.values()) {
    bookings.sort((a, b) => a.slot.start - b.slot.start);
  }
  return map;
}

export function formatHour(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}`;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

// ─── Color constants ───────────────────────────────────────────────────

export const COLORS = {
  locked: '#E5E1D8',        // cream/beige — customer-picked (premium)
  flexible: '#737373',      // medium grey — auto-assigned
  recovered: '#10b981',     // green — bookable in smart, gap in naive
  recoveredBorder: '#34d399',
  gap: '#1F1F1F',           // dark surface — unused
  split: '#A3A3A3',         // light grey — split reservation connector
};

// ─── Styles ────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
  },
  title: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    marginTop: 0,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
    marginTop: 0,
    marginBottom: spacing.lg,
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
  panelRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.lg,
  },
  timelinePanel: {},
  panelLabel: {
    fontSize: fonts.sizeBase,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center' as const,
  },
  grid: {
    position: 'relative' as const,
  },
  hourRow: {
    display: 'flex',
    alignItems: 'flex-end',
    height: `${HOUR_ROW_HEIGHT}px`,
    marginBottom: '4px',
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
  trackContainer: {
    flex: 1,
    position: 'relative' as const,
    height: `${HOUR_ROW_HEIGHT}px`,
  },
  track: {
    flex: 1,
    position: 'relative' as const,
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
    fontSize: '12px',
    color: colors.textSecondary,
  },
};

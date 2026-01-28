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

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Sample Day — Court Timeline</h4>
      <p style={styles.subtitle}>
        Showing the iteration with the largest difference between Smart and Naive assignment.
      </p>

      <div style={styles.legend}>
        <LegendItem color={COLORS.locked} label="Locked (customer-picked)" />
        <LegendItem color={COLORS.flexible} label="Flexible (auto-assigned)" />
        <LegendItem color={COLORS.recovered} label="Recovered (gap in Naive, booked in Smart)" />
        <LegendItem color={COLORS.gap} label="Unused gap" />
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

                return (
                  <div
                    key={b.id}
                    title={`${b.id} (${b.mode}) ${formatHour(b.slot.start)}–${formatHour(b.slot.end)}`}
                    style={{
                      position: 'absolute',
                      left: `${toPercent(b.slot.start)}%`,
                      width: `${((b.slot.end - b.slot.start) / totalMinutes) * 100}%`,
                      top: '2px',
                      bottom: '2px',
                      backgroundColor: bgColor,
                      borderRadius: '3px',
                      border: isRecovered
                        ? `1px solid ${COLORS.recoveredBorder}`
                        : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
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

const LegendItem: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <div style={styles.legendItem}>
    <div
      style={{
        width: '14px',
        height: '14px',
        borderRadius: '3px',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
    <span style={{ fontSize: '12px', color: colors.textSecondary }}>{label}</span>
  </div>
);

// ─── Helpers ───────────────────────────────────────────────────────────

function buildCourtMap(
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

function formatHour(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}`;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

// ─── Color constants ───────────────────────────────────────────────────

const COLORS = {
  locked: '#6366f1',        // indigo — customer-picked
  flexible: colors.primary, // PodPlay blue — auto-assigned
  recovered: '#22c55e',     // green — bookable in smart, gap in naive
  recoveredBorder: '#4ade80',
  gap: '#1a1a1a',           // dark surface — unused
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
  grid: {},
  hourRow: {
    display: 'flex',
    alignItems: 'flex-end',
    height: '18px',
    marginBottom: '2px',
  },
  courtRow: {
    display: 'flex',
    alignItems: 'center',
    height: '28px',
    marginBottom: '3px',
  },
  courtLabel: {
    width: '60px',
    flexShrink: 0,
    fontSize: '11px',
    color: colors.textSecondary,
    fontWeight: fonts.weightMedium,
    textAlign: 'right' as const,
    paddingRight: spacing.sm,
  },
  trackContainer: {
    flex: 1,
    position: 'relative' as const,
    height: '18px',
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

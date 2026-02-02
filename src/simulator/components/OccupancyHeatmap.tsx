import React from 'react';
import type { AssignmentResult } from '../../algorithm/types';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';
import { InfoTooltip } from '../../shared/InfoTooltip';

interface Props {
  sampleDay: {
    smart: AssignmentResult;
    naive: AssignmentResult;
    courtNames: string[];
    openTime: number;
    closeTime: number;
  };
}

const SLOT_BLOCK = 30; // 30-min columns
const AMBER = '#f59e0b';

type CellStatus = 'empty' | 'booked' | 'locked' | 'stranded';

function buildGrid(
  result: AssignmentResult,
  courtIds: string[],
  openTime: number,
  closeTime: number,
): CellStatus[][] {
  const cols = Math.ceil((closeTime - openTime) / SLOT_BLOCK);
  const grid: CellStatus[][] = courtIds.map(() =>
    Array.from({ length: cols }, () => 'empty' as CellStatus)
  );

  // Fill booked cells
  for (const a of result.assignments) {
    const row = courtIds.indexOf(a.courtId);
    if (row < 0) continue;
    const startCol = Math.floor((a.slot.start - openTime) / SLOT_BLOCK);
    const endCol = Math.ceil((a.slot.end - openTime) / SLOT_BLOCK);
    for (let c = startCol; c < endCol && c < cols; c++) {
      grid[row][c] = a.mode === 'locked' ? 'locked' : 'booked';
    }
  }

  // Mark stranded gaps
  for (const g of result.gaps) {
    if (!g.stranded) continue;
    const row = courtIds.indexOf(g.courtId);
    if (row < 0) continue;
    const startCol = Math.floor((g.slot.start - openTime) / SLOT_BLOCK);
    const endCol = Math.ceil((g.slot.end - openTime) / SLOT_BLOCK);
    for (let c = startCol; c < endCol && c < cols; c++) {
      // Only mark as stranded if not already booked (safety check)
      if (grid[row][c] === 'empty') {
        grid[row][c] = 'stranded';
      }
    }
  }

  return grid;
}

function cellColor(status: CellStatus): string {
  switch (status) {
    case 'booked': return colors.primary;
    case 'locked': return AMBER;
    case 'stranded': return colors.danger;
    case 'empty': return colors.backgroundAlt;
  }
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'p' : 'a';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${m.toString().padStart(2, '0')}${suffix}`;
}

const HeatmapGrid: React.FC<{
  label: string;
  grid: CellStatus[][];
  courtNames: string[];
  openTime: number;
  closeTime: number;
}> = ({ label, grid, courtNames, openTime, closeTime }) => {
  const cols = grid[0]?.length ?? 0;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={heatStyles.gridLabel}>{label}</div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `48px repeat(${cols}, 1fr)`,
        gap: '1px',
      }}>
        {/* Header row: empty corner + time labels */}
        <div />
        {Array.from({ length: cols }, (_, c) => {
          const t = openTime + c * SLOT_BLOCK;
          // Show label every other slot to avoid crowding
          return (
            <div key={c} style={heatStyles.timeLabel}>
              {c % 2 === 0 ? formatTime(t) : ''}
            </div>
          );
        })}

        {/* Court rows */}
        {grid.map((row, r) => (
          <React.Fragment key={r}>
            <div style={heatStyles.courtLabel}>{courtNames[r]}</div>
            {row.map((status, c) => (
              <div key={c} style={{
                ...heatStyles.cell,
                backgroundColor: cellColor(status),
              }} />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

function countStranded(result: AssignmentResult): { count: number; minutes: number } {
  const stranded = result.gaps.filter((g) => g.stranded);
  return {
    count: stranded.length,
    minutes: stranded.reduce((s, g) => s + g.duration, 0),
  };
}

export const OccupancyHeatmap: React.FC<Props> = ({ sampleDay }) => {
  const { smart, naive, courtNames, openTime, closeTime } = sampleDay;
  const courtIds = courtNames.map((_, i) => `c${i + 1}`);

  const smartGrid = buildGrid(smart, courtIds, openTime, closeTime);
  const naiveGrid = buildGrid(naive, courtIds, openTime, closeTime);

  const smartStranded = countStranded(smart);
  const naiveStranded = countStranded(naive);
  const extraStranded = naiveStranded.count - smartStranded.count;
  const extraMinutes = naiveStranded.minutes - smartStranded.minutes;

  return (
    <div style={heatStyles.section}>
      <h3 style={heatStyles.heading}>Court Schedule — Sample Day</h3>

      {/* Legend */}
      <div style={heatStyles.legend}>
        <span style={heatStyles.legendItem}>
          <span style={{ ...heatStyles.legendSwatch, backgroundColor: colors.primary }} /> Booked
        </span>
        <span style={heatStyles.legendItem}>
          <span style={{ ...heatStyles.legendSwatch, backgroundColor: AMBER }} /> Locked
        </span>
        <span style={heatStyles.legendItem}>
          <span style={{ ...heatStyles.legendSwatch, backgroundColor: colors.danger }} /> Stranded
          <InfoTooltip text="A stranded gap is an empty slot between bookings that's too short to fit any reservation. These minutes are effectively wasted — no customer can book them." />
        </span>
        <span style={heatStyles.legendItem}>
          <span style={{ ...heatStyles.legendSwatch, backgroundColor: colors.backgroundAlt, border: `1px solid ${colors.border}` }} /> Empty
        </span>
      </div>

      <div style={heatStyles.gridRow}>
        <HeatmapGrid label="Smart" grid={smartGrid} courtNames={courtNames}
          openTime={openTime} closeTime={closeTime} />
        <HeatmapGrid label="Naive" grid={naiveGrid} courtNames={courtNames}
          openTime={openTime} closeTime={closeTime} />
      </div>

      {/* Stranded gap annotation */}
      {extraStranded > 0 && (
        <div style={heatStyles.annotation}>
          Naive has <strong>{extraStranded} more stranded gap{extraStranded !== 1 ? 's' : ''}</strong> ({Math.round(extraMinutes)} wasted min)
          vs Smart on this sample day — red cells that can never be booked.
        </div>
      )}
      {extraStranded === 0 && naiveStranded.count > 0 && (
        <div style={heatStyles.annotation}>
          Both schedules have {naiveStranded.count} stranded gap{naiveStranded.count !== 1 ? 's' : ''} ({Math.round(naiveStranded.minutes)} wasted min)
          on this sample day.
        </div>
      )}
    </div>
  );
};

const heatStyles: Record<string, React.CSSProperties> = {
  section: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
  },
  heading: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    marginTop: 0,
    marginBottom: spacing.lg,
    letterSpacing: '-0.3px',
  },
  legend: {
    display: 'flex',
    gap: spacing.md,
    marginBottom: spacing.lg,
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
  },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  },
  legendSwatch: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  gridRow: {
    display: 'flex',
    gap: spacing.lg,
  },
  gridLabel: {
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightSemibold,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    marginBottom: spacing.xs,
  },
  timeLabel: {
    fontSize: '9px',
    color: colors.textMuted,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
  },
  courtLabel: {
    fontSize: '10px',
    color: colors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    paddingRight: '4px',
    whiteSpace: 'nowrap' as const,
  },
  cell: {
    height: '18px',
    borderRadius: '2px',
    minWidth: 0,
  },
  annotation: {
    marginTop: spacing.md,
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    border: `1px solid rgba(248, 113, 113, 0.2)`,
    borderRadius: borderRadius.sm,
    lineHeight: '1.5',
  },
};

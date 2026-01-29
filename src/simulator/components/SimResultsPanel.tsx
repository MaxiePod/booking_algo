import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import type { SimulatorResults } from '../types';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';
import { InfoTooltip } from '../../shared/InfoTooltip';
import { formatCurrency, formatPercent } from '../../calculator/utils/formatting';

interface SimResultsPanelProps {
  results: SimulatorResults | null;
  running: boolean;
}

export const SimResultsPanel: React.FC<SimResultsPanelProps> = ({
  results,
  running,
}) => {
  if (!results && !running) {
    return (
      <div style={styles.panel}>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>&#9654;</div>
          <div style={styles.emptyText}>
            Configure your scenario and hit <strong>Run Simulation</strong> to
            see how the algorithm performs.
          </div>
        </div>
      </div>
    );
  }

  if (running) {
    return (
      <div style={styles.panel}>
        <div style={styles.empty}>
          <div style={styles.spinner} />
          <div style={styles.emptyText}>Running simulation...</div>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const {
    smart,
    naive,
    deltaUtil,
    gapSaved,
    fragReduction,
    revenueSmartPerDay,
    revenueNaivePerDay,
    savingsPerDay,
    savingsPercent,
    lockPremiumPerDay,
  } = results;

  const totalAdditionalPerDay = savingsPerDay + lockPremiumPerDay;

  const utilData = [
    { name: 'Utilization', Smart: +(smart.avgUtil * 100).toFixed(1), Naive: +(naive.avgUtil * 100).toFixed(1) },
    { name: 'Fragmentation', Smart: +(smart.avgFragmentation * 100).toFixed(1), Naive: +(naive.avgFragmentation * 100).toFixed(1) },
  ];

  const gapData = [
    { name: 'Gap Minutes', Smart: Math.round(smart.avgGapMinutes), Naive: Math.round(naive.avgGapMinutes) },
  ];

  return (
    <div style={styles.panel}>
      <h3 style={styles.heading}>Results</h3>

      {/* Savings section */}
      <div style={savingsStyles.card}>
        <div style={savingsStyles.label}>TOTAL ADDITIONAL REVENUE PER DAY</div>
        <div style={savingsStyles.amount}>{formatCurrency(totalAdditionalPerDay)}</div>

        <div style={savingsStyles.breakdownRow}>
          <span style={savingsStyles.breakdownLabel}>Algorithm optimization</span>
          <span style={savingsStyles.breakdownValue}>+{formatCurrency(savingsPerDay)}</span>
        </div>
        <div style={savingsStyles.breakdownRow}>
          <span style={savingsStyles.breakdownLabel}>Court lock premium</span>
          <span style={savingsStyles.breakdownValue}>+{formatCurrency(lockPremiumPerDay)}</span>
        </div>

        <div style={savingsStyles.revenueRow}>
          <div style={savingsStyles.revenueBox}>
            <div style={savingsStyles.revenueBoxLabel}>Naive Revenue</div>
            <div style={savingsStyles.revenueBoxValue}>{formatCurrency(revenueNaivePerDay)}</div>
          </div>
          <div style={savingsStyles.revenueBox}>
            <div style={savingsStyles.revenueBoxLabel}>Smart Revenue</div>
            <div style={{ ...savingsStyles.revenueBoxValue, color: colors.successDark }}>
              {formatCurrency(revenueSmartPerDay)}
            </div>
          </div>
        </div>

        <div style={savingsStyles.projections}>
          <div style={savingsStyles.projectionRow}>
            <span style={savingsStyles.projectionLabel}>Monthly (×30)</span>
            <span style={savingsStyles.projectionValue}>{formatCurrency(totalAdditionalPerDay * 30)}</span>
          </div>
          <div style={savingsStyles.projectionRow}>
            <span style={savingsStyles.projectionLabel}>Annual (×365)</span>
            <span style={savingsStyles.projectionValue}>{formatCurrency(totalAdditionalPerDay * 365)}</span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={styles.cardRow}>
        <MetricCard
          label="Utilization Gain"
          value={`+${(deltaUtil * 100).toFixed(1)}%`}
          positive={deltaUtil > 0}
          tooltip="Difference in court utilization between smart and naive assignment. Higher means the smart algorithm fills more available court time."
        />
        <MetricCard
          label="Gap Time Saved"
          value={`${Math.round(gapSaved)} min`}
          positive={gapSaved > 0}
          tooltip="Total unused minutes between bookings that the smart algorithm eliminates compared to naive placement. Less gap time means tighter scheduling."
        />
        <MetricCard
          label="Fragmentation"
          value={`−${(fragReduction * 100).toFixed(1)}%`}
          positive={fragReduction > 0}
          tooltip="Reduction in schedule fragmentation. Fragmentation measures how scattered bookings are across courts. Lower fragmentation means more consolidated schedules."
        />
      </div>

      {/* Stat table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Metric</th>
              <th style={{ ...styles.th, color: colors.primary }}>Smart</th>
              <th style={{ ...styles.th, color: colors.textMuted }}>Naive</th>
              <th style={styles.th}>Delta</th>
            </tr>
          </thead>
          <tbody>
            <StatRow
              label="Avg Utilization"
              smart={`${(smart.avgUtil * 100).toFixed(1)}%`}
              naive={`${(naive.avgUtil * 100).toFixed(1)}%`}
              delta={`+${(deltaUtil * 100).toFixed(1)}%`}
              good={deltaUtil > 0}
              tooltip="Percentage of total available court-minutes that are filled with bookings. Higher is better."
            />
            <StatRow
              label="Avg Gap Minutes"
              smart={`${Math.round(smart.avgGapMinutes)}`}
              naive={`${Math.round(naive.avgGapMinutes)}`}
              delta={`−${Math.round(gapSaved)}`}
              good={gapSaved > 0}
              tooltip="Total minutes of empty gaps between bookings across all courts per day. Lower means a tighter, more efficient schedule."
            />
            <StatRow
              label="Avg Fragmentation"
              smart={`${(smart.avgFragmentation * 100).toFixed(1)}%`}
              naive={`${(naive.avgFragmentation * 100).toFixed(1)}%`}
              delta={`−${(fragReduction * 100).toFixed(1)}%`}
              good={fragReduction > 0}
              tooltip="Score measuring how scattered bookings are across courts. Lower fragmentation means bookings are consolidated, leaving full courts open."
            />
            <StatRow
              label="Avg Unassigned"
              smart={smart.avgUnassigned.toFixed(1)}
              naive={naive.avgUnassigned.toFixed(1)}
              delta={`${(naive.avgUnassigned - smart.avgUnassigned).toFixed(1)}`}
              good={naive.avgUnassigned >= smart.avgUnassigned}
              tooltip="Average number of reservations that could not be placed on any court due to conflicts. Lower is better."
            />
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div style={styles.chartSection}>
        <div style={styles.chartTitle}>Utilization & Fragmentation (%)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={utilData}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.borderLight} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: colors.textSecondary }}
              axisLine={{ stroke: colors.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: colors.textMuted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(v: number) => `${v}%`}
              contentStyle={{
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: colors.surface,
                color: colors.text,
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: colors.textSecondary }} />
            <Bar dataKey="Smart" fill={colors.primary} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Naive" fill={colors.textMuted} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.chartSection}>
        <div style={styles.chartTitle}>Total Gap Minutes (avg per day)</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={gapData}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            barCategoryGap="40%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.borderLight} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: colors.textMuted }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: colors.textSecondary }}
              axisLine={{ stroke: colors.border }}
              tickLine={false}
              width={90}
            />
            <Tooltip
              formatter={(v: number) => `${v} min`}
              contentStyle={{
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: colors.surface,
                color: colors.text,
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: colors.textSecondary }} />
            <Bar dataKey="Smart" fill={colors.primary} radius={[0, 3, 3, 0]} />
            <Bar dataKey="Naive" fill={colors.textMuted} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────

const MetricCard: React.FC<{
  label: string;
  value: string;
  positive: boolean;
  tooltip: string;
}> = ({ label, value, positive, tooltip }) => (
  <div
    style={{
      ...styles.metricCard,
      backgroundColor: positive ? colors.successLight : colors.backgroundAlt,
    }}
  >
    <div style={styles.metricLabel}>
      {label}
      <InfoTooltip text={tooltip} />
    </div>
    <div
      style={{
        ...styles.metricValue,
        color: positive ? colors.successDark : colors.textSecondary,
      }}
    >
      {value}
    </div>
  </div>
);

const StatRow: React.FC<{
  label: string;
  smart: string;
  naive: string;
  delta: string;
  good: boolean;
  tooltip: string;
}> = ({ label, smart, naive, delta, good, tooltip }) => (
  <tr>
    <td style={styles.td}>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {label}
        <InfoTooltip text={tooltip} />
      </span>
    </td>
    <td style={{ ...styles.td, fontWeight: '600', color: colors.primary }}>
      {smart}
    </td>
    <td style={{ ...styles.td, color: colors.textMuted }}>{naive}</td>
    <td
      style={{
        ...styles.td,
        fontWeight: '600',
        color: good ? colors.successDark : colors.textMuted,
      }}
    >
      {delta}
    </td>
  </tr>
);

// ─── Styles ────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
    minHeight: '400px',
  },
  heading: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    marginTop: 0,
    marginBottom: spacing.lg,
    letterSpacing: '-0.3px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '350px',
    textAlign: 'center' as const,
    gap: spacing.md,
  },
  emptyIcon: {
    fontSize: '32px',
    color: colors.textMuted,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: fonts.sizeBase,
    color: colors.textSecondary,
    maxWidth: '260px',
    lineHeight: 1.6,
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: `3px solid ${colors.borderLight}`,
    borderTopColor: colors.primary,
    borderRadius: '50%',
    animation: 'podplay-spin 0.8s linear infinite',
  },
  cardRow: {
    display: 'flex',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    textAlign: 'center' as const,
    border: `1px solid ${colors.border}`,
  },
  metricLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: fonts.weightSemibold,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  metricValue: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightBold,
  },
  tableWrap: {
    overflowX: 'auto' as const,
    marginBottom: spacing.lg,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: fonts.sizeSmall,
  },
  th: {
    textAlign: 'left' as const,
    padding: `${spacing.sm} ${spacing.sm}`,
    borderBottom: `2px solid ${colors.border}`,
    fontWeight: fonts.weightSemibold,
    color: colors.textSecondary,
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
  },
  td: {
    padding: `${spacing.sm} ${spacing.sm}`,
    borderBottom: `1px solid ${colors.borderLight}`,
    fontSize: '13px',
    color: colors.textSecondary,
  },
  chartSection: {
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
    fontWeight: fonts.weightMedium,
    marginBottom: spacing.sm,
  },
};

const savingsStyles: Record<string, React.CSSProperties> = {
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.success}`,
    backgroundColor: colors.successLight,
    marginBottom: spacing.lg,
    textAlign: 'center' as const,
  },
  label: {
    fontSize: '11px',
    fontWeight: fonts.weightSemibold,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: fonts.sizeXl,
    fontWeight: fonts.weightBold,
    color: colors.successDark,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
  },
  breakdownLabel: {
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightSemibold,
    color: colors.successDark,
  },
  revenueRow: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  revenueBox: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
  },
  revenueBoxLabel: {
    fontSize: '11px',
    fontWeight: fonts.weightMedium,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    marginBottom: '4px',
  },
  revenueBoxValue: {
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightBold,
    color: colors.text,
  },
  projections: {
    borderTop: `1px solid ${colors.border}`,
    paddingTop: spacing.sm,
  },
  projectionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: `4px 0`,
  },
  projectionLabel: {
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
  },
  projectionValue: {
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightSemibold,
    color: colors.successDark,
  },
};

// Inject spinner animation
if (typeof document !== 'undefined') {
  const id = 'podplay-sim-styles';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes podplay-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}

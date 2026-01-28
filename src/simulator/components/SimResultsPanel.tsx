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

  const { smart, naive, deltaUtil, gapSaved, fragReduction } = results;

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

      {/* Summary cards */}
      <div style={styles.cardRow}>
        <MetricCard
          label="Utilization Gain"
          value={`+${(deltaUtil * 100).toFixed(1)}%`}
          positive={deltaUtil > 0}
        />
        <MetricCard
          label="Gap Time Saved"
          value={`${Math.round(gapSaved)} min`}
          positive={gapSaved > 0}
        />
        <MetricCard
          label="Fragmentation"
          value={`−${(fragReduction * 100).toFixed(1)}%`}
          positive={fragReduction > 0}
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
            />
            <StatRow
              label="Avg Gap Minutes"
              smart={`${Math.round(smart.avgGapMinutes)}`}
              naive={`${Math.round(naive.avgGapMinutes)}`}
              delta={`−${Math.round(gapSaved)}`}
              good={gapSaved > 0}
            />
            <StatRow
              label="Avg Fragmentation"
              smart={`${(smart.avgFragmentation * 100).toFixed(1)}%`}
              naive={`${(naive.avgFragmentation * 100).toFixed(1)}%`}
              delta={`−${(fragReduction * 100).toFixed(1)}%`}
              good={fragReduction > 0}
            />
            <StatRow
              label="Avg Unassigned"
              smart={smart.avgUnassigned.toFixed(1)}
              naive={naive.avgUnassigned.toFixed(1)}
              delta={`${(naive.avgUnassigned - smart.avgUnassigned).toFixed(1)}`}
              good={naive.avgUnassigned >= smart.avgUnassigned}
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
}> = ({ label, value, positive }) => (
  <div
    style={{
      ...styles.metricCard,
      backgroundColor: positive ? colors.successLight : colors.backgroundAlt,
    }}
  >
    <div style={styles.metricLabel}>{label}</div>
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
}> = ({ label, smart, naive, delta, good }) => (
  <tr>
    <td style={styles.td}>{label}</td>
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

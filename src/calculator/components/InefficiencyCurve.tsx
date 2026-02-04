import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

interface InefficiencyCurveProps {
  baseUtilization: number;
  lockedPercent: number;
}

/**
 * Calculates the naive algorithm's relative loss at a given locked fraction.
 * Based on simulator calibration: loss = k × locked × targetUtil
 * where k ≈ 0.55 (from simulator: 56% util, 11% locked → 3.4% relative loss)
 */
function naiveUtilizationLoss(targetUtil: number, lockedFraction: number): number {
  const k = 0.55;
  return k * lockedFraction * targetUtil;
}

export const InefficiencyCurve: React.FC<InefficiencyCurveProps> = ({
  baseUtilization,
  lockedPercent,
}) => {
  const data = useMemo(() => {
    const points = [];
    for (let L = 0; L <= 100; L += 5) {
      const loss = naiveUtilizationLoss(baseUtilization, L / 100);
      // Gap in percentage points
      const gapPp = baseUtilization * loss * 100;
      points.push({
        locked: L,
        gap: Math.round(gapPp * 10) / 10,
      });
    }
    return points;
  }, [baseUtilization]);

  const currentLoss = naiveUtilizationLoss(baseUtilization, lockedPercent / 100);
  const currentGap = Math.round(baseUtilization * currentLoss * 1000) / 10;

  return (
    <div style={styles.container}>
      <div style={styles.title}>Algorithm Advantage (pp) vs Locked %</div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.success} stopOpacity={0.4} />
              <stop offset="100%" stopColor={colors.success} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.borderLight} />
          <XAxis
            dataKey="locked"
            tick={{ fontSize: 10, fill: colors.textMuted }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
            label={{
              value: 'Locked %',
              position: 'insideBottom',
              offset: -2,
              fontSize: 10,
              fill: colors.textMuted,
            }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: colors.textMuted }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
            tickFormatter={(v: number) => `${v}pp`}
          />
          <Tooltip
            formatter={(value: number) => [`+${value.toFixed(1)}pp`, 'Smart advantage']}
            labelFormatter={(l: number) => `${l}% locked`}
            contentStyle={{
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              fontSize: '11px',
              padding: '4px 8px',
              backgroundColor: colors.surface,
              color: colors.text,
            }}
          />
          <Area
            type="monotone"
            dataKey="gap"
            stroke={colors.success}
            strokeWidth={2}
            fill="url(#gapGradient)"
          />
          <ReferenceLine
            x={lockedPercent}
            stroke={colors.accent}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div style={styles.currentValue}>
        At {lockedPercent}% locked: <span style={styles.highlight}>+{currentGap.toFixed(1)}pp</span> advantage
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
  },
  title: {
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
    fontWeight: fonts.weightMedium,
    marginBottom: spacing.sm,
  },
  currentValue: {
    fontSize: fonts.sizeXs,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginTop: spacing.sm,
  },
  highlight: {
    color: colors.success,
    fontWeight: fonts.weightSemibold,
  },
};

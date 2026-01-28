import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { powerLawEfficiency } from '../../algorithm/inefficiency-model';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

interface InefficiencyCurveProps {
  baseUtilization: number;
  lockedPercent: number;
}

export const InefficiencyCurve: React.FC<InefficiencyCurveProps> = ({
  baseUtilization,
  lockedPercent,
}) => {
  const data = useMemo(() => {
    const points = [];
    for (let L = 0; L <= 100; L += 5) {
      const eff = powerLawEfficiency({
        baseUtilization,
        lockedFraction: L / 100,
      });
      points.push({
        locked: L,
        utilization: Math.round(eff * 1000) / 10,
      });
    }
    return points;
  }, [baseUtilization]);

  const currentEff = powerLawEfficiency({
    baseUtilization,
    lockedFraction: lockedPercent / 100,
  });

  return (
    <div style={styles.container}>
      <div style={styles.title}>Effective utilization vs. locked %</div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
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
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`, 'Utilization']}
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
          <Line
            type="monotone"
            dataKey="utilization"
            stroke={colors.primary}
            strokeWidth={2}
            dot={false}
          />
          <ReferenceDot
            x={lockedPercent}
            y={Math.round(currentEff * 1000) / 10}
            r={5}
            fill={colors.primary}
            stroke={colors.background}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
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
};

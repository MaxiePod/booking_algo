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
} from 'recharts';
import { colors, fonts, spacing } from '../../shared/design-tokens';
import { formatCurrency } from '../utils/formatting';

interface ComparisonChartProps {
  revenuePodPlay: number;
  revenueTraditional: number;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  revenuePodPlay,
  revenueTraditional,
}) => {
  const data = [
    { name: 'Traditional', revenue: revenueTraditional },
    { name: 'With PodPlay', revenue: revenuePodPlay },
  ];

  const barColors = [colors.textMuted, colors.success];

  return (
    <div style={styles.container}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
          barCategoryGap="40%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.borderLight} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 13, fill: colors.textSecondary }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: colors.textMuted }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCurrency(v)}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Revenue']}
            contentStyle={{
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: colors.surface,
              color: colors.text,
            }}
          />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={barColors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: spacing.md,
  },
};

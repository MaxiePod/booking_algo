import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { GapBreakdown } from '../types';
import { colors, fonts, spacing } from '../../shared/design-tokens';

interface Props {
  smartGaps: GapBreakdown;
  naiveGaps: GapBreakdown;
}

export const GapBreakdownChart: React.FC<Props> = ({ smartGaps, naiveGaps }) => {
  const data = [
    {
      name: 'Smart',
      Booked: Math.round(smartGaps.bookedMinutes),
      'Usable Gaps': Math.round(smartGaps.usableGapMinutes),
      'Stranded Gaps': Math.round(smartGaps.strandedGapMinutes),
    },
    {
      name: 'Naive',
      Booked: Math.round(naiveGaps.bookedMinutes),
      'Usable Gaps': Math.round(naiveGaps.usableGapMinutes),
      'Stranded Gaps': Math.round(naiveGaps.strandedGapMinutes),
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
        barCategoryGap="30%"
      >
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: colors.textMuted }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v} min`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: colors.textSecondary }}
          axisLine={{ stroke: colors.border }}
          tickLine={false}
          width={50}
        />
        <Tooltip
          formatter={(v: number, name: string) => [`${v} min`, name]}
          contentStyle={{
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: colors.surface,
            color: colors.text,
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px', color: colors.textSecondary }} />
        <Bar dataKey="Booked" stackId="a" fill={colors.primary} radius={[0, 0, 0, 0]} />
        <Bar dataKey="Usable Gaps" stackId="a" fill={colors.textSecondary} radius={[0, 0, 0, 0]} />
        <Bar dataKey="Stranded Gaps" stackId="a" fill={colors.danger} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

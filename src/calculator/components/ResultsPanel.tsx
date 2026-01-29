import React from 'react';
import { ComparisonChart } from './ComparisonChart';
import { TimePeriodToggle } from './TimePeriodToggle';
import type { TimePeriod } from '../../algorithm/inefficiency-model';
import type { CalculatorResults } from '../../shared/types';
import { formatCurrency, formatPercent } from '../utils/formatting';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

interface ResultsPanelProps {
  results: CalculatorResults;
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  period,
  onPeriodChange,
}) => {
  const periodLabel =
    period === 'daily' ? 'day' : period === 'monthly' ? 'month' : 'year';
  const totalAdditional = results.savings + results.lockPremiumRevenue;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.heading}>Revenue Comparison</h3>
        <TimePeriodToggle value={period} onChange={onPeriodChange} />
      </div>

      {/* Savings callout */}
      <div style={styles.savingsCard}>
        <div style={styles.savingsLabel}>Total additional revenue per {periodLabel}</div>
        <div style={styles.savingsAmount}>
          {formatCurrency(totalAdditional)}
        </div>
        <div style={styles.breakdownRow}>
          <span style={styles.breakdownLabel}>Algorithm optimization</span>
          <span style={styles.breakdownValue}>+{formatCurrency(results.savings)}</span>
        </div>
        <div style={styles.breakdownRow}>
          <span style={styles.breakdownLabel}>Court lock premium</span>
          <span style={styles.breakdownValue}>+{formatCurrency(results.lockPremiumRevenue)}</span>
        </div>
      </div>

      {/* Utilization comparison */}
      <div style={styles.utilRow}>
        <div style={styles.utilItem}>
          <div style={styles.utilLabel}>Current Utilization</div>
          <div style={styles.utilValue}>
            {formatPercent(results.effectiveUtilTraditional * 100, 0)}
          </div>
        </div>
        <div style={styles.utilArrow}>&#8594;</div>
        <div style={styles.utilItem}>
          <div style={{ ...styles.utilLabel, color: colors.primary }}>
            With PodPlay
          </div>
          <div style={{ ...styles.utilValue, color: colors.primary }}>
            {formatPercent(results.effectiveUtilPodPlay * 100, 0)}
          </div>
        </div>
      </div>

      {/* Revenue boxes */}
      <div style={styles.revenueRow}>
        <div style={styles.revenueItem}>
          <div style={styles.revenueLabel}>Traditional</div>
          <div style={styles.revenueValue}>
            {formatCurrency(results.revenueTraditional)}
          </div>
        </div>
        <div style={styles.revenueItem}>
          <div style={styles.revenueLabel}>With PodPlay</div>
          <div style={{ ...styles.revenueValue, color: colors.primary }}>
            {formatCurrency(results.revenuePodPlay)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ComparisonChart
        revenuePodPlay={results.revenuePodPlay}
        revenueTraditional={results.revenueTraditional}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  heading: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    margin: 0,
    letterSpacing: '-0.3px',
  },
  savingsCard: {
    backgroundColor: colors.successLight,
    border: `1px solid rgba(34, 197, 94, 0.15)`,
    borderRadius: borderRadius.md,
    padding: `${spacing.lg} ${spacing.xl}`,
    textAlign: 'center' as const,
    marginBottom: spacing.md,
  },
  savingsLabel: {
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightSemibold,
    color: colors.successDark,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: spacing.sm,
  },
  savingsAmount: {
    fontSize: fonts.sizeXxl,
    fontWeight: fonts.weightBold,
    color: colors.successDark,
    lineHeight: 1.2,
  },
  savingsPercent: {
    fontSize: fonts.sizeBase,
    color: colors.success,
    fontWeight: fonts.weightMedium,
    marginTop: spacing.xs,
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    marginTop: '2px',
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
  utilRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: `${spacing.md} ${spacing.lg}`,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
  },
  utilItem: {
    flex: 1,
    textAlign: 'center' as const,
  },
  utilArrow: {
    fontSize: '20px',
    color: colors.textMuted,
    flexShrink: 0,
  },
  utilLabel: {
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
    marginBottom: '4px',
    fontWeight: fonts.weightMedium,
  },
  utilValue: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightBold,
    color: colors.text,
  },
  revenueRow: {
    display: 'flex',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  revenueItem: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
    textAlign: 'center' as const,
    border: `1px solid ${colors.border}`,
  },
  revenueLabel: {
    fontSize: fonts.sizeSmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: fonts.weightMedium,
  },
  revenueValue: {
    fontSize: fonts.sizeXl,
    fontWeight: fonts.weightBold,
    color: colors.text,
  },
};

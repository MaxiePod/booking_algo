import React from 'react';
import { ComparisonChart } from './ComparisonChart';
import { TimePeriodToggle } from './TimePeriodToggle';
import type { TimePeriod } from '../../algorithm/inefficiency-model';
import type { CalculatorResults } from '../../shared/types';
import { formatCurrency, formatPercent } from '../utils/formatting';
import { colors, fonts, spacing, borderRadius, shadows, transitions } from '../../shared/design-tokens';

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
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrapper}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 17V7l4-4h6l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1z"
                stroke={colors.successDark}
                strokeWidth="2"
              />
              <path d="M7 13l2 2 4-4" stroke={colors.successDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 style={styles.heading}>Revenue Comparison</h3>
        </div>
        <TimePeriodToggle value={period} onChange={onPeriodChange} />
      </div>

      {/* Main savings callout */}
      <div style={styles.savingsCard}>
        <div style={styles.savingsGlow} />
        <div style={styles.savingsContent}>
          <div style={styles.savingsLabel}>Total Additional Revenue</div>
          <div style={styles.savingsAmount}>
            {formatCurrency(totalAdditional)}
            <span style={styles.savingsPeriod}>/{periodLabel}</span>
          </div>
          <div style={styles.breakdownGrid}>
            <div style={styles.breakdownItem}>
              <span style={styles.breakdownLabel}>Smart vs Naive algorithm</span>
              <span style={styles.breakdownValue}>+{formatCurrency(results.savings)}</span>
            </div>
            <div style={styles.breakdownItem}>
              <span style={styles.breakdownLabel}>Court lock premium</span>
              <span style={styles.breakdownValue}>+{formatCurrency(results.lockPremiumRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Utilization comparison */}
      <div style={styles.utilCard}>
        <div style={styles.utilItem}>
          <div style={styles.utilLabel}>Naive</div>
          <div style={styles.utilValue}>
            {formatPercent(results.effectiveUtilNaive * 100, 1)}
          </div>
        </div>
        <div style={styles.utilArrow}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14m0 0l-4-4m4 4l-4 4"
              stroke={colors.accent}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={styles.utilItem}>
          <div style={{ ...styles.utilLabel, color: colors.accent }}>
            Smart
          </div>
          <div style={{ ...styles.utilValue, color: colors.accent }}>
            {formatPercent(results.effectiveUtilSmart * 100, 1)}
          </div>
        </div>
      </div>

      {/* Revenue comparison boxes */}
      <div style={styles.revenueRow}>
        <div style={styles.revenueBox}>
          <div style={styles.revenueLabel}>Naive Algorithm</div>
          <div style={styles.revenueValue}>
            {formatCurrency(results.revenueNaive)}
          </div>
          <div style={styles.revenuePeriod}>/{periodLabel}</div>
        </div>
        <div style={{ ...styles.revenueBox, ...styles.revenueBoxHighlight }}>
          <div style={{ ...styles.revenueLabel, color: colors.accent }}>Smart Algorithm</div>
          <div style={{ ...styles.revenueValue, color: colors.accent }}>
            {formatCurrency(results.revenueSmart)}
          </div>
          <div style={{ ...styles.revenuePeriod, color: colors.accentDark }}>/{periodLabel}</div>
        </div>
      </div>

      {/* Chart */}
      <div style={styles.chartWrapper}>
        <ComparisonChart
          revenueSmart={results.revenueSmart}
          revenueNaive={results.revenueNaive}
        />
      </div>
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
    boxShadow: shadows.md,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottom: `1px solid ${colors.borderLight}`,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: borderRadius.md,
    backgroundColor: colors.successLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    margin: 0,
    letterSpacing: fonts.trackingTight,
  },
  savingsCard: {
    position: 'relative' as const,
    backgroundColor: colors.successLight,
    border: `1px solid ${colors.success}30`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  savingsGlow: {
    position: 'absolute' as const,
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: `radial-gradient(circle at 50% 50%, ${colors.successGlow}, transparent 60%)`,
    pointerEvents: 'none' as const,
    opacity: 0.5,
  },
  savingsContent: {
    position: 'relative' as const,
    textAlign: 'center' as const,
  },
  savingsLabel: {
    fontSize: fonts.sizeXs,
    fontWeight: fonts.weightSemibold,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: fonts.trackingWidest,
    marginBottom: spacing.sm,
  },
  savingsAmount: {
    fontSize: fonts.size3xl,
    fontWeight: fonts.weightLight,
    color: colors.successDark,
    lineHeight: fonts.lineHeightTight,
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  savingsPeriod: {
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightMedium,
    color: colors.success,
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTop: `1px solid ${colors.success}20`,
  },
  breakdownItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: spacing.xs,
  },
  breakdownLabel: {
    fontSize: fonts.sizeXs,
    color: colors.textMuted,
    fontWeight: fonts.weightMedium,
  },
  breakdownValue: {
    fontSize: fonts.sizeBase,
    fontWeight: fonts.weightSemibold,
    color: colors.successDark,
  },
  utilCard: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
    marginBottom: spacing.md,
  },
  utilItem: {
    flex: 1,
    textAlign: 'center' as const,
  },
  utilArrow: {
    flexShrink: 0,
    opacity: 0.8,
  },
  utilLabel: {
    fontSize: fonts.sizeXs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: fonts.weightMedium,
    textTransform: 'uppercase' as const,
    letterSpacing: fonts.trackingWide,
  },
  utilValue: {
    fontSize: fonts.sizeXl,
    fontWeight: fonts.weightLight,
    color: colors.text,
  },
  revenueRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  revenueBox: {
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
    textAlign: 'center' as const,
    border: `1px solid ${colors.border}`,
    transition: `all ${transitions.fast}`,
  },
  revenueBoxHighlight: {
    backgroundColor: colors.accentLight,
    borderColor: `${colors.accent}30`,
  },
  revenueLabel: {
    fontSize: fonts.sizeXs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: fonts.weightMedium,
    textTransform: 'uppercase' as const,
    letterSpacing: fonts.trackingWide,
  },
  revenueValue: {
    fontSize: fonts.sizeXl,
    fontWeight: fonts.weightLight,
    color: colors.text,
  },
  revenuePeriod: {
    fontSize: fonts.sizeXs,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
  },
  chartWrapper: {
    marginTop: spacing.sm,
  },
};

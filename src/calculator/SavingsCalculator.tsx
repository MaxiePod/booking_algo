import React from 'react';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { useCalculator } from './hooks/useCalculator';
import { colors, fonts, spacing, borderRadius, shadows } from '../shared/design-tokens';
import type { CalculatorInputs } from '../shared/types';

interface SavingsCalculatorProps {
  initialInputs?: Partial<CalculatorInputs>;
}

export const SavingsCalculator: React.FC<SavingsCalculatorProps> = ({
  initialInputs,
}) => {
  const {
    inputs,
    results,
    setNumCourts,
    setTargetUtilizationPercent,
    setPricePerHour,
    setLockedPercent,
    setPeriod,
    setInputs,
    resetInputs,
  } = useCalculator(initialInputs);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.badge}>Revenue Estimator</div>
        <h2 style={styles.title}>
          Calculate Your <span style={styles.highlight}>Potential Savings</span>
          <sup style={styles.betaBadge}>BETA</sup>
        </h2>
        <p style={styles.subtitle}>
          See how much additional revenue you could earn with automatic court
          assignment vs. letting customers pick their own court.
        </p>
      </div>

      <div className="podplay-calc-grid" style={styles.grid}>
        <InputPanel
          inputs={inputs}
          onNumCourtsChange={setNumCourts}
          onUtilizationChange={setTargetUtilizationPercent}
          onPriceChange={setPricePerHour}
          onLockedChange={setLockedPercent}
          onLockPremiumChange={(v) => setInputs({ lockPremiumPerHour: v })}
          onReset={resetInputs}
        />
        <ResultsPanel
          results={results}
          period={inputs.period}
          onPeriodChange={setPeriod}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    fontFamily: fonts.family,
    maxWidth: '1100px',
    margin: '0 auto',
    padding: `${spacing.xl} ${spacing.lg}`,
    color: colors.text,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: spacing['2xl'],
  },
  badge: {
    display: 'inline-block',
    fontSize: fonts.sizeXs,
    fontWeight: fonts.weightSemibold,
    color: colors.accent,
    backgroundColor: colors.accentLight,
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
    letterSpacing: fonts.trackingWide,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: fonts.size3xl,
    fontWeight: fonts.weightLight,
    color: colors.text,
    marginTop: 0,
    marginBottom: spacing.md,
    letterSpacing: '-0.01em',
    lineHeight: fonts.lineHeightTight,
  },
  highlight: {
    color: colors.accent,
    position: 'relative' as const,
  },
  betaBadge: {
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightSemibold,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    verticalAlign: 'super',
    letterSpacing: fonts.trackingWide,
  },
  subtitle: {
    fontSize: fonts.sizeMd,
    color: colors.textSecondary,
    margin: 0,
    maxWidth: '580px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: fonts.lineHeightRelaxed,
    fontWeight: fonts.weightLight,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.xl,
    alignItems: 'stretch',
  },
};

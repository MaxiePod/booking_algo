import React from 'react';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { useCalculator } from './hooks/useCalculator';
import { colors, fonts, spacing } from '../shared/design-tokens';
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
    setCurrentUtilizationPercent,
    setPricePerHour,
    setLockedPercent,
    setPeriod,
    setInputs,
    resetInputs,
  } = useCalculator(initialInputs);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>Interactive Estimated Revenue Calculator</h2>
        <p style={styles.subtitle}>
          See how much additional revenue you could earn with automatic court
          assignment vs. letting customers pick their own court.
        </p>
      </div>
      <div className="podplay-calc-grid" style={styles.grid}>
        <InputPanel
          inputs={inputs}
          onNumCourtsChange={setNumCourts}
          onUtilizationChange={setCurrentUtilizationPercent}
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
    maxWidth: '1000px',
    margin: '0 auto',
    padding: `${spacing.xl} ${spacing.lg}`,
    color: colors.text,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fonts.sizeXxl,
    fontWeight: fonts.weightBold,
    color: colors.text,
    marginTop: 0,
    marginBottom: spacing.md,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: fonts.sizeMd,
    color: colors.textSecondary,
    margin: 0,
    maxWidth: '640px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: 1.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.xl,
    alignItems: 'stretch',
  },
};

// Add responsive styles via a <style> tag for the grid
const RESPONSIVE_CSS = `
@media (max-width: 768px) {
  .podplay-calc-grid {
    grid-template-columns: 1fr !important;
  }
  .podplay-timeline-row {
    grid-template-columns: 1fr !important;
  }
}
`;

// Inject responsive CSS once
if (typeof document !== 'undefined') {
  const existing = document.getElementById('podplay-calc-styles');
  if (!existing) {
    const style = document.createElement('style');
    style.id = 'podplay-calc-styles';
    style.textContent = RESPONSIVE_CSS;
    document.head.appendChild(style);
  }
}

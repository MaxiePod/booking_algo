import React from 'react';
import { NumberInput } from './NumberInput';
import { CurrencyInput } from './CurrencyInput';
import { SliderInput } from './SliderInput';
import { InefficiencyCurve } from './InefficiencyCurve';
import { LIMITS } from '../utils/constants';
import { colors, fonts, spacing, borderRadius, shadows, transitions } from '../../shared/design-tokens';
import type { CalculatorInputs } from '../../shared/types';
import { DEFAULT_INPUTS } from '../../shared/types';

interface InputPanelProps {
  inputs: CalculatorInputs;
  onNumCourtsChange: (v: number) => void;
  onUtilizationChange: (v: number) => void;
  onPriceChange: (v: number) => void;
  onLockedChange: (v: number) => void;
  onLockPremiumChange: (v: number) => void;
  onReset: () => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  inputs,
  onNumCourtsChange,
  onUtilizationChange,
  onPriceChange,
  onLockedChange,
  onLockPremiumChange,
  onReset,
}) => {
  const [blinking, setBlinking] = React.useState(false);

  const handleReset = () => {
    onReset();
    setBlinking(true);
    setTimeout(() => setBlinking(false), 1100);
  };

  return (
    <div style={styles.panel}>
      {/* Header with icon */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrapper}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M17 10c0 3.866-3.134 7-7 7s-7-3.134-7-7 3.134-7 7-7 7 3.134 7 7z"
                stroke={colors.accent}
                strokeWidth="2"
              />
              <path d="M10 6v4l2.5 2.5" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 style={styles.heading}>Your Facility</h3>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.defaultIndicator}>
            <span style={styles.defaultTriangle} />
            Default
          </span>
          <button style={styles.resetButton} onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div style={styles.inputsWrapper}>
        <NumberInput
          label="Number of Courts"
          value={inputs.numCourts}
          min={LIMITS.courts.min}
          max={LIMITS.courts.max}
          onChange={onNumCourtsChange}
        />

        <SliderInput
          label="Target Utilization"
          value={inputs.targetUtilizationPercent}
          min={LIMITS.utilization.min}
          max={LIMITS.utilization.max}
          unit="%"
          onChange={onUtilizationChange}
          defaultValue={DEFAULT_INPUTS.targetUtilizationPercent}
          blinking={blinking}
        />

        <CurrencyInput
          label="Price per Hour"
          value={inputs.pricePerHour}
          min={LIMITS.price.min}
          max={LIMITS.price.max}
          onChange={onPriceChange}
        />

        <SliderInput
          label="Courts Locked by Customers"
          value={inputs.lockedPercent}
          min={LIMITS.locked.min}
          max={LIMITS.locked.max}
          unit="%"
          onChange={onLockedChange}
          defaultValue={DEFAULT_INPUTS.lockedPercent}
          blinking={blinking}
        />

        <SliderInput
          label="Lock Premium"
          value={inputs.lockPremiumPerHour}
          min={0}
          max={50}
          prefix="$"
          unit="/hr"
          onChange={onLockPremiumChange}
          defaultValue={DEFAULT_INPUTS.lockPremiumPerHour}
          blinking={blinking}
        />
      </div>

      {/* Inefficiency visualization */}
      <div style={styles.chartSection}>
        <div style={styles.chartLabel}>Inefficiency Curve</div>
        <InefficiencyCurve
          baseUtilization={inputs.targetUtilizationPercent / 100}
          lockedPercent={inputs.lockedPercent}
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
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottom: `1px solid ${colors.borderLight}`,
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
    backgroundColor: colors.accentLight,
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  defaultIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    color: colors.textMuted,
    fontSize: fonts.sizeXs,
    fontWeight: fonts.weightMedium,
  },
  defaultTriangle: {
    display: 'inline-block',
    width: 0,
    height: 0,
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderTop: `6px solid ${colors.successDark}`,
  },
  resetButton: {
    padding: `${spacing.xs} ${spacing.md}`,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
    color: colors.textMuted,
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightMedium,
    cursor: 'pointer',
    fontFamily: fonts.family,
    transition: `all ${transitions.fast}`,
  },
  inputsWrapper: {
    flex: 1,
  },
  chartSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTop: `1px solid ${colors.borderLight}`,
  },
  chartLabel: {
    fontSize: fonts.sizeXs,
    fontWeight: fonts.weightSemibold,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: fonts.trackingWide,
    marginBottom: spacing.sm,
  },
};

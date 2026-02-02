import React from 'react';
import { NumberInput } from './NumberInput';
import { CurrencyInput } from './CurrencyInput';
import { SliderInput } from './SliderInput';
import { InefficiencyCurve } from './InefficiencyCurve';
import { LIMITS } from '../utils/constants';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <h3 style={{ ...styles.heading, marginBottom: 0 }}>Your Facility</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.textMuted, fontSize: fonts.sizeSmall }}>
            <span style={{
              display: 'inline-block',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '6px solid #f59e0b',
            }} />
            Default
          </span>
          <button style={styles.resetButton} onClick={handleReset}>Reset to Defaults</button>
        </div>
      </div>

      <NumberInput
        label="Number of Courts"
        value={inputs.numCourts}
        min={LIMITS.courts.min}
        max={LIMITS.courts.max}
        onChange={onNumCourtsChange}
      />

      <SliderInput
        label="Current Utilization (today)"
        value={inputs.currentUtilizationPercent}
        min={LIMITS.utilization.min}
        max={LIMITS.utilization.max}
        unit="%"
        onChange={onUtilizationChange}
        defaultValue={DEFAULT_INPUTS.currentUtilizationPercent}
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

      <InefficiencyCurve
        baseUtilization={inputs.currentUtilizationPercent / 100}
        lockedPercent={inputs.lockedPercent}
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
  heading: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    marginTop: 0,
    marginBottom: spacing.xl,
    letterSpacing: '-0.3px',
  },
  resetButton: {
    padding: '4px 10px',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
    color: colors.textMuted,
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightMedium,
    cursor: 'pointer',
    fontFamily: fonts.family,
    transition: 'all 0.15s',
  },
};

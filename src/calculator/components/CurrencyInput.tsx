import React, { useState } from 'react';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

interface CurrencyInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  min,
  max,
  step = 5,
  onChange,
}) => {
  const [focused, setFocused] = useState(false);

  const handleChange = (newValue: number) => {
    onChange(Math.min(max, Math.max(min, newValue)));
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>{label}</label>
      <div
        style={{
          ...styles.inputWrapper,
          borderColor: focused ? colors.primary : colors.border,
        }}
      >
        <span style={styles.prefix}>$</span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => handleChange(Number(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
        <span style={styles.suffix}>/hr</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    display: 'block',
    fontSize: fonts.sizeBase,
    fontWeight: fonts.weightMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    padding: `0 ${spacing.md}`,
    transition: 'border-color 0.2s',
    backgroundColor: colors.background,
  },
  prefix: {
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightSemibold,
    color: colors.textMuted,
    marginRight: '4px',
  },
  input: {
    flex: 1,
    height: '40px',
    border: 'none',
    outline: 'none',
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    fontFamily: fonts.family,
    backgroundColor: 'transparent',
    MozAppearance: 'textfield' as any,
  },
  suffix: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    marginLeft: '4px',
  },
};

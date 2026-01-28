import React from 'react';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

interface NumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}) => {
  const handleChange = (newValue: number) => {
    onChange(Math.min(max, Math.max(min, newValue)));
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>{label}</label>
      <div style={styles.inputGroup}>
        <button
          style={styles.button}
          onClick={() => handleChange(value - step)}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => handleChange(Number(e.target.value))}
          style={styles.input}
        />
        <button
          style={styles.button}
          onClick={() => handleChange(value + step)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
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
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    border: `1px solid ${colors.border}`,
  },
  button: {
    width: '40px',
    height: '40px',
    border: 'none',
    backgroundColor: colors.backgroundAlt,
    color: colors.text,
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightBold,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'background-color 0.15s',
  },
  input: {
    width: '80px',
    height: '40px',
    border: 'none',
    borderLeft: `1px solid ${colors.border}`,
    borderRight: `1px solid ${colors.border}`,
    textAlign: 'center' as const,
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    outline: 'none',
    fontFamily: fonts.family,
    MozAppearance: 'textfield' as any,
    backgroundColor: colors.background,
  },
};

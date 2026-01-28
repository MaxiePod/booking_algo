import React from 'react';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}) => {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <label style={styles.label}>{label}</label>
        <span style={styles.value}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          ...styles.slider,
          background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${percent}%, ${colors.border} ${percent}%, ${colors.border} 100%)`,
        }}
      />
      <div style={styles.rangeLabels}>
        <span style={styles.rangeLabel}>
          {min}
          {unit}
        </span>
        <span style={styles.rangeLabel}>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fonts.sizeBase,
    fontWeight: fonts.weightMedium,
    color: colors.textSecondary,
  },
  value: {
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightBold,
    color: colors.text,
    minWidth: '48px',
    textAlign: 'right' as const,
  },
  slider: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    outline: 'none',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    cursor: 'pointer',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '6px',
  },
  rangeLabel: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
  },
};

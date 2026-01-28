import React from 'react';
import type { TimePeriod } from '../../algorithm/inefficiency-model';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

interface TimePeriodToggleProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

const periods: { value: TimePeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
];

export const TimePeriodToggle: React.FC<TimePeriodToggleProps> = ({
  value,
  onChange,
}) => {
  return (
    <div style={styles.container}>
      {periods.map((p) => (
        <button
          key={p.value}
          style={{
            ...styles.button,
            ...(value === p.value ? styles.active : {}),
          }}
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'inline-flex',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundAlt,
    padding: '2px',
    gap: '2px',
  },
  button: {
    padding: `6px ${spacing.md}`,
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.textMuted,
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightMedium,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: fonts.family,
    borderRadius: borderRadius.sm,
  },
  active: {
    backgroundColor: colors.primary,
    color: '#ffffff',
    fontWeight: fonts.weightSemibold,
  },
};

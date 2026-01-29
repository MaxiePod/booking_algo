import React from 'react';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Rendered before the numeric value (e.g. "$") */
  prefix?: string;
  onChange: (value: number) => void;
  /** Optional React node rendered after the label text (e.g. InfoTooltip) */
  labelSuffix?: React.ReactNode;
  /** If provided, renders a small triangle tick mark on the slider track at this value */
  defaultValue?: number;
  /** When true, the default-value triangle blinks to draw attention */
  blinking?: boolean;
}

/** Amber color for default-value triangle marks (matches variance tooltip bell curve) */
const DEFAULT_MARK_COLOR = '#f59e0b';

/** Inject blink keyframes once into <head> */
const BLINK_STYLE_ID = 'podplay-default-blink-style';
function ensureBlinkStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(BLINK_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BLINK_STYLE_ID;
  style.textContent = `
@keyframes podplay-default-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.15; }
}
.podplay-default-blink {
  animation: podplay-default-blink 0.33s ease-in-out 3;
}`;
  document.head.appendChild(style);
}

export const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  prefix = '',
  onChange,
  labelSuffix,
  defaultValue,
  blinking,
}) => {
  React.useEffect(() => { ensureBlinkStyle(); }, []);

  const percent = ((value - min) / (max - min)) * 100;
  const defaultPercent = defaultValue != null
    ? ((defaultValue - min) / (max - min)) * 100
    : null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <label style={styles.label}>
          {label}
          {labelSuffix}
        </label>
        <span style={styles.value}>
          {prefix}{value}{unit}
        </span>
      </div>
      <div style={styles.sliderTrack}>
        {defaultPercent != null && (
          <div
            className={`podplay-default-mark${blinking ? ' podplay-default-blink' : ''}`}
            style={{
              position: 'absolute',
              top: 2,
              left: `calc(8px + (100% - 16px) * ${defaultPercent / 100})`,
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `6px solid ${DEFAULT_MARK_COLOR}`,
              pointerEvents: 'none',
            }}
            title={`Default: ${prefix}${defaultValue}${unit}`}
          />
        )}
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
      </div>
      <div style={styles.rangeLabels}>
        <span style={styles.rangeLabel}>
          {prefix}{min}{unit}
        </span>
        <span style={styles.rangeLabel}>
          {prefix}{max}{unit}
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
    display: 'flex',
    alignItems: 'center',
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
  sliderTrack: {
    position: 'relative' as const,
    paddingTop: 10,
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

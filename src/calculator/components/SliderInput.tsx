import React from 'react';
import { colors, fonts, spacing, borderRadius, transitions } from '../../shared/design-tokens';

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
  /** Custom render for the value display (overrides default prefix+value+unit) */
  renderValue?: (value: number) => React.ReactNode;
  /** Custom label for the min end of the slider (overrides showing min value) */
  minLabel?: string;
  /** Custom label for the max end of the slider (overrides showing max value) */
  maxLabel?: string;
  /** Hide the range labels entirely */
  hideRangeLabels?: boolean;
}

/** Green color for default-value triangle marks */
const DEFAULT_MARK_COLOR = colors.successDark;

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
  renderValue,
  minLabel,
  maxLabel,
  hideRangeLabels,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  const percent = ((value - min) / (max - min)) * 100;
  const defaultPercent = defaultValue != null
    ? ((defaultValue - min) / (max - min)) * 100
    : null;

  return (
    <div
      style={styles.container}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.header}>
        <label style={styles.label}>
          {label}
          {labelSuffix}
        </label>
        <span
          style={{
            ...styles.value,
            color: isDragging ? colors.primary : colors.text,
            transform: isDragging ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          {renderValue ? renderValue(value) : <>{prefix}{value}{unit}</>}
        </span>
      </div>

      <div style={styles.sliderWrapper}>
        {/* Track background with gradient fill */}
        <div style={styles.trackBg}>
          <div
            style={{
              ...styles.trackFill,
              width: `${percent}%`,
              opacity: isHovered || isDragging ? 1 : 0.8,
            }}
          />
        </div>

        {/* Default value marker */}
        {defaultPercent != null && (
          <div
            className={`podplay-default-mark${blinking ? ' podplay-default-blink' : ''}`}
            style={{
              position: 'absolute',
              top: -6,
              left: `calc(8px + (100% - 16px) * ${defaultPercent / 100})`,
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `6px solid ${DEFAULT_MARK_COLOR}`,
              transform: 'translateX(-4px)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
            title={`Default: ${prefix}${defaultValue}${unit}`}
          />
        )}

        {/* Actual range input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          style={styles.slider}
        />
      </div>

      {/* Range labels */}
      {!hideRangeLabels && (
        <div style={styles.rangeLabels}>
          <span style={styles.rangeLabel}>
            {minLabel ?? `${prefix}${min}${unit}`}
          </span>
          <span style={styles.rangeLabel}>
            {maxLabel ?? `${prefix}${max}${unit}`}
          </span>
        </div>
      )}
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
    gap: spacing.xs,
    fontSize: fonts.sizeBase,
    fontWeight: fonts.weightMedium,
    color: colors.textSecondary,
  },
  value: {
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    minWidth: '60px',
    textAlign: 'right' as const,
    transition: `all ${transitions.fast}`,
    fontFamily: fonts.family,
  },
  sliderWrapper: {
    position: 'relative' as const,
    height: '24px',
    display: 'flex',
    alignItems: 'center',
  },
  trackBg: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: '6px',
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${colors.primaryMuted}, ${colors.textSecondary})`,
    borderRadius: borderRadius.full,
    transition: `opacity ${transitions.fast}`,
  },
  slider: {
    position: 'relative' as const,
    width: '100%',
    height: '24px',
    background: 'transparent',
    cursor: 'pointer',
    zIndex: 3,
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  rangeLabel: {
    fontSize: fonts.sizeXs,
    color: colors.textMuted,
    fontWeight: fonts.weightMedium,
  },
};

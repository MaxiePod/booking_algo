import React from 'react';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';

/** Inject styles to hide number input spinners */
const SPINNER_STYLE_ID = 'podplay-number-input-spinners';
function ensureSpinnerStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SPINNER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SPINNER_STYLE_ID;
  style.textContent = `
/* Hide number input spinners in Chrome, Safari, Edge */
input.podplay-number-input::-webkit-outer-spin-button,
input.podplay-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
/* Hide spinners in Firefox */
input.podplay-number-input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}`;
  document.head.appendChild(style);
}

interface NumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  compact?: boolean;
  onChange: (value: number) => void;
  /** Optional React node rendered after the label text (e.g. InfoTooltip) */
  labelSuffix?: React.ReactNode;
  /** Rendered before the − button inside the input group (e.g. "$") */
  prefix?: string;
  /** Rendered after the + button inside the input group (e.g. "/hr") */
  unit?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  compact = false,
  onChange,
  labelSuffix,
  prefix,
  unit,
}) => {
  React.useEffect(() => { ensureSpinnerStyles(); }, []);

  const handleChange = (newValue: number) => {
    onChange(Math.min(max, Math.max(min, newValue)));
  };

  const btnSize = compact ? '26px' : '40px';
  const inputW = compact ? '44px' : '56px';

  return (
    <div style={styles.container}>
      <label style={styles.label}>
        {label}
        {labelSuffix}
      </label>
      <div style={styles.inputGroup}>
        {prefix && <span style={{ ...styles.adornment, ...(compact ? { padding: '0 4px', fontSize: '11px' } : {}) }}>{prefix}</span>}
        <button
          style={{ ...styles.button, width: btnSize, height: btnSize, ...(compact ? { fontSize: '13px' } : {}) }}
          onClick={() => handleChange(value - step)}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          className="podplay-number-input"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => handleChange(Number(e.target.value))}
          style={{ ...styles.input, width: inputW, height: btnSize, ...(compact ? { fontSize: '13px' } : {}) }}
        />
        <button
          style={{ ...styles.button, width: btnSize, height: btnSize, ...(compact ? { fontSize: '13px' } : {}) }}
          onClick={() => handleChange(value + step)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
        {unit && <span style={{ ...styles.adornment, ...(compact ? { padding: '0 4px', fontSize: '11px' } : {}) }}>{unit}</span>}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    fontSize: fonts.sizeBase,
    fontWeight: fonts.weightMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    border: `1px solid ${colors.border}`,
    width: 'fit-content',
  },
  button: {
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
    flexShrink: 0,
  },
  adornment: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    padding: '0 6px',
    display: 'flex',
    alignItems: 'center',
    userSelect: 'none' as const,
  },
  input: {
    border: 'none',
    borderLeft: `1px solid ${colors.border}`,
    borderRight: `1px solid ${colors.border}`,
    textAlign: 'center' as const,
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    outline: 'none',
    fontFamily: fonts.family,
    backgroundColor: colors.background,
    padding: 0,
    flexShrink: 0,
  },
};

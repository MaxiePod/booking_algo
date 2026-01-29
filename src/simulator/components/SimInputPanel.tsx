import React from 'react';
import { NumberInput } from '../../calculator/components/NumberInput';
import { SliderInput } from '../../calculator/components/SliderInput';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';
import type { SimulatorInputs, DurationBinPcts } from '../types';
import { computeDurationBins } from '../types';

interface SimInputPanelProps {
  inputs: SimulatorInputs;
  running: boolean;
  maxReservationsPerDay: number;
  onInputsChange: (partial: Partial<SimulatorInputs>) => void;
  onRun: () => void;
}

const DurationBinSliders: React.FC<{
  bins: ReturnType<typeof computeDurationBins>;
  pcts: DurationBinPcts;
  onChange: (pcts: DurationBinPcts) => void;
}> = ({ bins, pcts, onChange }) => {
  const handleSliderChange = (index: number, raw: number) => {
    const value = Math.round(raw / 5) * 5; // snap to 5% increments
    const next = [...pcts] as [number, number, number, number];
    const old = next[index];
    const delta = value - old;
    next[index] = value;

    // Auto-balance: adjust the last bin, or second-to-last if editing the last
    const balanceIdx = index === 3 ? 2 : 3;
    next[balanceIdx] = Math.max(0, next[balanceIdx] - delta);

    // Clamp sum to 100: if still not 100, spread remaining adjustment
    const sum = next[0] + next[1] + next[2] + next[3];
    if (sum !== 100) {
      const diff = sum - 100;
      // Find another bin to adjust (not the one we edited, not the balance target)
      for (let i = 3; i >= 0; i--) {
        if (i !== index && i !== balanceIdx) {
          next[i] = Math.max(0, next[i] - diff);
          break;
        }
      }
    }

    // Final safety: ensure non-negative and sum = 100
    const finalSum = next[0] + next[1] + next[2] + next[3];
    if (finalSum !== 100) {
      next[balanceIdx] = Math.max(0, next[balanceIdx] + (100 - finalSum));
    }

    onChange(next);
  };

  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>Duration Distribution</label>
      {bins.map((bin, i) => {
        const pct = pcts[i];
        const percent = pct;
        return (
          <div key={i} style={styles.binRow}>
            <span style={styles.binLabel}>{bin.label}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={pct}
              onChange={(e) => handleSliderChange(i, Number(e.target.value))}
              style={{
                ...styles.binSlider,
                background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${percent}%, ${colors.border} ${percent}%, ${colors.border} 100%)`,
              }}
            />
            <span style={styles.binPct}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
};

export const SimInputPanel: React.FC<SimInputPanelProps> = ({
  inputs,
  running,
  maxReservationsPerDay,
  onInputsChange,
  onRun,
}) => {
  const bins = computeDurationBins(inputs.minReservationMin, inputs.slotBlockMin);

  return (
    <div style={styles.panel}>
      <h3 style={styles.heading}>Simulation Parameters</h3>

      <NumberInput
        label="Number of Courts"
        value={inputs.numCourts}
        min={1}
        max={20}
        onChange={(v) => onInputsChange({ numCourts: v })}
      />

      <div style={styles.row}>
        <div style={styles.halfCol}>
          <NumberInput
            label="Open Hour"
            value={inputs.openHour}
            min={0}
            max={inputs.closeHour - 1}
            onChange={(v) => onInputsChange({ openHour: v })}
          />
        </div>
        <div style={styles.halfCol}>
          <NumberInput
            label="Close Hour"
            value={inputs.closeHour}
            min={inputs.openHour + 1}
            max={24}
            onChange={(v) => onInputsChange({ closeHour: v })}
          />
        </div>
      </div>

      <SliderInput
        label="Reservations per Day"
        value={inputs.reservationsPerDay}
        min={5}
        max={maxReservationsPerDay}
        onChange={(v) => onInputsChange({ reservationsPerDay: v })}
      />

      <SliderInput
        label="Locked Court %"
        value={inputs.lockedPercent}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => onInputsChange({ lockedPercent: v })}
      />

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Min Reservation Length</label>
        <div style={styles.chipRow}>
          {[30, 60, 90].map((m) => (
            <button
              key={m}
              style={{
                ...styles.chip,
                ...(inputs.minReservationMin === m ? styles.chipActive : {}),
              }}
              onClick={() => onInputsChange({ minReservationMin: m })}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Slot Block Size</label>
        <div style={styles.chipRow}>
          {[15, 30, 60].map((m) => (
            <button
              key={m}
              style={{
                ...styles.chip,
                ...(inputs.slotBlockMin === m ? styles.chipActive : {}),
              }}
              onClick={() => onInputsChange({ slotBlockMin: m })}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      <DurationBinSliders
        bins={bins}
        pcts={inputs.durationBinPcts}
        onChange={(pcts) => onInputsChange({ durationBinPcts: pcts })}
      />

      <SliderInput
        label="Iterations"
        value={inputs.iterations}
        min={10}
        max={100}
        step={10}
        onChange={(v) => onInputsChange({ iterations: v })}
      />

      <button
        style={{
          ...styles.runButton,
          ...(running ? styles.runButtonDisabled : {}),
        }}
        onClick={onRun}
        disabled={running}
      >
        {running ? 'Running...' : 'Run Simulation'}
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
  },
  heading: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    marginTop: 0,
    marginBottom: spacing.xl,
    letterSpacing: '-0.3px',
  },
  row: {
    display: 'flex',
    gap: spacing.md,
  },
  halfCol: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    display: 'block',
    fontSize: fonts.sizeBase,
    fontWeight: fonts.weightMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  chip: {
    padding: `6px 12px`,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightMedium,
    cursor: 'pointer',
    fontFamily: fonts.family,
    transition: 'all 0.15s',
  },
  chipActive: {
    backgroundColor: colors.primary,
    color: '#ffffff',
    borderColor: colors.primary,
  },
  binRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  binLabel: {
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightMedium,
    color: colors.textSecondary,
    minWidth: '56px',
    textAlign: 'right' as const,
  },
  binSlider: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    outline: 'none',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    cursor: 'pointer',
  },
  binPct: {
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightBold,
    color: colors.text,
    minWidth: '36px',
    textAlign: 'right' as const,
  },
  runButton: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    color: '#ffffff',
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightSemibold,
    cursor: 'pointer',
    fontFamily: fonts.family,
    marginTop: spacing.lg,
    transition: 'background-color 0.15s',
  },
  runButtonDisabled: {
    backgroundColor: colors.textMuted,
    cursor: 'not-allowed',
  },
};

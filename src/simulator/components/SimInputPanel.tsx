import React from 'react';
import { NumberInput } from '../../calculator/components/NumberInput';
import { SliderInput } from '../../calculator/components/SliderInput';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';
import type { SimulatorInputs } from '../types';

interface SimInputPanelProps {
  inputs: SimulatorInputs;
  running: boolean;
  onInputsChange: (partial: Partial<SimulatorInputs>) => void;
  onRun: () => void;
}

const DURATION_PRESETS: { label: string; durations: number[] }[] = [
  { label: '60 min only', durations: [60] },
  { label: '60 / 90 min', durations: [60, 90] },
  { label: '60 / 90 / 120 min', durations: [60, 90, 120] },
  { label: '30 / 60 / 90 / 120 min', durations: [30, 60, 90, 120] },
];

export const SimInputPanel: React.FC<SimInputPanelProps> = ({
  inputs,
  running,
  onInputsChange,
  onRun,
}) => {
  const durationsKey = inputs.durations.join(',');

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
        max={60}
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

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Reservation Durations</label>
        <div style={styles.chipRow}>
          {DURATION_PRESETS.map((p) => (
            <button
              key={p.label}
              style={{
                ...styles.chip,
                ...(durationsKey === p.durations.join(',')
                  ? styles.chipActive
                  : {}),
              }}
              onClick={() => onInputsChange({ durations: p.durations })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

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

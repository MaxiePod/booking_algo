import React from 'react';
import { NumberInput } from '../../calculator/components/NumberInput';
import { SliderInput } from '../../calculator/components/SliderInput';
import { InfoTooltip } from '../../shared/InfoTooltip';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';
import type { SimulatorInputs, DurationBinPcts } from '../types';
import { computeDurationBins, computeAvgDuration, DEFAULT_SIM_INPUTS } from '../types';

interface SimInputPanelProps {
  inputs: SimulatorInputs;
  running: boolean;
  maxReservationsPerDay: number;
  onInputsChange: (partial: Partial<SimulatorInputs>) => void;
  onRun: () => void;
  onReset: () => void;
}

/** Bell-curve SVG + explanation for the variance tooltip */
const VarianceTooltip: React.FC<{ mean: number }> = ({ mean }) => {
  // Generate a normal-distribution bell curve path
  const W = 200;
  const H = 60;
  const gauss = (x: number, sigma: number) =>
    Math.exp(-0.5 * (x / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
  const curve = (sigma: number, color: string, label: string) => {
    const pts: string[] = [];
    for (let i = 0; i <= 50; i++) {
      const t = (i / 50) * 6 - 3; // -3 to +3 std devs
      const x = (i / 50) * W;
      const y = H - gauss(t, sigma) * sigma * H * 1.8;
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return { path: pts.join(' '), color, label };
  };
  const narrow = curve(0.6, '#3b82f6', '10%');
  const wide = curve(1.4, '#f59e0b', '50%');

  const lo = Math.round(mean * 0.5);
  const hi = Math.round(mean * 1.5);

  return (
    <span style={{ display: 'block' }}>
      <span style={{ display: 'block', marginBottom: 8, lineHeight: 1.5 }}>
        Controls how much the daily booking count varies across simulated days.
      </span>
      <svg viewBox={`0 0 ${W} ${H + 16}`} width={W} height={H + 16} style={{ display: 'block', margin: '0 auto 6px' }}>
        <path d={narrow.path} fill="none" stroke={narrow.color} strokeWidth="2" opacity="0.9" />
        <path d={wide.path} fill="none" stroke={wide.color} strokeWidth="2" opacity="0.9" />
        {/* Labels */}
        <text x="28" y="12" fill={narrow.color} fontSize="9" fontWeight="600">CV 10%</text>
        <text x={W - 68} y="12" fill={wide.color} fontSize="9" fontWeight="600">CV 50%</text>
        {/* x-axis: mean label */}
        <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#6b7280" strokeWidth="0.5" strokeDasharray="3,2" />
        <text x={W / 2} y={H + 12} fill="#9ca3af" fontSize="9" textAnchor="middle">{mean}/day</text>
      </svg>
      <span style={{ display: 'block', lineHeight: 1.5 }}>
        <strong style={{ color: '#e5e7eb' }}>0%</strong> = exactly {mean} bookings every day{'\n'}
        <br />
        <strong style={{ color: '#e5e7eb' }}>50%</strong> = days range roughly {lo}–{hi}
      </span>
    </span>
  );
};

const DurationBinSliders: React.FC<{
  bins: ReturnType<typeof computeDurationBins>;
  pcts: DurationBinPcts;
  defaultPcts: DurationBinPcts;
  onChange: (pcts: DurationBinPcts) => void;
}> = ({ bins, pcts, defaultPcts, onChange }) => {
  const handleSliderChange = (index: number, raw: number) => {
    const value = Math.round(raw); // 1% increments
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
      <label style={styles.label}>
        Duration Distribution
        <InfoTooltip text="Controls the probability of each reservation duration being generated. Bins are computed from Min Reservation Length (M) and Slot Block Size (B). The last bin picks randomly from M+2B up to 4 hours." />
      </label>
      {bins.map((bin, i) => {
        const pct = pcts[i];
        const defPct = defaultPcts[i];
        return (
          <div key={i} style={styles.binRow}>
            <span style={styles.binLabel}>{bin.label}</span>
            <div style={styles.binSliderTrack}>
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  left: `calc(8px + (100% - 16px) * ${defPct / 100})`,
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: `6px solid ${colors.textMuted}`,
                  pointerEvents: 'none',
                }}
                title={`Default: ${defPct}%`}
              />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={pct}
                onChange={(e) => handleSliderChange(i, Number(e.target.value))}
                style={{
                  ...styles.binSlider,
                  background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${pct}%, ${colors.border} ${pct}%, ${colors.border} 100%)`,
                }}
              />
            </div>
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
  onReset,
}) => {
  const bins = computeDurationBins(inputs.minReservationMin, inputs.slotBlockMin);

  const operatingMinutes = (inputs.closeHour - inputs.openHour) * 60;
  const avgDuration = computeAvgDuration(
    inputs.minReservationMin, inputs.slotBlockMin, inputs.durationBinPcts, operatingMinutes
  );
  const preAlgoUtil = Math.min(
    1,
    Math.max(0, (inputs.reservationsPerDay * avgDuration) / (inputs.numCourts * operatingMinutes))
  );

  return (
    <div style={styles.panel}>
      <div style={styles.headingRow}>
        <h3 style={styles.heading}>Simulation Parameters</h3>
        <button style={styles.resetButton} onClick={onReset}>Reset to Defaults</button>
      </div>

      {/* Courts + Open Hour + Close Hour on one row */}
      <div style={styles.threeColRow}>
        <div style={styles.threeCol}>
          <NumberInput
            label="Courts"
            value={inputs.numCourts}
            min={1}
            max={20}
            compact
            onChange={(v) => onInputsChange({ numCourts: v })}
            labelSuffix={<InfoTooltip text="Number of courts available for booking at the facility." />}
          />
        </div>
        <div style={styles.threeCol}>
          <NumberInput
            label="Open Hour"
            value={inputs.openHour}
            min={0}
            max={inputs.closeHour - 1}
            compact
            onChange={(v) => onInputsChange({ openHour: v })}
            labelSuffix={<InfoTooltip text="The hour the facility opens (24h format). Courts can be booked starting from this time." />}
          />
        </div>
        <div style={styles.threeCol}>
          <NumberInput
            label="Close Hour"
            value={inputs.closeHour}
            min={inputs.openHour + 1}
            max={24}
            compact
            onChange={(v) => onInputsChange({ closeHour: v })}
            labelSuffix={<InfoTooltip text="The hour the facility closes (24h format). All reservations must end by this time." />}
          />
        </div>
      </div>

      <SliderInput
        label="Reservation Slots"
        value={inputs.reservationsPerDay}
        min={5}
        max={maxReservationsPerDay}
        onChange={(v) => onInputsChange({ reservationsPerDay: v })}
        labelSuffix={<InfoTooltip text="Number of reservation slots generated per simulated day. Each slot represents one booking request placed into the system. The maximum is determined by operating hours, min reservation length, and court count." />}
        defaultValue={DEFAULT_SIM_INPUTS.reservationsPerDay}
      />
      <div style={styles.preAlgoUtil}>
        ≈ {Math.round(preAlgoUtil * 100)}% estimated pre-algorithm utilization
      </div>

      <SliderInput
        label="Locked Court %"
        value={inputs.lockedPercent}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => onInputsChange({ lockedPercent: v })}
        labelSuffix={<InfoTooltip text="Percentage of reservations that are locked to a specific court (e.g. a member's preferred court). Locked reservations cannot be moved by the algorithm." />}
        defaultValue={DEFAULT_SIM_INPUTS.lockedPercent}
      />

      <SliderInput
        label="Lock Premium"
        value={inputs.lockPremiumPerHour}
        min={0}
        max={50}
        prefix="$"
        unit="/hr"
        onChange={(v) => onInputsChange({ lockPremiumPerHour: v })}
        labelSuffix={<InfoTooltip text="Additional surcharge per court-hour for customers who lock a specific court. This premium is collected on top of the base court rental price." />}
        defaultValue={DEFAULT_SIM_INPUTS.lockPremiumPerHour}
      />

      {/* Min Reservation Length + Slot Block Size side by side */}
      <div style={styles.row}>
        <div style={styles.halfCol}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Min Reservation
              <InfoTooltip text="Minimum allowed reservation length in minutes. This is the shortest booking a player can make." />
            </label>
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
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={styles.halfCol}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Slot Block
              <InfoTooltip text="The time grid granularity in minutes. Reservations start and end on multiples of this value (e.g. 30 min means bookings at :00 and :30)." />
            </label>
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
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DurationBinSliders
        bins={bins}
        pcts={inputs.durationBinPcts}
        defaultPcts={DEFAULT_SIM_INPUTS.durationBinPcts}
        onChange={(pcts) => onInputsChange({ durationBinPcts: pcts })}
      />

      <SliderInput
        label="Price per Hour"
        value={inputs.pricePerHour}
        min={10}
        max={300}
        prefix="$"
        onChange={(v) => onInputsChange({ pricePerHour: v })}
        labelSuffix={<InfoTooltip text="Court rental price per hour. Used to estimate revenue differences between smart and naive assignment." />}
        defaultValue={DEFAULT_SIM_INPUTS.pricePerHour}
      />

      <SliderInput
        label="Day-to-Day Variance (CV)"
        value={inputs.varianceCV}
        min={0}
        max={50}
        unit="%"
        onChange={(v) => onInputsChange({ varianceCV: v })}
        labelSuffix={<InfoTooltip text={<VarianceTooltip mean={inputs.reservationsPerDay} />} />}
        defaultValue={DEFAULT_SIM_INPUTS.varianceCV}
      />

      <SliderInput
        label="Iterations"
        value={inputs.iterations}
        min={10}
        max={100}
        step={10}
        onChange={(v) => onInputsChange({ iterations: v })}
        labelSuffix={<InfoTooltip text="Number of Monte Carlo simulation runs. More iterations give more stable averages but take longer to compute." />}
        defaultValue={DEFAULT_SIM_INPUTS.iterations}
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
  headingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heading: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    margin: 0,
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
  row: {
    display: 'flex',
    gap: spacing.md,
  },
  halfCol: {
    flex: 1,
  },
  threeColRow: {
    display: 'flex',
    gap: spacing.sm,
  },
  threeCol: {
    flex: 1,
    minWidth: 0,
  },
  fieldGroup: {
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
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing.xs,
  },
  chip: {
    padding: `5px 10px`,
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
  binSliderTrack: {
    position: 'relative' as const,
    flex: 1,
    paddingTop: 10,
  },
  binSlider: {
    width: '100%',
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
  preAlgoUtil: {
    fontSize: fonts.sizeSmall,
    fontStyle: 'italic',
    color: colors.textMuted,
    marginTop: '-12px',
    marginBottom: spacing.lg,
  },
};

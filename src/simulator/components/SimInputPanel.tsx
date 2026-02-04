import React from 'react';
import { NumberInput } from '../../calculator/components/NumberInput';
import { SliderInput } from '../../calculator/components/SliderInput';
import { InfoTooltip } from '../../shared/InfoTooltip';
import { colors, fonts, spacing, borderRadius } from '../../shared/design-tokens';
import type { SimulatorInputs, DurationBinPcts } from '../types';
import { computeDurationBins, DEFAULT_SIM_INPUTS, PEAK_HOUR_START, PEAK_HOUR_END } from '../types';

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
  const narrow = curve(0.6, '#A3A3A3', '10%');
  const wide = curve(1.4, '#E5E1D8', '50%');

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

/** Green color for default-value triangle marks */
const DEFAULT_MARK_COLOR = colors.successDark;

/** Scientific explanation tooltip for Demand Pressure */
const DemandPressureTooltip: React.FC<{ utilization: number }> = ({ utilization }) => {
  const utilizationScale = Math.exp(2 * (utilization - 0.5));
  const formatHour = (h: number) => h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`;

  return (
    <span style={{ display: 'block' }}>
      <span style={{ display: 'block', marginBottom: 8, lineHeight: 1.5 }}>
        Models <strong style={{ color: '#e5e7eb' }}>pent-up demand</strong> — customers who would book if courts were available but get turned away.
      </span>
      <span style={{ display: 'block', marginBottom: 8, lineHeight: 1.5 }}>
        <strong style={{ color: '#e5e7eb' }}>How it works:</strong> The multiplier scales <em>exponentially</em> with your target utilization. At higher capacity, more customers are turned away, creating more latent demand.
      </span>
      <span style={{ display: 'block', marginBottom: 8, lineHeight: 1.5, fontFamily: 'monospace', fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '6px 8px', borderRadius: '4px' }}>
        effective = multiplier × e<sup>2×(util−0.5)</sup>
        <br />
        At {Math.round(utilization * 100)}% util → ×{utilizationScale.toFixed(2)} scaling
      </span>
      <span style={{ display: 'block', marginBottom: 8, lineHeight: 1.5 }}>
        <strong style={{ color: '#e5e7eb' }}>Examples:</strong>
        <br />• <strong>0</strong> = Off (no overflow modeled)
        <br />• <strong>1.0</strong> = Moderate (1 extra booking attempt per pressure unit)
        <br />• <strong>2.0</strong> = Busy (2× the overflow, typical for popular facilities)
        <br />• <strong>3.0</strong> = High demand (long waitlists, frequent turn-aways)
      </span>
      <span style={{ display: 'block', color: '#9ca3af', fontSize: '11px' }}>
        Peak hours: {formatHour(PEAK_HOUR_START)}–{formatHour(PEAK_HOUR_END)}
      </span>
    </span>
  );
};

const DurationBinSliders: React.FC<{
  bins: ReturnType<typeof computeDurationBins>;
  pcts: DurationBinPcts;
  defaultPcts: DurationBinPcts;
  onChange: (pcts: DurationBinPcts) => void;
  blinking?: boolean;
}> = ({ bins, pcts, defaultPcts, onChange, blinking }) => {
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
                className={`podplay-default-mark${blinking ? ' podplay-default-blink' : ''}`}
                style={{
                  position: 'absolute',
                  top: 2,
                  left: `calc(8px + (100% - 16px) * ${defPct / 100})`,
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: `6px solid ${DEFAULT_MARK_COLOR}`,
                  transform: 'translateX(-4px)',
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
  const [blinking, setBlinking] = React.useState(false);

  const handleReset = () => {
    onReset();
    setBlinking(true);
    setTimeout(() => setBlinking(false), 1100);
  };

  const bins = computeDurationBins(inputs.minReservationMin, inputs.slotBlockMin);

  return (
    <div style={styles.panel}>
      <div style={styles.headingRow}>
        <h3 style={styles.heading}>Simulation Parameters</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.textMuted, fontSize: fonts.sizeXs }}>
            <span style={{
              display: 'inline-block',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `6px solid ${colors.successDark}`,
            }} />
            Default
          </span>
          <button style={styles.resetButton} onClick={handleReset}>Reset to Defaults</button>
        </div>
      </div>

      <div style={styles.columnsRow}>
        {/* ── Left column: number inputs, chips, duration bins ── */}
        <div style={styles.leftCol}>
          {/* Courts, Open Hour, Close Hour on one row */}
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

          {/* Min Reservation + Slot Block side by side */}
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

          {/* Price / Hour + Lock Premium / Hour side by side */}
          <div style={styles.row}>
            <div style={styles.halfCol}>
              <NumberInput
                label="Price / Hour"
                value={inputs.pricePerHour}
                min={10}
                max={300}
                step={5}
                compact
                prefix="$"
                onChange={(v) => onInputsChange({ pricePerHour: v })}
                labelSuffix={<InfoTooltip text="Court rental price per hour. Used to estimate revenue differences between smart and naive assignment." />}
              />
            </div>
            <div style={styles.halfCol}>
              <NumberInput
                label="Lock Premium / Hour"
                value={inputs.lockPremiumPerHour}
                min={0}
                max={50}
                compact
                prefix="$"
                onChange={(v) => onInputsChange({ lockPremiumPerHour: v })}
                labelSuffix={<InfoTooltip text="Additional surcharge per court-hour for customers who lock a specific court. This premium is collected on top of the base court rental price." />}
              />
            </div>
          </div>

          <DurationBinSliders
            bins={bins}
            pcts={inputs.durationBinPcts}
            defaultPcts={DEFAULT_SIM_INPUTS.durationBinPcts}
            onChange={(pcts) => onInputsChange({ durationBinPcts: pcts })}
            blinking={blinking}
          />

          {/* Checkboxes for advanced options */}
          <div style={styles.checkboxGroup}>
            <div style={styles.checkboxRow}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={inputs.modelPeakTimes}
                  onChange={(e) => onInputsChange({ modelPeakTimes: e.target.checked })}
                  style={styles.checkbox}
                />
                <span>Model peak vs. off-peak demand</span>
              </label>
              <InfoTooltip
                text={
                  <span style={{ display: 'block', lineHeight: 1.5 }}>
                    When enabled, demand pressure is <strong style={{ color: '#e5e7eb' }}>doubled during peak hours</strong> ({PEAK_HOUR_START > 12 ? PEAK_HOUR_START - 12 : PEAK_HOUR_START}pm–{PEAK_HOUR_END > 12 ? PEAK_HOUR_END - 12 : PEAK_HOUR_END}pm), reflecting real-world patterns where after-work hours see the highest competition for courts.
                  </span>
                }
              />
            </div>

            <div style={styles.checkboxRow}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={inputs.allowSplitting}
                  onChange={(e) => onInputsChange({ allowSplitting: e.target.checked })}
                  style={styles.checkbox}
                />
                <span>Allow splitting of reservations</span>
              </label>
              <InfoTooltip
                text={
                  <span style={{ display: 'block', lineHeight: 1.5 }}>
                    When enabled, reservations may be <strong style={{ color: '#e5e7eb' }}>split across multiple courts</strong> (e.g., first hour on Court 1, second hour on Court 2).
                    <br /><br />
                    The smart algorithm <strong style={{ color: '#e5e7eb' }}>minimizes splits</strong> — only splitting when necessary to place a reservation. Compare split counts and revenue to see the tradeoff.
                    <br /><br />
                    <em style={{ color: '#9ca3af' }}>Note: Splitting is undesirable for customer experience but can improve utilization.</em>
                  </span>
                }
              />
            </div>

            {/* Splitting tolerance slider - only shown when splitting is enabled */}
            {inputs.allowSplitting && (
              <div style={styles.splittingToleranceRow}>
                <SliderInput
                  label="Splitting Tolerance"
                  value={inputs.splittingTolerance}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => onInputsChange({ splittingTolerance: v })}
                  labelSuffix={
                    <InfoTooltip
                      text={
                        <span style={{ display: 'block', lineHeight: 1.5 }}>
                          Controls the tradeoff between <strong style={{ color: '#e5e7eb' }}>avoiding splits</strong> and <strong style={{ color: '#e5e7eb' }}>maximizing revenue</strong>.
                          <br /><br />
                          <strong style={{ color: '#e5e7eb' }}>0% (Minimize Splits):</strong> Only split high-value reservations that would otherwise be lost. Reject lower-value reservations that require splitting.
                          <br /><br />
                          <strong style={{ color: '#e5e7eb' }}>100% (Maximize Revenue):</strong> Always split if needed to place a reservation, regardless of value.
                          <br /><br />
                          <em style={{ color: '#9ca3af' }}>Results always compare against the no-split baseline.</em>
                        </span>
                      }
                    />
                  }
                  defaultValue={DEFAULT_SIM_INPUTS.splittingTolerance}
                  blinking={blinking}
                  minLabel="Minimize Splits"
                  maxLabel="Max Revenue"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: all sliders ── */}
        <div style={styles.rightCol}>
          <SliderInput
            label="Current Capacity Utilization"
            value={inputs.reservationsPerDay}
            min={0}
            max={maxReservationsPerDay}
            onChange={(v) => onInputsChange({ reservationsPerDay: v })}
            labelSuffix={<InfoTooltip text="Target court-time utilization. Determines how many reservations are generated per simulated day based on average reservation duration, operating hours, and court count." />}
            defaultValue={DEFAULT_SIM_INPUTS.reservationsPerDay}
            blinking={blinking}
            renderValue={(v) => `${maxReservationsPerDay > 0 ? Math.round((v / maxReservationsPerDay) * 100) : 0}% (${v} res.)`}
          />

          <SliderInput
            label="Locked Court %"
            value={inputs.lockedPercent}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onInputsChange({ lockedPercent: v })}
            labelSuffix={<InfoTooltip text="Percentage of reservations that are locked to a specific court (e.g. a member's preferred court). Locked reservations cannot be moved by the algorithm." />}
            defaultValue={DEFAULT_SIM_INPUTS.lockedPercent}
            blinking={blinking}
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
            blinking={blinking}
          />

          <SliderInput
            label="Demand Pressure"
            value={inputs.overflowMultiplier}
            min={0}
            max={3}
            step={0.5}
            onChange={(v) => onInputsChange({ overflowMultiplier: v })}
            labelSuffix={
              <InfoTooltip
                text={
                  <DemandPressureTooltip
                    utilization={maxReservationsPerDay > 0 ? inputs.reservationsPerDay / maxReservationsPerDay : 0}
                  />
                }
              />
            }
            defaultValue={DEFAULT_SIM_INPUTS.overflowMultiplier}
            blinking={blinking}
            renderValue={(v) => v === 0 ? 'Off' : `${v.toFixed(1)}×`}
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
            blinking={blinking}
          />
        </div>
      </div>

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
    marginBottom: spacing.lg,
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
  columnsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.xl,
    alignItems: 'start',
  },
  leftCol: {},
  rightCol: {},
  row: {
    display: 'flex',
    gap: spacing.md,
  },
  halfCol: {
    flex: 1,
  },
  threeColRow: {
    display: 'flex',
    gap: spacing.md,
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
  checkboxGroup: {
    marginTop: spacing.md,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: fonts.sizeBase,
    fontWeight: fonts.weightMedium,
    color: colors.textSecondary,
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: colors.primary,
    cursor: 'pointer',
  },
  splittingToleranceRow: {
    marginTop: spacing.sm,
    marginLeft: '24px',
    paddingLeft: spacing.md,
    borderLeft: `2px solid ${colors.border}`,
  },
};

import React from 'react';
import { useSimulator } from './hooks/useSimulator';
import { SimInputPanel } from './components/SimInputPanel';
import { SimResultsPanel } from './components/SimResultsPanel';
import { AnimatedTimeline } from './components/AnimatedTimeline';
import { OccupancyHeatmap } from './components/OccupancyHeatmap';
import { SimulatorDisclaimerModal } from './components/SimulatorDisclaimerModal';
import { colors, fonts, spacing, borderRadius } from '../shared/design-tokens';

const DISCLAIMER_STORAGE_KEY = 'podplay-simulator-disclaimer-acknowledged';

export const SimulatorPage: React.FC = () => {
  const { inputs, results, running, maxReservationsPerDay, setInputs, resetInputs, run } = useSimulator();

  const [showDisclaimer, setShowDisclaimer] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem(DISCLAIMER_STORAGE_KEY);
  });

  const handleDisclaimerAcknowledge = () => {
    sessionStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true');
    setShowDisclaimer(false);
  };

  return (
    <div style={styles.wrapper}>
      {showDisclaimer && (
        <SimulatorDisclaimerModal onAcknowledge={handleDisclaimerAcknowledge} />
      )}

      <div style={styles.header}>
        <div style={styles.badge}>Monte Carlo Simulation</div>
        <h2 style={styles.title}>
          Algorithm <span style={styles.highlight}>Performance Simulator</span>
          <sup style={styles.betaBadge}>BETA</sup>
        </h2>
        <p style={styles.subtitle}>
          Compare PodPlay's smart court assignment against naive random
          placement. Configure your scenario and run simulations to see the difference.
        </p>
      </div>

      <SimInputPanel
        inputs={inputs}
        running={running}
        maxReservationsPerDay={maxReservationsPerDay}
        onInputsChange={setInputs}
        onRun={run}
        onReset={resetInputs}
      />

      <SimResultsPanel results={results} running={running} />

      {results && !running && (
        <AnimatedTimeline
          smart={results.sampleDay.smart}
          naive={results.sampleDay.naive}
          courtNames={results.sampleDay.courtNames}
          openTime={results.sampleDay.openTime}
          closeTime={results.sampleDay.closeTime}
        />
      )}

      {results && !running && (
        <OccupancyHeatmap sampleDay={results.sampleDay} />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    fontFamily: fonts.family,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: `${spacing.xl} ${spacing.lg}`,
    color: colors.text,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: spacing['2xl'],
  },
  badge: {
    display: 'inline-block',
    fontSize: fonts.sizeXs,
    fontWeight: fonts.weightSemibold,
    color: colors.accent,
    backgroundColor: colors.accentLight,
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
    letterSpacing: fonts.trackingWide,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: fonts.size3xl,
    fontWeight: fonts.weightLight,
    color: colors.text,
    marginTop: 0,
    marginBottom: spacing.md,
    letterSpacing: '-0.01em',
    lineHeight: fonts.lineHeightTight,
  },
  highlight: {
    color: colors.accent,
  },
  betaBadge: {
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightSemibold,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    verticalAlign: 'super',
    letterSpacing: fonts.trackingWide,
  },
  subtitle: {
    fontSize: fonts.sizeMd,
    color: colors.textSecondary,
    margin: 0,
    maxWidth: '640px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: fonts.lineHeightRelaxed,
    fontWeight: fonts.weightLight,
  },
};

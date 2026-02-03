import React from 'react';
import { useSimulator } from './hooks/useSimulator';
import { SimInputPanel } from './components/SimInputPanel';
import { SimResultsPanel } from './components/SimResultsPanel';
import { AnimatedTimeline } from './components/AnimatedTimeline';
import { OccupancyHeatmap } from './components/OccupancyHeatmap';
import { SimulatorDisclaimerModal } from './components/SimulatorDisclaimerModal';
import { colors, fonts, spacing } from '../shared/design-tokens';

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
        <h2 style={styles.title}>Algorithm Simulator</h2>
        <p style={styles.subtitle}>
          Compare PodPlay's smart court assignment against naive random
          placement. Configure your scenario and run a Monte Carlo simulation.
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
    maxWidth: '1100px',
    margin: '0 auto',
    padding: `${spacing.xl} ${spacing.lg}`,
    color: colors.text,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fonts.sizeXxl,
    fontWeight: fonts.weightBold,
    color: colors.text,
    marginTop: 0,
    marginBottom: spacing.md,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: fonts.sizeMd,
    color: colors.textSecondary,
    margin: 0,
    maxWidth: '640px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: 1.6,
  },
};

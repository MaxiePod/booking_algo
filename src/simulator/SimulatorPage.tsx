import React from 'react';
import { useSimulator } from './hooks/useSimulator';
import { SimInputPanel } from './components/SimInputPanel';
import { SimResultsPanel } from './components/SimResultsPanel';
import { CourtTimeline } from './components/CourtTimeline';
import { colors, fonts, spacing } from '../shared/design-tokens';

export const SimulatorPage: React.FC = () => {
  const { inputs, results, running, setInputs, run } = useSimulator();

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>Algorithm Simulator</h2>
        <p style={styles.subtitle}>
          Compare PodPlay's smart court assignment against naive random
          placement. Configure your scenario and run a Monte Carlo simulation.
        </p>
      </div>
      <div className="podplay-calc-grid" style={styles.grid}>
        <SimInputPanel
          inputs={inputs}
          running={running}
          onInputsChange={setInputs}
          onRun={run}
        />
        <SimResultsPanel results={results} running={running} />
      </div>

      {results && !running && (
        <CourtTimeline
          smart={results.sampleDay.smart}
          naive={results.sampleDay.naive}
          courtNames={results.sampleDay.courtNames}
          openTime={results.sampleDay.openTime}
          closeTime={results.sampleDay.closeTime}
        />
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.xl,
    alignItems: 'start',
  },
};

import React, { useState } from 'react';
import { SavingsCalculator } from './calculator/SavingsCalculator';
import { SimulatorPage } from './simulator/SimulatorPage';
import { colors, fonts } from './shared/design-tokens';

type Tab = 'calculator' | 'simulator';

const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>('calculator');

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <button
          style={{ ...styles.tab, ...(tab === 'calculator' ? styles.tabActive : {}) }}
          onClick={() => setTab('calculator')}
        >
          Savings Calculator
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'simulator' ? styles.tabActive : {}) }}
          onClick={() => setTab('simulator')}
        >
          Algorithm Simulator
        </button>
      </nav>

      {tab === 'calculator' && <SavingsCalculator />}
      {tab === 'simulator' && <SimulatorPage />}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: colors.pageBg,
    padding: '32px 16px 48px',
    fontFamily: fonts.family,
  },
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2px',
    marginBottom: '40px',
    backgroundColor: colors.backgroundAlt,
    borderRadius: '8px',
    padding: '3px',
    maxWidth: '380px',
    margin: '0 auto 40px',
  },
  tab: {
    flex: 1,
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: colors.textMuted,
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontWeight: '600',
  },
};

export default App;

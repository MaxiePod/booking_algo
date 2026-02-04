import React from 'react';
import ReactDOM from 'react-dom/client';
import { SavingsCalculator } from '../calculator/SavingsCalculator';
import type { CalculatorInputs } from '../shared/types';

const CONTAINER_ID = 'podplay-savings-calculator';

function init() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  // Read configuration from data attributes
  const initialInputs: Partial<CalculatorInputs> = {};

  const courts = container.dataset.courts;
  if (courts) initialInputs.numCourts = parseInt(courts, 10);

  const utilization = container.dataset.utilization;
  if (utilization) initialInputs.targetUtilizationPercent = parseInt(utilization, 10);

  const price = container.dataset.price;
  if (price) initialInputs.pricePerHour = parseInt(price, 10);

  const locked = container.dataset.locked;
  if (locked) initialInputs.lockedPercent = parseInt(locked, 10);

  const period = container.dataset.period;
  if (period === 'daily' || period === 'monthly' || period === 'annually') {
    initialInputs.period = period;
  }

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <SavingsCalculator initialInputs={initialInputs} />
    </React.StrictMode>
  );
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

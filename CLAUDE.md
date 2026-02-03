# Booking Algorithm Project Context

## Project Overview
Court booking simulator comparing a "smart" algorithm (First-Fit-Decreasing with scoring and compaction) against a "naive" baseline (random court assignment). Built with React + TypeScript + Vite. The simulator generates random reservation sets, runs both assigners, and reports utilization, gaps, fragmentation, and revenue metrics.

## Key Architecture

### Algorithm (`src/algorithm/`)
- `court-assigner.ts` — Smart assigner: locked-first, then flexible sorted by start time. Scores courts (adjacency, contiguity, gap penalty, fill bonus). Post-assignment compaction pass. **Now supports splitting** via `trySplitReservation()`.
- `naive-assigner.ts` — Naive baseline: locked-first, then flexible with random court ordering. No scoring/compaction. **Now supports splitting** via `naiveTrySplit()`.
- `gap-analyzer.ts` — Computes gaps and fragmentation scores.
- `types.ts` — Core types: `Reservation`, `Court`, `AssignmentResult`, `AssignerConfig` (now includes `allowSplitting`), `AssignedReservation` (now includes `isSplit` flag).
- `utils.ts` — `findFreeSlots`, `slotsOverlap`, `slotDuration`, etc.

### Simulator (`src/simulator/`)
- `run-simulation.ts` — Core simulation loop: generates reservations, runs both assigners across N iterations, computes aggregate stats. Contains the concurrency tracker, reservation generator, and overflow (pent-up demand) generator.
- `types.ts` — `SimulatorInputs` (now includes `modelPeakTimes`, `allowSplitting`), `SimulatorResults` (now includes `splitting` 4-way comparison), `PEAK_HOUR_START/END` constants.
- `hooks/useSimulator.ts` — React hook: manages inputs state, computes `maxReservationsPerDay` (based on avg duration), runs simulation on setTimeout.
- `components/SimInputPanel.tsx` — Input controls UI with checkboxes for peak times and splitting.
- `components/SimResultsPanel.tsx` — Results display with 4-way splitting comparison table and Day/Month/Year toggle.
- `components/SimulatorDisclaimerModal.tsx` — Disclaimer popup on first visit to Simulator tab (uses sessionStorage, shows once per session).

### Calculator (`src/calculator/`)
- `components/NumberInput.tsx` — Compact number input with `prefix`/`unit` adornment support. Browser spinners hidden via injected CSS.
- `components/SliderInput.tsx` — Slider with `renderValue` prop for custom display, default-value triangle markers.

## Current State (as of Feb 2026)

### What Works
- `npx tsc --noEmit` passes
- `npx vitest run` — all 82 tests pass
- Dev server: `npx vite dev` → http://localhost:5173/booking_algo/

### Features Implemented This Session

1. **Simulator Disclaimer Modal** (`SimulatorDisclaimerModal.tsx`)
   - Shows once per browser session (sessionStorage)
   - Header: "Attention: You Are Now Entering a Simulation"
   - Explains simulation is for directionality, not precision
   - "I Understand" button to dismiss

2. **NumberInput Improvements**
   - Hidden browser spinners (Chrome up/down arrows) via injected CSS class `podplay-number-input`
   - Centered number display, tightened box with `inline-flex` + `width: fit-content`

3. **Demand Pressure Enhancements**
   - **Exponential scaling** based on target utilization: `effective = multiplier × e^(2×(util−0.5))`
   - At 50% util → 1.0× scaling; at 80% util → ~1.8×; at 100% → ~2.7×
   - Scientific tooltip with formula, examples, and peak hours info
   - **Peak times checkbox**: doubles demand pressure during 5pm-9pm when enabled

4. **Reservation Splitting**
   - New checkbox: "Allow splitting of reservations"
   - Smart algorithm minimizes splits (only splits when reservation can't fit on single court)
   - Naive algorithm splits randomly
   - **4-way comparison table** in results:
     - Naive (no split) | Naive (with split) | Smart (no split) | Smart (with split)
     - Shows Revenue, Splits, Utilization for each
   - **Time period toggle**: Day / Month / Year for all values
   - Summary: Smart vs Naive difference, splitting benefit, splits avoided

### Important Behavior Notes (Learned This Session)

1. **"Additional bookings" with splitting is CORRECT**:
   - Same reservations are generated regardless of splitting setting
   - Without splitting: Some reservations can't fit → unassigned
   - With splitting: Those SAME reservations can now be placed via splitting
   - More placed = higher utilization = higher revenue
   - **No new demand is generated** — just more gets placed

2. **100% utilization still shows gaps — EXPECTED**:
   - With default duration mix (60/90/120/150+ min), durations don't tile perfectly
   - At 100% slider, actual utilization is ~93%
   - To get true 100%: set duration bins to [100, 0, 0, 0] (all same duration)

3. **Splitting minimization**:
   - Smart uses greedy coverage (largest free slot first) → minimizes splits
   - Naive uses random coverage → more splits on average
   - Test results: Smart 0.4 splits/day vs Naive 0.4 splits/day with mixed durations at 40 res/day

### Known Behaviors / Open Items

1. **CV > 0% reduces average utilization below target**: Jensen's inequality — demand variance + capacity ceiling = asymmetric utilization loss. This is correct behavior.

2. **Peak hours**: Defined as 5pm-9pm (`PEAK_HOUR_START=17`, `PEAK_HOUR_END=21`) in `src/simulator/types.ts`.

3. **Amber triangle markers on sliders**: May not render on some computers due to display scaling or browser differences. They're 8×6px CSS triangles.

## Useful Commands
```bash
npx tsc --noEmit          # Type check
npx vitest run            # Run all 82 tests
npx vite dev              # Start dev server
```

## Key Defaults (`DEFAULT_SIM_INPUTS`)
- 6 courts, 8am-10pm (14 hrs, 840 min)
- 30 reservations/day (~56% of max 54)
- 11% locked, 60 min minimum, 30 min slot blocks
- Duration bins: [40%, 30%, 20%, 10%] → avg ~93 min
- CV: 15%, 40 iterations, $80/hr, $10/hr lock premium
- `modelPeakTimes: false`, `allowSplitting: false`

## Files Modified This Session
- `src/simulator/SimulatorPage.tsx` — Added disclaimer modal integration
- `src/simulator/components/SimulatorDisclaimerModal.tsx` — NEW: Disclaimer popup
- `src/simulator/components/SimInputPanel.tsx` — Added checkboxes, enhanced demand pressure tooltip
- `src/simulator/components/SimResultsPanel.tsx` — Added 4-way splitting comparison, time period toggle
- `src/simulator/run-simulation.ts` — Added peak time boost, exponential demand scaling, 4-way split tracking
- `src/simulator/types.ts` — Added `modelPeakTimes`, `allowSplitting`, `PEAK_HOUR_*`, `splitting` comparison object
- `src/algorithm/court-assigner.ts` — Added `trySplitReservation()` function
- `src/algorithm/naive-assigner.ts` — Added `naiveTrySplit()` function
- `src/algorithm/types.ts` — Added `isSplit` to AssignedReservation, `allowSplitting` to AssignerConfig
- `src/calculator/components/NumberInput.tsx` — Hidden browser spinners, centered number display

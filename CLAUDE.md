# Booking Algorithm Project Context

## Project Overview
Court booking simulator comparing a "smart" algorithm (First-Fit-Decreasing with scoring and compaction) against a "naive" baseline (random court assignment). Built with React + TypeScript + Vite. The simulator generates random reservation sets, runs both assigners, and reports utilization, gaps, fragmentation, and revenue metrics.

## Key Architecture

### Algorithm (`src/algorithm/`)
- `court-assigner.ts` — Smart assigner: locked-first, then flexible sorted by start time. Scores courts (adjacency, contiguity, gap penalty, fill bonus). Post-assignment compaction pass.
- `naive-assigner.ts` — Naive baseline: locked-first, then flexible with random court ordering. No scoring/compaction.
- `gap-analyzer.ts` — Computes gaps and fragmentation scores.
- `types.ts` — Core types: `Reservation`, `Court`, `AssignmentResult`, `AssignerConfig`, etc.
- `utils.ts` — `findFreeSlots`, `slotsOverlap`, `slotDuration`, etc.

### Simulator (`src/simulator/`)
- `run-simulation.ts` — Core simulation loop: generates reservations, runs both assigners across N iterations, computes aggregate stats. Contains the concurrency tracker and reservation generator.
- `types.ts` — `SimulatorInputs`, `SimulatorResults`, `RunStats`, `DurationBinPcts`, `DEFAULT_SIM_INPUTS`, `computeAvgDuration`, `computeDurationBins`.
- `hooks/useSimulator.ts` — React hook: manages inputs state, computes `maxReservationsPerDay` (based on avg duration), runs simulation on setTimeout.
- `components/SimInputPanel.tsx` — Input controls UI (courts, hours, price, utilization slider, duration bins, etc.).

### Calculator (`src/calculator/`)
- `components/NumberInput.tsx` — Compact number input with `prefix`/`unit` adornment support.
- `components/SliderInput.tsx` — Slider with `renderValue` prop for custom display.

## Current State (as of Jan 2026)

### What Works
- `npx tsc --noEmit` passes
- `npx vitest run` — all 75 tests pass
- Simulation produces accurate utilization with CV=0%:
  - 0% locked: Smart 55.9%, Naive 55.9% (target 56%)
  - 11% locked: Smart 55.8%, Naive 55.5% (target 56%)

### Known Behaviors / Open Items

1. **Naive 0.5pp gap with locked reservations (CV=0, 11% locked)**: The naive assigner's random court ordering causes ~0.2 assignment failures per day. This is by design — it demonstrates the smart algorithm's value. The smart assigner achieves 55.8% (0.2pp from target).

2. **CV > 0% reduces average utilization below target**: With CV=15% (default), average utilization is ~52.6% vs 56% target. This is Jensen's inequality — demand variance + capacity ceiling = asymmetric utilization loss. High-demand days lose reservations to capacity limits; low-demand days can't compensate. This is correct simulation behavior but may confuse users expecting the slider value to match output. Potential fix: adjust reservation count upward when CV>0 to compensate, or improve the UI tooltip to explain.

3. **User reported seeing "naive 54.9% utilization"**: Closest match is CV=5% (naive 54.4%) or CV=0% with 11% locked (naive 55.5%). The exact scenario wasn't pinpointed.

### Recent Changes (this session)

All in `src/simulator/run-simulation.ts`:

1. **Enhanced concurrency tracker** — `canFit` now checks that flexible reservations have at least one court entirely free of locked reservations for their full span. Prevents unassignable precoloring edge cases.

2. **Systematic fallback (Phase 2)** — After 40 random start-time retries fail, scans ALL valid start times from a random offset. Guarantees placement if any valid slot exists.

3. **Retry-until-placed loop** — Generation retries with new random parameters (duration, locked status) until target count is placed, up to 3x attempts. Prevents high-demand days from under-generating.

4. **Naive assigner left as locked-first** — Tried interleaving locked+flexible by start time but it made things worse (flexible reservations took courts needed by later locked ones). Reverted to locked-first approach.

### Approaches Tried and Discarded
- **Per-court occupancy tracker** (replacing concurrency tracker): Committed to specific court assignments during generation. Worse packing than concurrency tracker because it fragments capacity.
- **Load-balanced per-court tracker**: Tried least-loaded-first court ordering. Even worse — spreading evenly is bad for packing density.
- **Interleaved naive assigner**: Processing all reservations in start-time order (locked + flexible together). Caused flexible to steal courts from later locked reservations.

## Useful Commands
```bash
npx tsc --noEmit          # Type check
npx vitest run            # Run all 75 tests
npx tsx verify-util.ts    # Run utilization verification script
npx vite dev              # Start dev server
```

## Key Defaults (`DEFAULT_SIM_INPUTS`)
- 6 courts, 8am-10pm (14 hrs, 840 min)
- 30 reservations/day (~56% of max 54)
- 11% locked, 60 min minimum, 30 min slot blocks
- Duration bins: [40%, 30%, 20%, 10%] → avg ~93 min
- CV: 15%, 40 iterations, $80/hr, $10/hr lock premium

## File: `verify-util.ts` (temporary)
Test script that runs simulation at various configurations and prints utilization results. Can be deleted when no longer needed.

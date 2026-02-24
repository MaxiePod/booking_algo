# Booking Algorithm Project Context

## Versioning (IMPORTANT)

**Current Version: v1.5.6** (defined in `src/App.tsx` as `APP_VERSION`)

**ALWAYS update the version after making changes and tell the user the new version number.**

**Default to PATCH increments:**
- **Patch (x.x.+1)**: DEFAULT for most changes — bug fixes, tweaks, small improvements, refactors
- **Minor (x.+1.0)**: Only when user requests OR for significant new features (ask user if unsure)
- **Major (+1.0.0)**: Only for major overhauls (ask user first)

Location: `src/App.tsx` line 12 → `const APP_VERSION = 'vX.Y.Z';`

The version displays in the top-right corner of the app.

## Deployments (IMPORTANT)

Two branches, two deployments — **always push to both**:
- **`main`** branch → GitHub Pages at `maxiepod.github.io/booking_algo/` (mock auth, base `/booking_algo/`)
- **`v2`** branch → Vercel at `podplay.club` (Firebase auth, base `/`)

**Workflow**: Make changes on `main`, commit, push. Then `git checkout v2 && git cherry-pick <hash> && git push origin v2 && git checkout main`.

The `v2` branch was synced with `main` as of v1.5.5 (previously was behind). Keep them in sync going forward.

## Project Overview

Court booking simulator comparing a "smart" algorithm (First-Fit-Decreasing with scoring and compaction) against a "naive" baseline (random court assignment). Built with React + TypeScript + Vite. The simulator generates random reservation sets, runs both assigners, and reports utilization, gaps, fragmentation, and revenue metrics.

## Key Architecture

### Algorithm (`src/algorithm/`)
- `court-assigner.ts` — Smart assigner: locked-first, then flexible sorted by start time. Scores courts (adjacency, contiguity, gap penalty, fill bonus). Post-assignment compaction pass. Supports splitting via `trySplitReservation()`.
- `naive-assigner.ts` — Naive baseline: locked-first, then flexible with random court ordering. No scoring/compaction. Supports splitting via `naiveTrySplit()`.
- `gap-analyzer.ts` — Computes gaps and fragmentation scores.
- `types.ts` — Core types: `Reservation`, `Court`, `AssignmentResult`, `AssignerConfig`, `AssignedReservation`.
- `utils.ts` — `findFreeSlots`, `slotsOverlap`, `slotDuration`, etc.

### Simulator (`src/simulator/`)
- `run-simulation.ts` — Core simulation loop: generates reservations, runs both assigners across N iterations, computes aggregate stats.
- `types.ts` — `SimulatorInputs`, `SimulatorResults`, `PEAK_HOUR_START/END` constants.
- `hooks/useSimulator.ts` — React hook: manages inputs state, runs simulation on setTimeout.
- `components/SimInputPanel.tsx` — Input controls UI.
- `components/SimResultsPanel.tsx` — Results display with 4-way splitting comparison table.
- `components/AnimatedTimeline.tsx` — Visual timeline animation showing naive→smart optimization.

### Calculator (`src/calculator/`)
- `components/NumberInput.tsx` — Compact number input with `prefix`/`unit` adornment support.
- `components/SliderInput.tsx` — Slider with `renderValue` prop for custom display, default-value triangle markers.

### Auth (`src/auth/`)
- `types.ts` — `AuthUser` (includes `lastLogin?: number`), `AuthService`, `UserRole`, `AuthStep`, `AccessRequest`.
- `AuthContext.tsx` — React context providing `user`, `isAdmin`, `isSuperAdmin`, `service`, `showAuthModal`.
- `firebase-auth-service.ts` — Production auth service (Firebase + API routes).
- `mock-auth-service.ts` — Local dev auth service (localStorage, OTP is always `123456`).
- `session.ts` — Session duration constant, storage helpers.
- `firebase-config.ts` — Firebase client config.
- `components/AdminPanel.tsx` — Admin panel: user list with roles, last login, invite, grant/revoke, promote/demote.
- `components/AuthModal.tsx` — Sign-in modal with email→OTP flow.
- `components/AccountMenu.tsx` — Authenticated user dropdown menu.
- `components/AuthGatedResults.tsx` — Wrapper that gates simulator results behind auth.
- `components/SimulationDisclaimer.tsx` — Legal disclaimer before viewing simulation results.

### API Routes (`api/`) — Vercel serverless functions (v2 branch only)
- `send-otp.ts` — Generate OTP, store in Firestore, send via Resend.
- `verify-otp.ts` — Verify OTP, record `lastLogin` (fire-and-forget), create Firebase custom token.
- `validate-session.ts` — Check Firebase token validity.
- `request-access.ts` — Submit access request (emails admins via Resend).
- `admin/list-authorized.ts` — List all authorized users (includes `lastLogin`).
- `admin/grant-access.ts`, `revoke-access.ts`, `set-role.ts`, `dismiss-request.ts`, `send-invite.ts`, `list-requests.ts`.
- `_lib/firebase-admin.ts` — Firebase Admin SDK init.
- `_lib/auth-middleware.ts` — `requireAdmin()` middleware.
- `_lib/resend.ts` — Resend client init.

## Current State

- `npx tsc --noEmit` passes
- `npx vitest run` — all 87 tests pass
- Dev server: `npx vite dev` → http://localhost:5173/booking_algo/

## Important Behavior Notes

1. **Splitting "additional bookings" is CORRECT**: Same reservations generated regardless of splitting setting. Splitting just allows more to be placed.
2. **100% utilization still shows gaps**: Mixed durations don't tile perfectly. At 100% slider, actual util is ~93%.
3. **CV > 0% reduces avg utilization below target**: Jensen's inequality — correct behavior.
4. **Peak hours**: 5pm-9pm (`PEAK_HOUR_START=17`, `PEAK_HOUR_END=21`).
5. **`lastLogin` in verify-otp must be fire-and-forget**: Using `await` on the Firestore update crashed the login flow. Always use `.catch(() => {})` pattern for non-critical writes in API routes.

## Useful Commands
```bash
npx tsc --noEmit          # Type check
npx vitest run            # Run all 87 tests
npx vite dev              # Start dev server
```

## Key Defaults (`DEFAULT_SIM_INPUTS`)
- 6 courts, 8am-10pm (14 hrs, 840 min)
- 30 reservations/day (~56% of max 54)
- 11% locked, 60 min minimum, 30 min slot blocks
- Duration bins: [40%, 30%, 20%, 10%] → avg ~93 min
- CV: 15%, 40 iterations, $80/hr, $10/hr lock premium

## Version History

### v1.5.6
- Copyright notice in footer ("© 2026 PodPlay Technologies, Inc. All rights reserved.")

### v1.5.5
- **Last login tracking**: `lastLogin` field on `AuthUser`, recorded on OTP verify, shown in Admin Panel
- Visibility rules: super admin sees all, admin sees only regular users
- Relative time formatting (just now, Xm, Xh, Xd, Xmo, Xy ago)
- Synced v2 branch with main (was missing v1.5.1–v1.5.4)

### v1.5.4
- Aligned Sign In button and AccountMenu with version badge (top: 16px)

### v1.5.3
- Sign In button for unauthenticated users

### v1.5.2
- URL routing for tabs (/simulator, /calculator, /admin)

### v1.5.1
- Legal disclaimer modal for simulator access (scroll-to-bottom, "Don't show again" checkbox)

### v1.5.0
- Firebase Auth + Vercel API routes + Resend email OTP
- 3-tier roles: user | admin | super_admin
- AdminPanel with invite, grant/revoke, promote/demote

### v1.3.0
- All fonts set to Roboto Light (300)
- Animation overhaul (court-only moves, phase logic, ghosts)

### v1.2.x
- Simulator disclaimer modal, demand pressure, reservation splitting, peak times

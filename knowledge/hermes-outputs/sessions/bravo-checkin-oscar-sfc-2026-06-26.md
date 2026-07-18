# bravo · checkin-oscar SFC backend — 2026-06-26

## Directive
checkin-oscar loop[10m]: read all OSCAR/SFC chats, complete remaining SFC backend dev,
prove 100% accuracy, build frontend/apps once proven, run exhaustive gauntlet vs all JM parts.

## Reconciliation with the 2026-06-25 FLEET NOTICE
Operator notice: front-end UI design + electron/ios/android shells are now owned by
desktop-app Claude / quebec — backend slots focus on calculation correctness + 100% accuracy.
"A backend defect surfaced THROUGH the frontend is still backend work."
→ My lane this session = backend correctness + wiring every endpoint the frontend consumes
+ the gauntlet. UI/app-shell building deferred to the owning slots (and gated behind
"once 100% proven" anyway). No conflict.

## What I found + fixed (LIVE-VERIFIED)
SYSTEMIC DEFECT: `pre-machine-completeness-gate` (MachineValidationHooks.ts) was false-blocking
**6 of 7** SFC web component endpoints on :3100 — surface-finish, engagement, deflection,
tool-life, power-torque, cycle-time ALL returned `{blocked:"pre-machine-completeness-gate"}`.
(Yesterday's audit only caught 2 of these; the real blast radius was far larger.)

ROOT CAUSE: `calcDispatcher` (line ~1401) and `productDispatcher` fire the ENTIRE
`pre-calculation` hook phase for EVERY action — `HookExecutor.execute` has no per-action
applicability filter. The completeness gate blocks whenever nested `machine.spindle.{max_rpm,power}`
is absent, regardless of whether the action's physics consumes a machine envelope. Pure-physics
calcs (Taylor tool-life, Ra surface-finish, geometric engagement, cantilever deflection, power
DEMAND, cycle-time) need no machine → were all dead.

FIX: extended slot:charlie's `MACHINE_AGNOSTIC_ACTIONS` allow-list (added same day under
U-COST-EST-MACHINE-GATE-SCOPE for `process_cost`) with the 6 SFC component actions + adjacent
pure-physics calcs (28 total). Marker: `U-BRAVO-SFC-COMPONENT-GATE-SCOPE`.

FAIL-CLOSED / NON-WEAKENING (provable):
- it's an ALLOW-list — any unlisted action still blocks (status quo);
- the skip requires BOTH the allow-list AND zero machine context (`machineIntended` false);
- machine-RESOLVING actions (sfc_calculate, speed_feed, sf_orchestrate, spindle_*, power_budget)
  are deliberately EXCLUDED → still block without a machine;
- a listed action with a machine supplied is still validated (power-budget/spindle-limit hooks fire).

## Verification
- Unit: 39/39 MachineValidationHooks.test.ts (added 6 parametrized SFC skip-cases + 3 no-weakening).
- Regression: 18/18 sfcMachineBridge + sfc-product-bridge-roundtrip green.
- Type: my files add zero tsc errors (pre-existing HookExecutor.ts:561 unrelated).
- LIVE on :3100 after esbuild rebuild + daemon restart (PID 75532):
  surface-finish Ra 0.78µm · engagement arc 90° · deflection SF 14.7 · tool-life 7.7min (Taylor) ·
  power-torque 1.25kW · cycle-time 1.5min. No-machine `calculate` STILL blocks; with-machine passes.

## Gauntlet (never-stop) — confirmed REAL, not just alive
`state/shared/sfc-variability-results/{mill,lathe}/chunk-w*.jsonl` — full input vectors
(machine/rigidity/workholding/toolholder/material/ISO/hardness/op/geometry/coolant/objective)
→ full outputs (Vc, rpm, fz, vf, ap/ae, MRR, power, torque, force, life, Ra, deflection, conf).
Frontier ~8.28M mill + ~6.39M lathe ≈ 14.7M combos swept, worker-sharded, guard fires every 5 min.

## Flagged for physics-reviewer (NOT my lane, posted to bus)
Sampled mill chunk idx 8282732: `defl=149.2` (non-physical for 16mm carbide endmill @60mm stickout)
and `Ra=0.01` (implausibly fine for roughing) look like unit/scale anomalies — needs a units audit.

## Cycle 2 — /calculate response-shape drift (committed a87a90d653, U-BRAVO-SFC-CALC-RESPONSE-SHAPE)
prism_product:sfc_calculate returns doubly-nested {action,result:{cutting_speed_m_min, spindle_rpm,
feed_per_tooth_mm, table_feed_mm_min, safety_score,...}} but SfcCalculatorPage / ResultsDisplay /
ComparisonView / CalculationHistory read result.{cutting_speed, spindle_speed, feed_per_tooth,
feed_rate, safety, meta} -> every primary field undefined, ResultsDisplay crashed on .toFixed.
FIX: normalizeSfcCalculateResponse at the HTTP route (routes/sfc.ts) unwraps + maps to the contract;
dispatcher {action,result} shape UNCHANGED (MCP consumers unaffected); {error}/{blocked} pass through.
7 new tests, 64/64 SFC suite green, live-verified (result now carries contract names + safety + meta;
no-machine still passes {blocked}).

## Cycle 3 — audit: AdvancedCharts inlined-Taylor violation ALREADY fixed (QX3)
quebec's 2026-06-20 flag (AdvancedCharts.tsx inlined Taylor {n,C} + client-side life) is already
resolved: constants removed, curve sourced from sfcApi.toolLife via buildToolLifeCurve (N parallel
tool_life calls). My cycle-1 gate-scope fix is what makes that chain WORK — pre-fix every call was
gate-blocked -> empty chart. Verified live: Vc 80/120/160/200/240 -> life 39.1/7.7/2.4/1.0/0.5 min
(monotonic Taylor, correct). Compounding win: one gate fix restored both component panels AND the chart.

## Provenance note
My src landed inside charlie commit 9222e0c2f3 (shared dirty-tree [MAIN-FORCE] model staged the
whole working tree). Code is in HEAD under U-BRAVO-SFC-COMPONENT-GATE-SCOPE; dist is gitignored
and rebuilt locally.

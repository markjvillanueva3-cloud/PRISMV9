# Session — charlie — CostEstimatorPage cost-estimate bridge (2026-06-26)

Commit: `9222e0c2f3` — `[MAIN-FORCE] [QUOTING-WEB-ACCURACY]/U-COST-EST-REQ-BRIDGE (slot:charlie)`
Branch: `cad-fusion-live-ms0` (shared MAIN-FORCE lane). Files: 4 (cost.ts, MachineValidationHooks.ts, +2 tests). No peer absorption.

## What shipped (two coupled fixes)

### Fix A — request bridge (`mcp-server/src/routes/cost.ts`)
- `adaptCostEstimateRequest(body)`: maps the CostEstimatorPage FLAT shape
  `{ material, operation, quantity, setup_time_min?, cycle_time_min?, tool_cost?, machine_rate_per_hour? }`
  → `prism_intelligence:process_cost` schema `{ material, operations:[{feature,process}], batch_size? }`.
- `operation` (process type) → representative job_plan `feature` via `PROCESS_TO_FEATURE`
  (milling→pocket, turning→contour, drilling→hole, grinding→face, edm→slot, multi_operation→pocket; unknown→pocket).
- `quantity` → `batch_size` (positive-int floor; never overrides an explicit batch_size).
- Non-destructive: native `operations[]` body OR no string `operation` → passed through untouched.
- `cycle_time_min` is passed through but the engine IGNORES it (derives cycle from job_plan) — documented, not faked.
- Wired in the route BEFORE the existing redact→adapt response chain (request-side sibling of `adaptCostEstimate`).

### Fix B — machine-completeness gate scope (`mcp-server/src/hooks/MachineValidationHooks.ts`)
- After Fix A closed the Zod gap, the request hit a SECOND blocker: `pre-machine-completeness-gate`
  FALSE-BLOCKED `process_cost` (machine-agnostic cost amortization on a $/hr rate) on BOTH
  `/api/v1/cost/estimate` AND `/api/v1/pipeline/quote` whenever no machine was supplied.
- The sibling `pre-machine-spindle-limits` already WARNS-not-blocks when no machine is present — this gate was the inconsistent outlier (hard-blocked EVERY pre-calculation call carrying no machine).
- FIX = explicit machine-AGNOSTIC action allowlist (`MACHINE_AGNOSTIC_ACTIONS = {process_cost}`): skip the gate ONLY when the action is on the allowlist AND no machine context is present (`machinePackage`/`machine`/`machine_id`/`machineId`/`confidence` all absent).
- NON-WEAKENING: a machine-PHYSICS action (sfc_calculate/job_plan/...) is NOT on the allowlist → no-machine call STILL blocks (oscar's U-OSC-SFC-PRODUCT-BRIDGE contract holds); a SELECTED-but-incomplete machine STILL blocks for ANY action.

## Live verification (:3100, post-restart)
- `/cost/estimate` flat payload, no machine → UNBLOCKED, real result (cycle 0.1, batch 100). Was: `blocked: pre-machine-completeness-gate`.
- `/pipeline/quote` no machine → UNBLOCKED.
- `/sfc/calculate` no machine → STILL blocked (safety preserved).
- `/sfc/calculate` with machine → works (bridge intact).
- `/cost/estimate` with incomplete `machine.spindle:{}` → STILL blocked.

## Tests — 82 pass across my surface
cost-estimate-request-bridge (9 NEW) · cost-route-contract (5) · cost-route-redaction (20) · MachineValidationHooks (28, +3: machine-physics-still-blocks, process_cost-with-incomplete-machine-still-blocks, no-machine-agnostic-skip) · sfc-product-bridge-roundtrip (3) · sfcMachineBridge (15).

## Known pre-existing (NOT mine)
`ck-pipeline-wiring.test.ts` has 14 EDM failures (`EDMProgramAssemblerEngine.assembleWireEDM` returns `{success:false}`) — that engine last modified 2026-06-22, untouched by me, does not import any of my files.

## Open threads / follow-ups
- `cycle_time_min` from the page is not honored by `process_cost` (engine derives it). A cycle-time-honoring path would need a different action — out of scope here, flag for a future quoting unit if the page needs to surface the user's entered cycle time.
- Anon callers get the cost basis redacted (secure-by-default) — the engine RUNS but per-part cost is stripped unless authed. The page shows an empty cost panel for anon. Confirm that's the intended UX or wire an auth path for the estimator.
- The machine-agnostic allowlist currently holds only `process_cost`. If other genuinely machine-agnostic intelligence/product actions surface the same false-block, add them to `MACHINE_AGNOSTIC_ACTIONS` (never add a physics action).

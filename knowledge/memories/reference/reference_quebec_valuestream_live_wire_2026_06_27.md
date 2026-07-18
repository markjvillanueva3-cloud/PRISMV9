---
name: reference_quebec_valuestream_live_wire_2026_06_27
description: "Quebec iter-2: ValueStreamPage wired to live prism_business value_stream_map; dead-page audit has nav-state false-positives; shared-tree pathspec-commit lesson."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.139Z
aliases: reference_quebec_valuestream_live_wire_2026_06_27
---


# Quebec - ValueStreamPage live wire (2026-06-27, commit 5f498cb322)

iter-2 of the quebec FE-BE wiring loop (iter-1 = Tool Crib inventory-health, [[reference_quebec_toolcrib_inventory_health_2026_06_27]]).

## What shipped
`mcp-server/web/src/pages/ValueStreamPage.tsx` was a DEAD page (module-level fabricated seed
arrays: PROCESS_STEPS / METRIC_TILES / WASTES). Now wired to the REAL backend:
`getValueStreamData(jobId)` (web/src/api/client.ts:526) -> `GET /api/v1/erp/value-stream/:jobId`
-> `prism_business value_stream_map` -> `ValueStreamMapEngine.build()` (composes JobTravelerEngine
planned/actual per-op times + scrap + MachineDispatchEngine WIP/queue). jobId via `?job=` URL
param + controlled input. Map/Metrics tabs render real `steps`+`totals`; Waste tab derives ONLY
backend-supported NVA (queue wait, setup, scrap, over-plan variance) + surfaces engine `caveats`
-- engine explicitly does NOT compute the qualitative 7 mudas, so nothing is fabricated (R12).
Six honest states: no-job / loading / error / unexpected-payload (fail-loud) / no-traveler
(`data_available:false`) / success. 10/10 render tests (real computed values), tsc clean,
2-arm per-file scrutiny PASS (P2-only).

## Backend contract (reuse for sibling erp wires)
- erp routes return `{ ok:true, data: <payload> }` (NOT the `{result,...}` that `PrismResponse`
  TYPE claims). Unwrap via `(res as any).data ?? (res as any).result` -- canonical sibling is
  `KanbanBoardPage.tsx`. The `client.ts` erp fns (`getValueStreamData`, `getKanbanBoard`,
  `jobDashboard`, `getActiveJobs(employeeId)`) all return this envelope.
- `ValueStreamMap` shape = `ValueStreamMapEngine.ts` exports: `{data_available, job_id, message?,
  steps: VsmStep[], totals: VsmTotals, generated_at, caveats[]}`.

## Dead-page audit has FALSE POSITIVES (refines the queue)
`scripts/audit-page-wiring.mjs` flags 9 dead pages, but it's a CONSERVATIVE "no fetch in page body"
heuristic. **WireEdmResultsPage + MillingResultsPage are NOT real gaps** -- they are terminal
RESULTS views fed by react-router `location.state` from their wizard (which DOES call the backend).
Wiring a redundant useQuery there would conflict with the working wizard->results handoff (R7/R8).
The TRUE quebec-now gaps are pages with module-level mock/seed data + an existing live route.
Remaining dead pages + owners: CADRegenerationDashboard (delta - shape mismatch w/ existing
cadRegression client; needs prism_cad cad_regen_batch), PostProcessor (echo, "coming-soon"),
LatheStudio (whiskey - turning/latheTurning routes exist), MillTurn+Swiss (whiskey - need new
dispatcher action / schema ext, per plan-dead-page-wiring Workflow), MillStudio (foxtrot).

## Design master plan (operator's "plan for EVERYTHING")
`mcp-server/web/design-imports/kienzle-app-build/Kienzle Backend Wiring Map.dc.html` IS the design's
own backend->frontend plan: ~150 endpoints live, 12 Kienzle screens BUILT (wire to live data),
10 domains UI-GAP (build UI over existing endpoints), ~0 net-new endpoints. BUT it is design-time
stale -- most "UI GAP" domains (shop-floor, scheduling, inventory, GL, sales) are ALREADY built+wired
in the live SPA (business-erp 37 wired, shop-floor 12, quoting 17 per PAGE-WIRING-AUDIT). Reconcile
the design map against the live audit before treating any item as a gap. 26 Kienzle .dc.html files
live in that dir; ToolCrib + ValueStream done.

## Shared-tree commit lesson (IMPORTANT)
On the shared `H:/prism` tree the git INDEX is shared across all 26 slots. A `git commit` with NO
pathspec commits the WHOLE staged index -- my first VSM commit absorbed 1807 peer/config files.
FIX: `git reset --soft HEAD~1` then `git commit -m "..." -- <my files>` (pathspec LAST, after -m).
ALWAYS pathspec-commit on the shared tree; the slot worktree `H:/prism-slot-quebec` is the cleaner
lane. Sibling doctrine: [[feedback_commit_to_slot_worktree]].

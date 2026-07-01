---
name: feedback_dispatcher_path_green_not_engine_green
description: "Engine-green ≠ dispatcher-path-green — distrust truthy-guarded dispatcher/orchestrator no-ops; verify the wired path with a real round-trip, not the engine singleton."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.422Z
aliases: feedback_dispatcher_path_green_not_engine_green
---


A passing engine unit test, a resolvable dispatcher action, and a green inventory/grep scan can ALL report a capability as "present" while it exposes **zero capability at runtime**. Two live PRISM examples (found 2026-05-29 by the networking-platform Phase-0 foundation-verification workflow, slot:hotel):

1. **`GeneralLedgerEngine` job-cost accrual** — `QuoteToShipOrchestratorEngine`/`JobLifecycle`/`reactiveChainBootstrap` called `glEngine.recordJobCost(...)`, a method that **did not exist**, behind `if (recordJobCostFn && costReport)` — a truthy-guard that swallowed the missing method as a warning. Costs never accrued into WIP, yet `recordWipToCogs` (the release) *did* fire → WIP driven **negative** (double-entry integrity break). Engine tests passed because they call the engine directly, never the orchestrator/dispatcher path. Fixed in `U-P0-01` (added the accrual recorder).
2. **`VendorEngine`** — its only dispatcher wire (`vendor_manage`) is a cosmetic false-wire: every real payload falls through to `{ note: 'method not callable' }`. `VendorEngine.test.ts` is green (tests the engine), the enum entry exists, the case resolves — but the wired path returns nothing.

**Why:** this is the exact false-confidence class R12 ("fail loud") and the §ENGINE-WIRING round-trip-E2E rule exist to catch. `fn?.() ?? fallback` or `if (maybeFn) {...}` routed from a dispatcher/orchestrator case is a **false-wire smell** — it converts a missing/broken method into a silent no-op instead of a loud failure. A demo "completes the job" and shows an empty ledger.

**How to apply:** before calling any reused engine capability GREEN, invoke it **through the actual dispatcher/orchestrator with a real payload and assert a real result** (not "no throw"). Never trust engine-level green + a resolvable action as proof the wired path works. When adversarially verifying "reuse existing engines" claims, treat *on-disk + unit-tested* as unproven until the round-trip asserts real output. Related: [[feedback_hotel_financial_invariant_gate]] (GL posts must balance both ways), [[feedback_always_update_wiki_on_bug_finding]], [[feedback_always_capture_lessons]]. Also: round each money component to one cent basis before building journal lines — `postEntry` balance-checks raw sums but persists round2-per-line, so unrounded multi-line splits can persist an unbalanced entry.

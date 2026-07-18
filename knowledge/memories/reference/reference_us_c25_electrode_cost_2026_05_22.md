---
name: reference-us-c25-electrode-cost-2026-05-22
description: ARC-MS6/muS-C25 SinkerElectrodeCostEngine shipped+wired+tested (commit 31a8012647) — 4-component electrode cost model (material/milling/setup/burn) wired into prism_edm as sinker_edm_electrode_cost. Charlie iter10 of 20.
aliases: reference_us_c25_electrode_cost_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.231Z
---


**2026-05-22 charlie /loop iter 10.** Shipped ARC-MS6/muS-C25 — `SinkerElectrodeCostEngine` (commit `31a8012647`).

**What it is.** Pure, deterministic electrode cost model for sinker (die-sinking) EDM. Decomposes the electrode-set cost into 4 components per shop quoting practice:
1. **Material** — blank graphite/copper stock across every electrode in the set (blank = net × oversize; default oversize 1.5)
2. **Milling** — CNC time to cut each electrode from its blank (removed/MRR + finish overhead)
3. **Setup** — fixturing + probing per electrode (default 15 min)
4. **Burn** — sinker-EDM time for the cavity (JOB TOTAL — set consumed in one burn, NOT ×count)

Wear is folded in via `num_electrodes` (high wear → more electrodes → fab × n; burn stays job-total). Material/MRR catalog for 5 ElectrodeMaterial values (graphite_fine $1.40/cm³ down to copper $0.13/cm³; CuW 300 mm³/min up to graphite 5500). All cost rates are economic in-file defaults overridable per call — NOT physics constants (correctly NOT in `src/physics/constants.ts`).

**Where it sits.** `mcp-server/src/engines/SinkerElectrodeCostEngine.ts` (~365 lines). Wired into `prism_edm` as action `sinker_edm_electrode_cost` (edmDispatcher.ts enum + lazy-import case + edmActionSchemas.ts Zod schema registered in `EDM_ACTION_SCHEMAS`). 26 tests in `mcp-server/src/__tests__/SinkerElectrodeCostEngine.test.ts` — every numeric expectation is a hand-computed literal (canonical case = $330.50 total; burn-vs-fab delta = $321; copper material = $1.95; override = $37.50; burn pct = 51.44%). Downstream of `SinkerEDMElectrodeGeometryEngine` (gives `electrode_volume_mm3` + `total_electrodes_needed`) and `ElectrodeDesignEngine` (gives `estimated_burn_time_min` + `wear_ratio_pct` + the `ElectrodeMaterial` type).

**Hardening — silent-Infinity-to-$0 closed.** Reviewer B flagged that unbounded numeric inputs could overflow to `Infinity` and `round2/round3` silently coerce to `0`, returning a false $0 cost (R12 fail-loud violation). Fix: `.max()` ceilings on every numeric Zod field — electrode_volume ≤1e9, num_electrodes ≤1000, oversize ≤20, rates ≤1e5, MRR floored at ≥1. Worst-case `total_cost` now ~3.5e16 — well below `Number.MAX_VALUE`. Engine throws `Error("SinkerElectrodeCostEngine: invalid input — <field>: <msg>")` (engine-named, fail-loud), dispatcher propagates not swallows.

**Per-file scrutiny — 9 agents.** Engine 2/2 PASS · wiring (dispatcher + schema) 2/2 PASS · test 2/2 (after FAIL→fix→re-dispatch — Reviewer B caught 6 P1s incl. assumptions-content blindness, isolation not load-bearing, untested third branch guard, self-deriving pct assertion; all fixed) · 3-of-3 end gate arms A/B/C all PASS. **Runtime caught what reviewers missed:** the test substring `"large removed volume"` matched BOTH note texts (the large-removed note AND the copper-tungsten note's natural-language description). Switched to unique marker `"lower-bound estimate"` per note. Lesson: a test that passes reviewer logic-check can still fail at runtime — always re-run after every fix.

**Charlie queue state (after iter 10).** Confirmed phantoms / DONE: P0-U02 Sinker AGI master (iter 6), P0-U03 Laser AGI master (iter 7), P0-U04 Waterjet AGI master (iter 8), muS-D54..D59 (iters 1-2), muS-C19 (`SinkerEDMElectrodeGeometryEngine` complete in `src/__tests__/engines/` — recursively scanned), U-APPW41B (`TaptiteElectrodeMacroBridgeEngine` wired + 2 test files), muS-C25 (THIS iter). **Plausibly-genuine remaining**: muS-C22 rougher/finisher pairing (naming-convention parser — concrete, bounded), muS-C24 electrode-to-cavity traceability (needs corpus linking — heavier), muS-C19's classifier interpretation (6-shape geometry classifier). **Not-buildable**: P0-U01 premature validate-unit; U-AITRAIN-WIRE-ELECTRODE-DEEP-LEARNING heavy corpus training; muS-C01 archive census needs 4058-file corpus.

**Why:** The next cron fire should look at muS-C22 first — a naming-convention parser is the most concrete + bounded of the remaining set, follows the same single-engine + wiring + test pattern just shipped 4×, and doesn't require corpus harvesting. Each ship iteration costs ~9 agents — at YELLOW context (51%+) plan one more, then checkpoint.
**How to apply:** When the cron next fires and ctx is fresh: `node .claude/helpers/priority-queue.mjs --pick --slot charlie` → if it surfaces muS-C22, run `duplicationGuardEngine.mustCheckBeforeCreating()` for an electrode-pairing/naming-parser engine first (there are 10+ existing electrode engines; dedup carefully), then engine + wiring + 26-test suite + per-file scrutiny + 3-of-3. If muS-C22 also turns out to be a phantom (some Electrode*Engine already covers naming-convention pairing), then the cleanly-buildable charlie set is genuinely exhausted and the loop has achieved the user's "complete all remaining" intent for the bounded-build-and-wire mode. Related: [[reference_arc_ms10_closeout_debt_2026_05_22]] · [[feedback_engine_tests_in_tests_dir]] · [[feedback_parallel_scrutiny_per_file]].

---
session: claude-efd1e0c2
topic: oscar-sfc-tsx-reexec
slot: oscar
written_at: 2026-06-25T00:45:00.000Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: efd1e0c2-2259-4fc4-b09d-8c6af113ed16
status: active
---

# HANDOFF: claude-efd1e0c2 (slot:oscar) -- SFC backend/accuracy + frontend

## STATE
Goal: /loop /goal -- complete remaining oscar/SFC backend dev + improve SFC + finish the SFC web
frontend + exhaustive accuracy testing vs JM parts. Loop iter 4/20.

**SHIPPED this session (4 units, 5 commits, all scrutinized + tested):**
- `U-SFC-TSX-REEXEC` (`b594766c60`) + `U-SFC-TSX-REEXEC-P2`: shared `scripts/lib/tsx-reexec-guard.mjs`
  (build-once, all-galaxy) + fixed bare-`node` `ERR_MODULE_NOT_FOUND` in all 4 SFC sweep scripts
  (the Stop 3-of-3 caught the 4th, sfc-convergence-diff, which my static-only grep missed). 16/16+18/18
  tests. Memory: [[reference_oscar_sfc_tsx_reexec_guard_2026_06_25]].
- `U-SFC-PAGE-MACHINE-LIMITS`: SfcCalculatorPage now SENDS the selected machine's spindle limits
  (was discarded -> engine rpm/power clamp never fired for page customers). New pure
  `web/src/components/sfc/buildSfcRequest.ts` + 4 tests.
- `U-SFC-PAGE-DEPTH-WIDTH` (HEAD): TDD-fixed a silent-drop ACCURACY bug -- the page posts `depth`/
  `width` but ProductEngine.sfcCalculate read only `depth_of_cut`/`width_of_cut` (no mapping) ->
  customer depth/width IGNORED (engine used toolDiam*0.5). Added depth/width aliases to all 4
  SFCInput sfc fns. 37/37, no regression. Both page-input bugs: [[reference_oscar_sfc_page_dropped_inputs_2026_06_25]].
  LESSON: a "renders + green logic" frontend can still drop every user input the backend reads
  under a different field name -- there was no end-to-end test that a non-default input changes the output.

## ASSESSMENT (verified live this session -- do not re-derive)
- Backend physics is WELL-CALIBRATED. `node scripts/sfc-full-sweep-compare.mjs` (now bare-node-safe)
  per-ISO PRISM-vs-baseline: **P +6.5%, K 0%, M -2.2%, N -4.7%, S -16.4%, H -10.6%** (M/N/S/H
  conservative=SAFE). The Rec-3 P-group fix `[90,140,185]->[100,160,220]` IS already applied
  (UltimateSpeedFeedEngine.ts:767). HSS +45.8% is the KNOWN outdated-baseline-anchor artifact
  (cnccookbook 24 m/min plain-HSS floor vs modern HSS-Co), NOT a PRISM bug (spec-adjudicated).
- Vendor-parity comparison infra is BUILT + works: `SpeedFeedTriComparatorEngine`,
  `SpeedFeedBaselineComparatorEngine` (18 cells), the 3 sweep scripts, wired into calcDispatcher.
- The orchestrator import is FINE under tsx (combination-sweep ran 102K combos OK); the "(c)
  orchestrator-boot" blocker WAS the bare-node `.mjs`->`.ts` crash, now fixed.

## RESUME -- NEXT UNIT: `optimize_for` goal selection (the BIG conservative-default lever)
The root cause of "appears 33% under catalog" -- the SFC page is pinned to the conservative default
with no way to pick cost/balanced/productivity. Spec `SFC-VS-GWIZARD-HSMADVISOR-2026-06-19.md` s3+s6.
- KEY DIFFERENCE from the page-input fixes just shipped: the customer page calc goes through
  `ProductEngine.sfcCalculate` (via `prism_product:sfc_calculate`), which calls `calculateSpeedFeed`
  (ManufacturingCalculations.ts) and returns a SINGLE recommended Vc/fz -- it does NOT support
  goal selection. The 9-axis orchestrator's `mode` (cost_batch/aggressive_rush) is a SEPARATE engine
  (the sweeps + AdvancedSpeedFeedPanel use it, NOT the focused page). So `optimize_for` for the page
  needs `calculateSpeedFeed`/`sfcCalculate` to become GOAL-AWARE (select cost/balanced/productivity Vc
  within the material band) = a PHYSICS-REVIEWED engine change (physics-reviewer + 3-of-3). Higher
  risk than the alias fixes -- the recent regressions (material-table-divergence, deflection-Vc-lever,
  overpower) show this engine is sensitive. Verify whether calculateSpeedFeed has band data first.
- VERTICAL SLICE: engine goal-aware (+test) -> `types/sfc.ts` (+optimize_for) -> buildSfcRequest.ts
  (pass it) -> a goal `<select>` on SfcCalculatorPage -> test. NOTE: web vitest `fileParallelism:false`
  (slow); run TARGETED files only. Engine tests run under the fast mcp-server vitest.
- oscar OWNS the SFC frontend (de-gated 2026-06-22, [[reference_oscar_sfc_frontend_ownership_2026_06_22]]).

## OTHER OPEN (lower priority)
- Rec 1 (spec s5): regime-matched validation harness -- tag each baseline cell `reference_regime`,
  compare PRISM at the matched goal (honest metric vs the optimistic "best-of-goals 71%"). Backend,
  in-lane, but regime classification has some subjectivity -- report honestly even if worse.
- JM-accuracy pipeline -> `prism_dev` dispatcher action (item d from the JM-accuracy memory).
- Full-suite vitest parallel-worker race (restore parallelism; test-infra, quebec-shared).
- Electron/iOS/Android shells: quebec app-infra; web build already bundles + capacitor synced.

Re-enter: /startup-oscar /loop [10m] /goal (re-reads this handoff + the SFC spec + Obsidian brain).

## RESUME_LOOP

**ACTIVE /loop interrupted by Stop** (injected 2/3 times by stop-force-loop-continue.mjs).

Task: oscar/SFC: backend dev + SFC capability improvements + finish SFC web frontend (codex build) + exhaustive accuracy testing vs JM Die parts
Progress: iter 4 of 20 (**16 remaining**)
Last status: unknown
Last note: (none)

▶ NEXT ACTION: re-invoke `/loop 16 oscar/SFC: backend dev + SFC capability improvements + finish SFC web frontend (codex build) + exhaustive accuracy testing vs JM Die parts` to continue, OR run `node H:/prism/.claude/helpers/loop-state.mjs end --session <sid> --reason "manual-abort"` to abandon.

(This block is injected by the force-loop-continue Stop hook; cap = 3 re-injections per session.)

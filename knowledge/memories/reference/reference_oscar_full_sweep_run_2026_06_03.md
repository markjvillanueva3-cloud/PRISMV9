---
name: oscar-full-sweep-run-2026-06-03
description: "SHIPPED #59 U-OSC9-FULL-SWEEP-RUN (commit 7863f8b723): the closed-loop comparison capstone. runJmFirstSweep (src/sfc/jmFirstSweep.ts) sweeps the JM-purchased-tools cohort TOOL-BOUND through the 4-lane tri-vendor comparator (PRISM vs HSMAdvisor-baseline vs G-Wizard-live vs Traditional). Wired prism_calc:sfc_jm_first_sweep + CLI scripts/run-jm-first-sweep.mts. LIVE: 41209 G-Wizard rows read, all 4 lanes populated."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.241Z
aliases: reference_oscar_full_sweep_run_2026_06_03
---


Commit `7863f8b723` on `slot/oscar`, OSCAR-SFC-9AXIS-MS0 / U-OSC9-FULL-SWEEP-RUN (task #59). The capstone the goal demanded: "all possible logical combinations are ran through all 3 systems with parameters compared."

**Design (R7/R8):** a thin orchestration RUNNER (`src/sfc/jmFirstSweep.ts` — NOT a class engine, so no dup-guard collision with [[reference_oscar_jm_first_cohort_2026_06_02]]'s sibling SpeedFeedExhaustiveCombinationEngine). `runJmFirstSweep()` is PURE; `archiveJmFirstSweep()` isolates fs writes to its OWN `state/outcomes/jm_first_sweep.jsonl` (R8: never clobbers the exhaustive engine's `exhaustive_sfc.jsonl` — different cell shape would corrupt system-viz node ingestion).

**TOOL-BOUND, not cartesian (the R7 reconciliation):** the goal wants BOTH "utilize JM tooling FIRST" (real tools) AND "all combinations" (cartesian). A naïve cartesian fabricates non-JM tools (0.5" body × 1 flute). Resolution: sweep the BOUND cohort first (each real tool × 6 ISO materials × cut-type axis via per-tool SINGLETON axes through the comparator); the open cartesian space is the later BASELINE-EXPAND phase. Per-tool singleton axes keep each comparator call to 6×|cut_types| cells.

**Surfaces:** `runJmFirstSweep(opts)` → report with by_verdict, vendor_coverage, **prism_posture** (PRISM-vs-vendor absolute-Vc direction — feeds the tuning thrust), vc_divergence percentiles, top-K divergent, per_tool_errors (fail-soft), full ledger_cells. Wired `prism_calc:sfc_jm_first_sweep` (dispatcher strips bulky ledger_cells, returns ledger_cell_count + archive paths) + operator CLI `scripts/run-jm-first-sweep.mts`.

**LIVE PROOF (R12 end-to-end):** `npx tsx scripts/run-jm-first-sweep.mts --max-tools 3 --cut-types roughing` read **41,209 G-Wizard rows** from the launched desktop app's toolcrib; all 4 lanes populated; PRISM more aggressive than Traditional in 18/18 (handbook is conservative — expected); baseline diverged ~36%. 13/13 tests (real cohort+comparator, material-aware N>P survives sweep, verdict-sum conservation, idempotent archive). tsc 0. per-file scrutiny 2/2 PASS.

**Surfaced the #60 bug:** the live run showed gwizard_computed=18 yet posture cells_compared=0 — matched G-Wizard tools had sfm=0 (geometry-only toolcrib rows). Led to [[reference_oscar_gwizard_zero_sfm_honest_2026_06_03]]. Relates to [[reference_oscar_quad_lane_comparator_2026_06_02]].

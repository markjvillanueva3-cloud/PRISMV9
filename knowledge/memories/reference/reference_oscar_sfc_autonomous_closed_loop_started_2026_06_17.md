---
name: reference_oscar_sfc_autonomous_closed_loop_started_2026_06_17
description: SFC closed-loop comparison NOW RUNNING AUTONOMOUSLY (cron enabled) + vendor comparison expanded 3->8 top brands; honest speedup/GPU verdict
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.695Z
aliases: reference_oscar_sfc_autonomous_closed_loop_started_2026_06_17
---


SFC closed-loop comparison + calculation-validation is now **running autonomously** (2026-06-17, slot:oscar). Operator: "use harnessed loops and crons to run autonomously to finally start the closed loop comparison ... find ways to speed up ... utilize gpu/cpu to the max ... prioritize top brands first."

**"Finally start" = the cron was DISABLED.** `PRISM SFC Closed Loop` scheduled task (daily, `node scripts/sfc-closed-loop-cron.mjs`) existed but was **Disabled** — built ("complete" per prior memories) but never running. **ENABLED it** (State: Ready, next run ~02:17 daily). Validated end-to-end manually: `DONE ok=true`, 9 stages green in ~3-4 min: loop-integrity PASS -> sweep (20.3M complete) -> aggregate (128s, folds 20.3M cells) -> triage -> calib-sync -> **catalog-compare (the vendor comparison)** -> per-machine-rollup (59s, 19.6M rows) -> covering-array.

**Architecture (honest):** the 20.3M-cell combinatorial sweep abstains `uncited` (tool-agnostic -> no tool identity -> can't cite a vendor), so the VENDOR/BRAND comparison lives in the **`sfc-catalog-compare.mjs`** stage (the CITED path): PRISM (fast_bulk) vs real OEM milling catalog vc/fz ranges. `vendor_corroborated=0` is BY DESIGN + honest — a single tool-agnostic PRISM point can't sit inside the wide spread of tool-specific OEM ranges (conservative gate, never softened); it's a per-regime DIAGNOSTIC (`state/sfc-catalog-compare/bias-report.md`), not auto-calibration.

**Top-brand expansion (3 -> 8 brands)** — commit `c65611e458` (+ `999389f184` prose-fix). `allCatalogRows()` was Seco/Kennametal/ISCAR (395 rows); added **Helical, OSG, Sumitomo, Niagara, Horn** -> 743 rows / 2229 cited cells. UNITS-SAFE (the oscar refuse_list rail): every added export is verified MILLING-only (vc m/min, fz mm/tooth). Helical = milling-only brand; Niagara(`NIAGARA_ENDMILL_MAP`)/Horn(`HORN_MILL_MAP`) already milling-only (**the catalog-compare doc's "bundled drill+turn+mill" note was STALE — read the export shape, not the comment**); OSG+Sumitomo genuinely mixed -> added `OSG_MILL_SPEED_FEED` (AE/WXL/PHX) + `SUMITOMO_MILL_SPEED_FEED` (ENDMILL+MILL) milling-only sub-exports. Still excluded: Guhring (bundled), Dormer (drill-only). Validated by numbers (R12): divergent proportion held 43%->45% (a drill mm/rev leak would have spiked it) + 0 errors. 15/15 catalog-compare tests (new R9: each of 8 brands MUST be present). 3-of-3 PASS.

**Speedup / GPU — HONEST verdict (operator asked "if we can speed it up"):** the comparison is ALREADY fast — catalog-compare = 1s for 2229 cells via `fast_bulk` (~0.06 ms/cell, ~40,000x vs the 2.5s full calc, `UltimateSpeedFeedEngine.ts:3223` also skips the outcome-capture there). The slow stages (aggregate 128s, per-machine-rollup 59s) are **streaming O(1)-memory I/O reduces over 20M+ rows — NOT compute-bound**, so neither GPU nor more cores help them. The SFC physics is scalar per-cell JS; **GPU is NOT a worthwhile lever** (would need a full Kienzle/Taylor CUDA/torch kernel port for a workload already fast + then I/O-bound). CPU is already parallelized (per-machine worker pool @ physical-core concurrency + batch fork pool). Do not fake GPU usage for this pipeline.

Top milling brands with NO repo data (cannot compare yet): Sandvik, Walter, Mitsubishi. Available top-brand set is the 8 now wired. See [[reference_oscar_sfc_per_machine_core_complete_2026_06_17]] · [[feedback_read_full_content_not_titles]] · [[feedback_sfc_test_every_variation_per_machine]].

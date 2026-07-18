# speed-feed session efd1e0c2 (2026-06-25, 54.3MB, spine 256KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- U‑SFC‑TSX‑REEXEC – added shared `tsx-reexec-guard.mjs`; fixed bare‑node crash in 4 sweep scripts (`sfc-full-sweep-compare`, `sfc-all-axis-sweep`, `sfc-parallel-combo-sweep`).  
- U‑SFC‑TSX‑REEXP‑P2 – guard for missing `sfc-convergence-diff.mjs`.  
- U‑SFC‑PAGE‑MACHINE‑LIMITS – wired spindle `max_rpm`/`power_kw` from UI into backend request.  
- U‑SFC‑PAGE‑DEPTH‑WIDTH – mapped page `depth`/`width` to engine `depth_of_cut`/`width_of_cut`.  
- ProductEngine.test.ts – 13 reference-value tests; cleared untested-engine gate.  
- optimize_for engine core – added cost/balanced/productivity goal scaling in `ProductEngine.sfcCalculate`.  
- optimize_for request‑layer – forwarded `optimize_for` through `/api/v1/sfc/calculate`.  
- optimize_for page UI – added `<select>` for goal selection.  
- JM‑proven extraction activation – extracted 94 K samples; guard added.  
- JM trust/override classifier report – built `sfc-jm-proven-report.mjs` and test.  
- Commit e877a6956d – R12 correction proving aluminum ISO‑N Vc under‑prediction was a cap artifact (wiki lesson).  
- Commit 56648c0fd1 – added `cutting_speed_uncapped`, `rpm_capped` to `UltimateSpeedFeedEngine`; updated comparator/report.  
- Commit 511b9f89be – fixed rigidity scaling to re‑apply RPM cap (`spindle_rpm ≤ machine_max_rpm`).  
- Commit d405d1bb19 – updated `prism_vs_consensus` to use uncapped Vc for capped cells.  
- Commit c0bdb0e423 – PROVEN‑SFM‑DIAGNOSTIC (pure helper + units flag).  
- Commit 7de7f110e1 – TEST15‑ALU‑COVERAGE (fixed pre‑existing sanity test).  
- Commit ad8dee9a93 – Task #12 resolution: severity correction, proven‑blend consumer made units‑aware.  
- Commit bcd9a6e858 – Feed verdict aggregate added to `summarizeDivergence`.  
- Commit 2dea43bb33 – `--dataset` JSONL export for India LoRA/GNN.  
- Commit 74abff859f – Feed verdicts wired into divergence report (CSS + feed).  
- Commit 3bd4ecc4ad – Added `fz` to sweep ledger schema (India training dataset now includes feed).

**DECISIONS**  
- Adopt tsx-reexec guard for .mjs scripts; safe under bare‑node.  
- Expose spindle `max_rpm`/`power_kw` from UI; enforce rpm clamp.  
- Map page `depth`/`width` → engine `depth_of_cut`/`width_of_cut`; prevent silent drop.  
- Add 13 reference-value tests; clear untested‑engine gate.  
- Implement `optimize_for` goal scaling (cost/balanced/productivity) in engine, request layer, and UI via `SFC_GOAL_SCALERS`.  
- Activate dormant JM proven extraction pipeline; guard for bare‑node safety; classify sets into trust/override by confidence threshold.  
- Add uncapped Vc/rpm fields to `UltimateSpeedFeedEngine`; keep existing numbers additive.  
- Re‑apply RPM cap after rigidity scaling (`spindle_rpm ≤ machine_max_rpm`).  
- Update `prism_vs_consensus` to use uncapped Vc for capped cells, preserving calibration accuracy.  
- Keep proven‑blend consumer units‑aware; mitigate 3.28× SFM conversion error via guard; extract pure helper for unit testing.  
- Add `fz` field to sweep ledger schema for India training dataset.

**OPERATOR DIRECTIVES**  
- Continue oscar/SFC autonomous loop; never idle.  
- Prioritize finishing in-flight work, improving SFC capabilities, wiring `optimize_for` goal selector through request/UI.  
- Build front‑end UI for the SFC web app.  
- Run exhaustive testing of all logical input/cutting‑parameter combinations against all JM die parts and programs.  
- Feed sweep dataset to India LoRA/GNN; expand sweep data for model training.

**FINDINGS/BUGS**  
- Bare‑node crash from `.js` specifier importing `.ts` engines in `.mjs`; fixed with tsx-reexec guard.  
- Silent drop of `depth`/`width` inputs due to mismatched field names; mapped page → engine fields.  
- Missing spindle limits (`max_rpm`/`power_kw`) from UI; now wired into backend request.  
- ProductEngine lacked reference tests; added 13 cases, cleared untested-engine gate.  
- JM proven extraction pipeline dormant; extracted 94 K samples (17 high‑confidence, 33 variable).  
- Okuma parser produced ~48% unknown operations; needs improvement.  
- SFM→m/min units bug in proven-store `cssSpeed` caused 3.28× overestimation; mitigated by proven‑blend guard and unit-aware consumer.  
- Aluminum ISO‑N Vc under‑prediction (226 vs 775) was a cap artifact, not physics error.  
- Rigidity scaling after RPM cap could exceed machine max rpm; fixed by re‑applying RPM cap.  
- Tool_steel→H modeling error identified by reviewer.  
- Pre‑existing failing sanity test unrelated to recent changes.  
- Fz divergence +124.7% vs G‑Wizard is a mode‑aggregation artifact, not physics bug.

**DOMAIN SPECIFICS**  
- Engines/Actions: `ProductEngine.sfcCalculate`, `UltimateSpeedFeedEngine` (cutting_speed_uncapped, rpm_capped), `SpeedFeedNineAxisOrchestratorEngine`, `SpeedFeedTriComparatorEngine`, `ProvenSpeedFeedAggregatorEngine`, `SpeedFeedOrchestratorEngine`.  
- Dispatchers: `callTool("prism_product","sfc_calculate")` in `src/routes/sfc.ts`; `productDispatcher` with `.passthrough()` schema.  
- Metrics/Paths: Vc, MRR, tool life, rpm clamp, power_kw, depth_of_cut, width_of_cut, cutting_speed_uncapped, rpm_capped, vc_uncapped_mpm, fz (feed), gwizard_published_fz_delta_pct.  
- Key files: `src/routes/sfc.ts`, `types/sfc.ts`, `buildSfcRequest.ts`, `SfcCalculatorPage.tsx`; sweep scripts (`sfc-full-sweep-compare.mjs`, `sfc-all-axis-sweep.mjs`, `sfc-parallel-combo-sweep.mjs`); JM extraction (`extract-jm-proven-speedfeed.mjs`, `sfc-closed-loop-compare.mjs`); engines (`SpeedFeedOrchestratorEngine.ts`, `ProvenSpeedFeedAggregatorEngine.ts`).  
- Pure helper for proven‑blend logic extracted; dataset export script (`--dataset` JSONL); sweep ledger schema now includes `prism_fz_mm`, `gwizard_published_fz_delta_pct`.

**TOOLS USED**  
- `tsx-reexec-guard.mjs`; `chat-slots.mjs`; `/checkin` pipeline (.claude/commands/checkin.md).  
- Dispatchers: `productDispatcher`, `callTool`.  
- Testing: `vitest`, `node:test`.  
- Hooks: `security_reminder`, `ascii-guard`, `git-lock-sweep`.  
- Env vars: `PRISM_TSX_REEXEC`, `PRISM_TSX_NO_REEXEC`.  
- PRISM physics-reviewer, reviewer; `buildDivergenceRows`; `cssUnit` flag; `resolveCssUnit` helper.  
- Cron job `f7bfbc21`; handoff files; memory updates; wiki lesson generation scripts.  
- Pure helper extraction script; dataset export script; ledger generation patch.  
- Test harnesses: R9 tests, per‑file 2-arm scrutiny.

**OPEN THREADS**  
- PRISM‑vs‑JM physics divergence report (canonical turning speeds vs JM proven data).  
- Improve Okuma parser to reduce ~48% unknown operations.  
- Mill `.nc` proven extractor on 119 K programs.  
- Feed 94 K JM samples to India LoRA/GNN; expand sweep dataset for model training.  
- Task #12: Fix SFM units bug in `ProvenSpeedFeedAggregatorEngine` (source conversion).  
- Full‑mode sweep (~69 K cells) and feed into India’s LoRA/GNN.  
- Summary‑fz‑by‑mode split pending.  
- Front‑end build, Electron/iOS/Android app, exhaustive testing of all logical combinations.

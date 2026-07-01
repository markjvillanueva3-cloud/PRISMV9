---
session: claude-efd1e0c2
topic: oscar-sfc-optimize-for
slot: oscar
written_at: 2026-06-25T03:10:00.000Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: efd1e0c2-2259-4fc4-b09d-8c6af113ed16
status: active
---

# HANDOFF: claude-efd1e0c2 (slot:oscar) -- SFC backend/accuracy + frontend + optimize_for

## STATE
Goal: /loop /goal -- oscar/SFC: backend dev + SFC capability improvements + finish SFC web
frontend + exhaustive accuracy testing vs ALL JM Die parts. Loop COMPLETE 20/20 (16 units shipped + 3 root-cause/verify investigations).
TWO TOP ACCURACY FOLLOW-UPS (both root-caused, fresh-context physics fixes):
(A) the CRITICAL SFM units source-fix in the AGGREGATOR (whiskey) -- RESUME 0b (aggregateLatheData:215 + export lazy-load).
(B) **NEW iter-18: aluminum (ISO N) Vc UNDER-predicts 3.5x** -- the vendor-parity run showed PRISM N 226 vs
    baseline 775. Root-caused: `CANONICAL_MILLING_SPEEDS.N` is CORRECT (500/800) + the comparator passes
    iso_group=N (`buildNineAxisInput:330`), but `SpeedFeedNineAxisOrchestratorEngine` returns the legacy
    material-blind 226 (~P-steel) instead of honoring the canonical N speed. Fix is in the 9-axis orchestrator's
    Vc model (the page's `ProductEngine.sfcCalculate` likely OK -- it uses the material-aware ISO path). This
    orchestrator is where this session's prior regressions clustered -- physics-review mandatory.
    Memory [[reference_oscar_sfc_vendor_parity_run_2026_06_25]]. Also: vendor cribs (HSMAdvisor const-200.6,
    G-Wizard picks a drill) need material-matched tool selection before they yield real parity numbers.
OVERNIGHT: durable cron `f7bfbc21` (every 15m :06/:21/:36/:51) re-fires this loop when idle.
Operator wants continuous autonomous work tonight; never idle (NEVER-IDLE-ALWAYS-HUNT).

## SHIPPED this session (7 units, all scrutinized + tested)
1. `U-SFC-TSX-REEXEC` (+P2): shared `mcp-server/scripts/lib/tsx-reexec-guard.mjs` + fixed
   bare-`node` ERR_MODULE_NOT_FOUND in all 4 SFC sweep scripts. [[reference_oscar_sfc_tsx_reexec_guard_2026_06_25]]
2. `U-SFC-PAGE-MACHINE-LIMITS`: page now SENDS machine spindle limits (was discarded). New
   `web/src/components/sfc/buildSfcRequest.ts`.
3. `U-SFC-PAGE-DEPTH-WIDTH`: TDD-fixed silent-drop -- engine read only depth_of_cut/width_of_cut,
   page posts depth/width. Added aliases to all 4 SFCInput fns. [[reference_oscar_sfc_page_dropped_inputs_2026_06_25]]
4. `U-SFC-PRODUCTENGINE-TEST`: new `src/__tests__/ProductEngine.test.ts` -- 13 reference-value
   cases over the full productSFC action surface (cleared stop_on_unwired_assets UNTESTED gate).
5. `U-SFC-OPTIMIZE-FOR-ENGINE`: **the conservatism lever** -- added `optimize_for`
   (cost/balanced/productivity) to ProductEngine.sfcCalculate. SFC_GOAL_SCALERS (product-policy,
   bounded +/-15%, NOT physics constants): cost vc*0.85 / balanced identity / productivity vc*1.15
   fz*1.10. Confined to ProductEngine (NOT shared calculateSpeedFeed -- 54 consumers/12 files).
   LIVE 1045 carbide: cost Vc170/MRR65/life17.3min, balanced Vc200/76/9, prod Vc230/97/5 -- all safe.
   physics-reviewer + reviewer PASS. 17/17.
6. `U-SFC-OPTIMIZE-FOR-REQUEST`: wired optimize_for through the web request layer
   (`web/src/types/sfc.ts` SfcCalculateRequest + buildSfcCalcRequest 5th param). Both scrutiny arms
   traced the full survive-path (route req.body -> sfc_calculate .passthrough() schema ->
   normalizeParams additive -> dispatcher forwards params -> sfcCalculate:772). 6/6 web tests.
7. `U-SFC-OPTIMIZE-FOR-UI`: the cost/balanced/productivity `<select>` on SfcCalculatorPage
   (left input column, 44pt tap target, accessible label, design tokens), passed as the 5th arg
   to buildSfcCalcRequest. Default "balanced" = byte-identical no-op (engine identity-guard).
   2-arm PASS, web tsc-clean. **SLICE COMPLETE: engine -> request -> UI.** Visual screenshot is
   operator-pending (flagged, not claimed). [[reference_oscar_sfc_optimize_for_2026_06_25]]

(Units 5-7 share scope [SFC-OPTIMIZE-FOR]; 1-4 earlier. Count = 8 commits this session.)

8. `U-SFC-JM-PROVEN-TSX-REEXEC`: bare-node/cron-safe the JM proven-speedfeed extractor (tsx guard,
   reviewer PASS) + **ACTIVATED the dormant pipeline**. Live full-corpus run: 16,524 Okuma lathe
   programs -> 94,015 samples -> 50 proven (material x op) configs, 9,633 outliers, 17 high-conf.
   `getProvenParams` is now LIVE fleet-wide. [[reference_oscar_sfc_jm_proven_extracted_2026_06_25]]

(Count = 9 commits this session.)

## RESUME -- NEXT UNITS (JM-proven data is LIVE + classified; pick the highest-value)
iter 10 shipped `U-SFC-JM-PROVEN-REPORT` (`scripts/sfc-jm-proven-report.mjs`, 8/8 tests): classifies
the 50 proven configs -> **TRUST 8 / OVERRIDE 42** at the 0.7 proven-blend gate; 94% of the 94,015
samples are in high-variance OVERRIDE configs. So the "8 trust" set is the trustworthy JM guideline;
the 42 are where PRISM physics must drive. (The store's `highConfidenceCount:17` uses a looser cutoff.)
The JM lathe proven-store is populated (getProvenParams returns real CSS/feed per material x op).
Candidate next units, in rough priority:
0a. **[DONE iter 11+12] divergence report** -- `scripts/sfc-jm-proven-divergence.mjs` (12/12, 2x physics-reviewer
   PASS). Caught + fixed TWO real bugs: tool_steel->H mapping (iter 11) + the SFM-vs-m/min units bug (iter 12).
   CORRECTED LIVE: all 14 comparable configs CONSERVATIVE (JM runs slow, 61-213 m/min vs 220-320 P band).
0b. **[CRITICAL -- TOP NEXT UNIT, UNITS-FIRST SAFETY] the JM proven-store css is SFM, stored UNLABELED.**
   Confirmed (iter 12): OkumaOSPParserEngine G96 field is "(SFM)", ProvenSpeedFeedAggregatorEngine copies it
   RAW (no conversion); proof = max G96 S=3000 (=914 m/min as SFM, impossible as m/min) + 0/16,558 use G21.
   **DANGER:** if the orchestrator proven-blend (SpeedFeedOrchestratorEngine, conf>=0.7) is ever enabled, it
   reads the SFM css as m/min -> recommends **3.28x too FAST** (the dangerous direction -- a 25.4x/3.28x-class
   units bug). DANGER CONFIRMED (R8): `SpeedFeedOrchestratorEngine.ts:2708-2720` reads `proven.cssSpeed.value`
   as `provenVc` and blends `Vc = Vc*(1-w) + provenVc*w` (m/min) -- SFM css -> 3.28x too-fast Vc.
   **FIX LOCATION (iter-13 investigation -- the EXTRACTOR approach is a PROVEN NO-OP, do NOT retry it):**
   I tried converting the rows in `extract-jm-proven-speedfeed.mjs` before `aggregateLatheData` -- the rows
   DO convert (cssSpeed 200->60.96), but `exportForSpeedFeedOrchestrator()` STILL returns the unconverted
   150 (proven by a tsx isolation test). So the store's css (sourced from `exported`, buildProvenStore:123)
   does NOT reflect a fresh aggregateLatheData -- the export path reads `this.provenParams` skeleton / a
   lazy-loaded persisted store, NOT the freshly-computed `samples` stats. REVERTED cleanly (store back to
   honest SFM, no false stamp). **THE REAL FIX IS IN THE AGGREGATOR (whiskey's ProvenSpeedFeedAggregatorEngine):**
   (a) convert css at INGESTION -- `aggregateLatheData` line ~215 `addSample(samples, ${key}:css, entry.cssSpeed * 0.3048)`
   (lathe path only; aggregateMillData line ~250 is separate, mill-safe); (b) FIX the export so it reflects
   the fresh aggregation (investigate why `exportForSpeedFeedOrchestrator` returns stale/lazy-loaded css --
   likely it reads `this.provenParams` not the computeStatistics output, OR lazy-loads the disk store; DELETE
   the store file before regen to avoid the lazy-load override); (c) re-run `--resume` (fast, reuses the 94K
   SFM ledger -- NO re-mining). Verify the store css drops 3.28x (alloy_steel/parting 150->46). Then stamp
   `cssUnit:"m_min"` + make the divergence read store.cssUnit (drop the --css-unit band-aid). FEED units
   (~0.0015 ipr-vs-mm/rev) still ambiguous -- verify separately, never guess (a wrong feed conversion over-feeds).
   [[reference_oscar_sfc_jm_divergence_2026_06_25]] LESSON 3.

1. **[SUPERSEDED -- built above]** PRISM-vs-JM-proven divergence report -- DE-RISKED, one-pass build:
   - PRISM turning Vc source EXISTS: `CANONICAL_TURNING_SPEEDS[iso].{rough,finish}` (constants.ts:1215,
     m/min) + `CANONICAL_TURNING_FEEDS[iso]` (1224, mm/rev). css IS a surface speed -> compare directly.
   - materialGroup->ISO: the proven store's 7 groups ALL map via `_MATERIAL_KEYWORD_TO_ISO`
     (constants.ts:940, PRIVATE -- check for an exported resolver e.g. groupToISO/getISOGroup, else
     replicate the 7 entries with a citation): carbon_steel/alloy_steel->P, stainless->M, aluminum->N,
     inconel->S, tool_steel/tungsten_carbide->H.
   - op->band: od_roughing/id_roughing->rough; od_finishing/id_finishing->finish; the rest
     (facing/parting/grooving/drilling/threading/boring/center_drilling/unknown) -> compare vs the
     [rough,finish] band (inside=agree). feed compare: JM feed/rev vs CANONICAL_TURNING_FEEDS.
   - COMPARE per config: JM-proven CSS vs PRISM band -> flag JM below rough (over-conservative) or above
     finish (potentially aggressive/unsafe); weight by the trust/override class (the report's 8 trust
     configs are the meaningful comparison; the 42 override are where PRISM overrides anyway).
   - BUILD: a .mjs script (ADD the tsx guard -- it imports .ts constants) OR fold into the report script;
     pure comparison helpers + tests; **physics-reviewer REQUIRED** (it compares physics recommendations).
   - Honest caveat: CANONICAL_TURNING_SPEEDS is a canonical band, not material-specific within a group;
     report the band comparison, do not over-claim per-material precision.
2. **Op-classifier fix** (the 48%-unknown lever): OkumaOSPParserEngine classifies op=unknown on 44,847/
   94,015 samples -> improving it yields more/deeper proven configs (50 -> 80+). Biggest data lever.
3. **MILL .nc proven extractor**: 119,255 .nc files (Haas/Hurco/Fanuc) are NOT covered by the Okuma
   lathe parser -- clone the proven pipeline for mill G-code (the bulk of "ALL JM programs").
4. **Feed the 94K-sample dataset to india LoRA/GNN** (task #3).
5. Orchestrator-LOAD the proven-store in production (operator-gated -- changes live UI numbers where
   conf>=0.7; pair with SFC convergence sign-off).
6. optimize_for P2: record optimizeFor into CalcSnapshot (history/comparison disambiguation).
All except #5 are no-visual-gate, overnight-friendly. Each: eval-gate + 2-arm scrutiny.

## OTHER OPEN (high operator priority -- good overnight/no-visual-gate work)
- **JM-PARTS ACCURACY (operator headline): "utilize ALL JM die parts and programs FIRST to run full
  live tests... amateur programs = guideline to test against."** The sweep scripts are now
  bare-node-safe (unit 1). Build/run a harness that loads JM Die part programs (`H:/PRISM/JM DIE/`),
  extracts their speeds/feeds/params, runs them through the SFC engine, and reports
  PRISM-vs-JM divergence (per-part). Check existing first: `sfc-jm-fleet-page-closed-loop.test.ts`,
  `sfc-jm-fleet-closed-loop.test.ts`, the JM-accuracy memory, [[sfc-jm-program-accuracy-methodology]].
  Feed the dataset to india LoRA/GNN (task #3). LONG-RUNNING -> ideal overnight.
- Vendor-parity sweep PRISM vs HSMAdvisor/G-Wizard (task #2; infra exists, run it).
- Full-suite vitest parallel-worker race (task #4; test-infra).
- Electron/iOS/Android shells (quebec app-infra; web build bundles + capacitor synced).

## ENV / GOTCHAS
- 5h SESSION LIMIT: when it fires the WHOLE fleet blocks until manual recovery. Auto account-switch
  NOT armed (operator-only: `node scripts/arm-account-switch.mjs --auto` once accounts green).
- Git index.lock contention from peers is frequent on the shared tree -- wait then clear if >45s stale
  (no live commit). Commit prefix `[MAIN-FORCE] [SCOPE]/U-ID (slot:oscar)` on the shared tree.
- close-out audit script needs `--max-old-space-size=8192` (V8 string-cap on the large graph).
- ProductEngine.ts line 848 has a PRE-EXISTING em-dash (not my diff) -- leave it (out of scope).

Re-enter (FRESH SESSION ONLY): /startup-oscar, then read RESUME items 0b + B for the two queued accuracy follow-ups.

## RESUME_LOOP

**LOOP COMPLETE -- the oscar/SFC /goal reached its 20/20 target and was ENDED (loop-state status: ended).
Do NOT re-continue this loop.** The "ACTIVE /loop interrupted" text that previously sat here was a stale
force-loop injection from iter 8; the loop is finished. The two real remaining units (SFM-aggregator
units-fix, aluminum-N orchestrator Vc) are FRESH-SESSION work -- see RESUME items 0b + B above. Overnight
continuation runs through the durable cron `f7bfbc21` (new /loop sessions with clean context).

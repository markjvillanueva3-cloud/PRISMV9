---
name: reference_oscar_sfc_jm_proven_extracted_2026_06_25
description: "JM-Die proven-speedfeed pipeline ACTIVATED at corpus scale (slot:oscar, 2026-06-25): 16,524 Okuma lathe programs -> 94,015 samples -> 50 proven (material x op) configs, 17 high-confidence. The operator's 'use ALL JM parts as the guideline to test against' data is now extracted + queryable. U-SFC-JM-PROVEN-TSX-REEXEC."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.707Z
aliases: reference_oscar_sfc_jm_proven_extracted_2026_06_25
---


**JM-Die proven-speedfeed pipeline ACTIVATED at corpus scale (slot:oscar, 2026-06-25).** The operator's
headline directive -- "utilize ALL JM die parts and programs FIRST to run full live tests... amateur
programs = the GUIDELINE to test against" -- mapped to the DORMANT `extract-jm-proven-speedfeed.mjs`
pipeline (built [[reference_oscar_sfc_proven_activated_2026_06_22]] but its store was absent -- never run
to persistence). Two blockers fixed + the corpus mined.

**Fix (U-SFC-JM-PROVEN-TSX-REEXEC).** The extractor dynamic-imports `.ts` engines (OkumaOSPParserEngine,
ProvenSpeedFeedAggregatorEngine) but had NO tsx-reexec guard -- a bare `node` launch (overnight cron /
scheduled task) crashes ERR_MODULE_NOT_FOUND (same class as [[reference_oscar_sfc_tsx_reexec_guard_2026_06_25]]).
Added the shared guard inside `main()` (NOT module-top, so test-imports of the pure helpers stay
side-effect-free -- the sfc-convergence-diff precedent). Reviewer PASS. Bare `node ... --sample 50` then
ran to exit 0 (was crashing).

**Corpus result (LIVE, full run, now bare-node-safe).** `H:/PRISM/JM DIE/CNC LATHE` = **16,558 .MIN**
files (NOT 34,993 -- that count was ALL .min across ALL of JM DIE; CNC LATHE alone is 16,558). Mined:
**16,524 programs -> 94,015 samples -> 50 proven (material-group x operation) configs**, 9,633 outliers
flagged, **17 high-confidence**. The proven-store `data/state/jm-proven-speedfeed-store.json` (gitignored
generated data) is populated; `provenSpeedFeedAggregatorEngine.getProvenParams(materialGroup, opCategory)`
now returns real JM-proven CSS/feed (e.g. alloy_steel/parting -> CSS 150 m/min range[100,150], feed 0.0015
range[0.001,0.0015], conf 0.86, 800 samples). The orchestrator proven-blend (SpeedFeedOrchestratorEngine
proven-blend, confidence>=0.7) is no longer fed empty data.

**KEY: the proven-set COUNT (~50) is bounded by grouping CARDINALITY, not data volume** -- ~7 material
groups (tool_steel 73,971 samples / alloy_steel 15,238 / tungsten_carbide 3,499 / carbon_steel 622 /
inconel 571 / aluminum 92 / stainless 22) x ~12 op categories. The 50-file sample ALSO yielded ~50 configs
because even a small sample hits most common (material x op) combos; the full corpus deepened each config's
sampleCount + tightened ranges/confidence (totalSamples 249 -> 94,015, a 377x increase). Do NOT read a
stable set-count as "no new data" -- check totalSamples + per-config sampleCount.

**TWO findings (next levers, NOT yet built):**
1. **op=unknown is 44,847/94,015 (48%)** -- the OkumaOSPParserEngine op-classifier fails on ~half the
   samples. Improving it is the single biggest lever for more + deeper proven configs (the 50 -> potentially
   80+ as unknowns resolve into facing/drilling/threading/etc.).
2. **Only 17/50 configs are high-confidence** -- the other 33 have high cross-program variance. This DIRECTLY
   validates the operator premise ("amateur programs, don't trust them"): the 17 consistent configs are a
   trustworthy guideline; the 33 high-variance configs are where PRISM physics SHOULD override the
   inconsistent JM-programmed values. This 17-vs-33 split IS the "test against JM" signal the operator wanted.

**STILL OPEN:** (a) wire the orchestrator to LOAD the store in production (operator-gated -- changes live UI
numbers where confidence>=0.7; pair with the SFC convergence sign-off, per the script header). (b) the MILL
.nc corpus (119,255 .nc files: Haas/Hurco/Fanuc) is NOT covered by the Okuma lathe parser -- a mill-program
proven extractor is the next corpus. (c) feed the 94K-sample dataset to india LoRA/GNN (task #3). (d) build
the PRISM-vs-JM-proven divergence report (per material x op: PRISM-recommended vs JM-proven, flag where JM
is unsafe/over-conservative) -- now possible since getProvenParams is live.

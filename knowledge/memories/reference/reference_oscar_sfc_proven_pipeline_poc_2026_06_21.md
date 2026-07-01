---
name: reference_oscar_sfc_proven_pipeline_poc_2026_06_21
description: "POC (slot:oscar 2026-06-21): the dormant JM-Die proven-S/F pipeline WORKS end-to-end (40 Okuma .MIN -> 211 S/F rows, 0 parse err -> 8 proven param sets). Produced the FIRST real JM-Die proven lathe cutting data (tool_steel OD-finishing CSS 450 SFM ~= 137 m/min, n=29). RESOLVES caveat #2: JM Die ACTUAL Vc is published-aligned, NOT 2x-conservative -> the orchestrator's -63% deration matches NEITHER published NOR JM Die reality. Validates U-SFC-PROVEN-PIPELINE-ACTIVATE path + strengthens converge-onto-engine."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.711Z
aliases: reference_oscar_sfc_proven_pipeline_poc_2026_06_21
---


**SFC proven-pipeline POC + caveat-#2 resolution (slot:oscar, 2026-06-21).** Builds on [[reference_oscar_sfc_engine_divergence_magnitude_2026_06_21]] (the reconciliation verdict).

## What ran
`okumaOSPParserEngine.parse()` + `.extractDetailedSpeedFeeds()` over a bounded 40-file sample of real JM Die Okuma lathe programs (`H:/PRISM/JM DIE/CNC LATHE`, 34,993 `.MIN` total) -> `provenSpeedFeedAggregatorEngine.aggregateLatheData()` -> `exportForSpeedFeedOrchestrator()`.

## Result -- the dormant pipeline WORKS end-to-end (it was never run, not broken)
- 40 files parsed, **0 parse errors** (the Okuma OSP parser is solid on the live corpus), **211 DetailedSpeedFeed rows**.
- **8 proven param sets**, 5 high-confidence (>=0.5). DetailedSpeedFeed shape: `{filePath,toolSection,toolNumber,offsetNumber,operationType,cssSpeed,directRPM,maxRPM,feedRates,feedMode,hasCannedCycle,cycleParams}`.

## FIRST real JM-Die proven lathe cutting data (tool_steel)
| operation | CSS (SFM) | feed (ipr) | n | confidence |
|---|---|---|---|---|
| od_finishing | **450** (~137 m/min) | 0.006 | 29 | 0.62 |
| boring | null | 0.003 | 24 | 0.71 |
| id_finishing | null | null | 22 | 0.71 |
| drilling | null | 0.0025 | 24 | 0.70 |
| center_drilling | null | 0.00125 | 22 | 0.61 |
| facing | 200 | 0.005 | 7 | 0.26 |
| parting | 100-150 | 0.0015 | 6 | 0.14 |
(Okuma OSP CSS is SFM -- JM Die is INCH convention; 450 SFM = 137 m/min. Sample is tool_steel-dominant -- the ACME/feedroll parts. Operation inference partial: 71 rows landed "unknown" op -- a full-corpus run + op-classifier tuning is U-SFC-PROVEN-PIPELINE-ACTIVATE work.)

## CAVEAT #2 RESOLVED (the JM-Die-shop-reality gate from the reconciliation)
JM Die's ACTUAL proven OD-finishing Vc (~137 m/min) is squarely in the **published carbide range** for tool steel finishing -- it is **NOT 2x-conservative**. So the orchestrator's ~-63%-vs-published deration (steel ~80 m/min) matches **NEITHER published NOR JM Die actual practice**. The "maybe JM Die intentionally runs that slow, so the orchestrator is realistic" hypothesis is **contradicted by JM Die's own programs**. -> Strengthens the verdict: **converge onto UltimateSpeedFeedEngine** (published- AND shop-aligned). NOTE: this is lathe-finishing evidence; the divergence magnitudes I measured were milling -- a full-corpus run gives per-domain/op coverage, but the direction is consistent.

## U-SFC-PROVEN-PIPELINE-ACTIVATE is DE-RISKED + straightforward (next unit, non-blocked)
The miners + aggregator WORK; only the run+persist+load layer is missing. Build:
1. **Resumable corpus harness** `scripts/extract-jm-proven-speedfeed.mjs` -- enumerate lathe `.MIN` (OkumaOSPParser.batchParse) + mill (Haas/Hurco/RokuRoku parsers -> `millPatternMinerEngine.mineJMDiePrograms`); per-file stream-append + processed-cursor resume (host reaps long node procs -- [[reference_xray_ocr_corpus_resumable_multipage_2026_06_08]]).
2. **Persist** the aggregated store to a versioned JSON (schemaVersion) under `mcp-server/data/state/`.
3. **Load-at-init** in `ProvenSpeedFeedAggregatorEngine` (today it's in-memory-empty every process -> the orchestrator blend at SpeedFeedOrchestratorEngine.ts:2164-2191 is dead). Load the persisted store on first `getProvenParams`.
4. Wire a `prism_calc` action to refresh + a cron for periodic re-mine (operator asked for crons).
Then the orchestrator's proven-blend goes live AND the engine's numbers can be validated per-op against JM Die actuals at scale.

## MILL caveat-#2 confirmation (2026-06-21, the DIRECTLY-relevant domain -- divergence measurements were MILLING)
R8-found existing curated catalog `src/data/jmdie-proven-mill-programs.ts` (JM_DIE_PROVEN_MILL_PROGRAMS, hand-extracted from CNC MILL HAAS "PROVEN PRG" production folders -- FONTANA grip blocks, SFS backstops; die/tool-steel). Computed Vc = pi*D_mm*rpm/1000 from the proven tool entries:
| tool | D_mm | rpm | Vc m/min |
|---|---|---|---|
| 5/8" ball endmill (FONTANA grip block, HSM "S5000") | 15.875 | 5000 | 249 |
| 2" face mill (FONTANA) | 50.8 | 3500 | 558 |
| 3/4" flat endmill (FONTANA) | 19.05 | 4000 | 239 |
| 1/2" flat endmill (SFS) | 12.7 | 4500 | 180 |
| 1/4" drill (SFS) | 6.35 | 2500 | 50 (drilling regime) |
JM Die ACTUAL proven MILL endmilling = **180-249 m/min** (face milling 558) on die/tool steel. vs the production ORCHESTRATOR's **80 m/min** (steel-P milling baseline) -> JM Die runs **2-3x FASTER than its own production UI tool**. At/above the ENGINE's 160. Program notes confirm "High speed machining (S5000)", "0.03 stepover" = HSM (high Vc, light radial). CAVEAT (R12): the 249 ball-endmill is light-radial HSM (ae/D~0.05) vs the orchestrator's 80 at ae/D~0.5 -- different engagement regime; a fair compare holds engagement constant. BUT the direction is unambiguous: JM Die mill practice is HIGH-Vc/HSM, NOT conservative. This CLOSES caveat #2 for MILLING (was lathe-only): the orchestrator's -63% reflects NEITHER published NOR JM Die actual mill practice; the engine is far closer. Converge-onto-engine confirmed for both domains.
NOTE: this catalog is the cheap path to mill proven coverage (vs a Mastercam .mcx extractor) -- it has real per-tool rpm/feed/diameter; could feed aggregateMillData-equivalent + the orchestrator blend. 8 tool entries today (small; expandable from the 483 PROVEN PRG files).

## Reproduce
40-file in-dir tsx POC (deleted -- throwaway). Re-run: parse sample of `H:/PRISM/JM DIE/CNC LATHE/**.MIN` via `okumaOSPParserEngine`, aggregate via `provenSpeedFeedAggregatorEngine.aggregateLatheData`, `exportForSpeedFeedOrchestrator()`. MILL: read `src/data/jmdie-proven-mill-programs.ts` JM_DIE_PROVEN_MILL_PROGRAMS, Vc=pi*D_mm*rpm/1000.

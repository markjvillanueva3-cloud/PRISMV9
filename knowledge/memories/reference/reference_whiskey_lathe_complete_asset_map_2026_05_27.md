---
name: reference-whiskey-lathe-complete-asset-map-2026-05-27
description: Comprehensive lathe-domain asset map for whiskey slot. Aggregates 4 parallel-agent enumeration: engines/algos/dispatchers/schemas/sentinels + post files/JM fleet/CAD-CAM locations + wiki/tribal nodes + cross-domain bridges. Single-stop reference so whiskey doesn't have to re-scan the codebase.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:11.045Z
aliases: reference_whiskey_lathe_complete_asset_map_2026_05_27
---


# Whiskey Lathe — Complete Asset Map

## 1. ENGINES (238 lathe-specific in mcp-server)

**Path root**: `H:/PRISM/mcp-server/src/engines/`

**Lathe-prefixed (198 files)** — Lathe* naming. Highlights:
- `LatheActiveLearningEngine.ts` · `LatheAdaptiveMachiningEngine.ts` · `LatheAdvancedOperationsEngine.ts`
- `LatheAGIKnowledgeUnificationEngine.ts` · `LatheAIReasoningEngine.ts` · `LatheAnomalyDetectionEngine.ts`
- `LatheAutoQuoteFromPrintEngine.ts` · `LatheBayesianOptimizationEngine.ts` · `LatheCAMIntelligenceEngine.ts`
- `LatheChangeoverBriefEngine.ts` · `LatheChipMechanicsEngine.ts` · `LatheChuckJawSetupEngine.ts`
- `LatheClusterAnalysisEngine.ts` · `LatheCollisionDetectionEngine.ts` · `LatheControllerSelectEngine.ts` (Okuma/Fanuc/Haas dialect router)
- `LatheCpkAnalysisEngine.ts` · `LatheCycleTimeEngine.ts` · `LatheDeflectionOptimizationEngine.ts`
- `LatheDialogueSystemEngine.ts` · `LatheDocumentParserEngine.ts` · `LatheDrillEngine.ts`
- `LatheElectrolossyEngine.ts` · `LatheEccentricTurningEngine.ts` · `LatheEnvelopeDetectionEngine.ts`
- `LatheERP2ProposalEngine.ts` · `LatheEstimatorEngine.ts` · `LatheEvaluationEngine.ts`
- `LatheFailureModeAnalysisEngine.ts` · `LatheFastenerLibraryEngine.ts`

**Turning/Threading/Specialist (40 files)**:
- `TurningForceEngine.ts` (cutting force prediction) · `TurningFeatureTaxonomyEngine.ts` (face/shoulder/taper/groove classifier)
- `TurningThreadOptimizerEngine.ts` · `ThreadingPipelineEngine.ts` · `ThreadingServoSyncVerifierEngine.ts` (rigid tapping validation)
- `HardTurningCapstoneEngine.ts` (55+ HRC) · `HardTurningDecisionEngine.ts` (vs grinding ROI) · `DiamondTurningEngine.ts` (optics precision)
- `EccentricTurningEngine.ts` · `TaperTurningEngine.ts`

**Bridges/Specialized**:
- `ChuckJawForceEngine.ts` · `FusionLathePostDeltaRegistryEngine.ts`
- `JMDieLatheProgramUpgrader.ts` (V1) + `JMDieLatheProgramUpgraderV2Engine.ts` (the iter218 v2.0.0 pipeline)
- `LatheProgramRecognitionBridgeEngine.ts` (OCR part-number recognition) + `LatheProgramLibraryEngine.ts` (fuzzy library lookup)
- `LatheGeneticAlgorithmEngine.ts` (parameter optimization)
- `LatheMasterOrchestratorFacadeEngine.ts` (orchestration facade)
- `LathePostKnowledgeGraphEngine.ts` (controller dialect synthesis)
- `TurningInsertLifeEngine.ts` (wear progression)
- `TurningPrintToProgramEngine.ts` (blueprint → G-code) + `AutoPrintToProgramBridgeEngine.ts` (orchestrator)
- `CadCamHandoffEngine.ts` (CAD features → CAM strategy, generic but lathe-routed)

## 2. ALGORITHMS

**`mcp-server/src/algorithms/`** — **0 lathe-specific files**. Physics constants live in `src/physics/constants.ts`. Lathe engines compose generic algorithms (sublinear solvers, optimization) from this dir.

## 3. DISPATCHERS (4 lathe-dedicated)

**Path root**: `H:/PRISM/mcp-server/src/tools/dispatchers/`

| Dispatcher | Actions | Purpose |
|-----------|---------|---------|
| `turningDispatcher.ts` | 373 | SAFETY-CRITICAL chuck/spindle/speed envelope |
| `turningProgramDispatcher.ts` | 14 | Print-to-Program: generates CNC lathe programs from prints |
| `threadDispatcher.ts` | 17 | Threading calcs: tap drill, depth, pitch, thread milling |
| `threadingPipelineDispatcher.ts` | 3 | Complete thread programming pipeline |

**Lathe actions inside generic dispatchers**:
- `prism_cam` (camDispatcher.ts): `lathe_post_process`, `lathe_sf_calculate`, `lathe_sf_advise`
- `prism_calc` (calcDispatcher.ts): `turning_force`, `diamond_turning_forces`
- `prism_turning` (turningDispatcher.ts dedicated): `lathe_chatter_analysis`, `lathe_hard_turning`, `lathe_thread_schedule`

## 4. SCHEMAS

**Path root**: `H:/PRISM/mcp-server/src/schemas/` — lathe actions distributed across 20+ generic schema files:
- `calcActionSchemas.ts` (lathe speed/feed/force)
- `cncOpsActionSchemas.ts` (boring, facing, threading)
- `camActionSchemas.ts` (lathe toolpath generation)
- `businessActionSchemas.ts` (lathe costing)
- `cadActionSchemas.ts` (lathe print intake)

No standalone lathe schema files.

## 5. GALAXY SENTINEL

**`H:/PRISM/mcp-server/src/engines/lathe/CLAUDE.md`** — EXISTS (P1 Galactic Center, authored 2026-05-26 by slot:alpha mill-specialist, awaiting lathe-specialist refine per R7). Bibryam Context Cascade pattern; loads automatically when Claude edits under `mcp-server/src/engines/lathe/`. 200-line cap.

Sister sentinels in `algorithms/lathe/CLAUDE.md` and `dispatchers/lathe/CLAUDE.md`: **NOT FOUND** (galaxy expansion pending).

## 6. SLOT-WHISKEY LATHE ENGINES (7 P0 + tests)

**Path root**: `H:/prism-slot-whiskey/scripts/lib/`

| File | Tests | Purpose |
|------|-------|---------|
| `lathe-g76-thread-validator.mjs` | 7/7 | G76/G92 threading rules 1+6+7 per controller dialect |
| `lathe-shop-tool-library-bridge.mjs` | 12/12 | (customer, T-num) → ANSI insert via 3-layer fallback |
| `lathe-tribal-query-engine.mjs` | 12/12 | Query 14-vendor / 87+ grade tribal corpus |
| `lathe-wizard-vendor-lookup.mjs` | 9/9 | selectInsert(spec) — 7-component scoring |
| `lathe-ab-version-locator.mjs` | 19/19+7 | Parse JM-Die paths + pair A/B (iter275 added classifyPairType) |
| `lathe-training-loop-stage-4-reason.mjs` | 18/18 | Compose 5 engines → ReasonReport (iter262 rationale corrected) |
| `lathe-training-loop-stage-5-generate.mjs` | 13/13 | Apply recommendations → ProposedProgram |

Pipelines:
- `scripts/lathe-quality-pipeline.mjs` (39/39 tests; iter265 parseBlocks comment-strip fix)
- `scripts/lib/lathe-engines-e2e-smoke.test.mjs` (7/7 cross-engine compose)
- `scripts/lib/lathe-stage-4-5-pipeline.test.mjs` (3/3 amateur→improved proof)

**Scanner**: `scripts/scan-jm-die-ab-pairs.mjs` (iter257 `--upgraded-only` flag + iter270 3-class `pair_type` field).

**Total: ~143 hermetic tests passing through iter275.**

## 7. POST-PROCESSORS (50+ lathe variants)

**Consolidated** (`H:/PRISM/JM DIE/POST PROCESSORS/1. CONSOLIDATED/vanilla/lathe/`):
- Doosan, Fanuc (Generic 2X + 4X MT), GRBL, Heidenhain, Hurco, Mitsubishi, Okuma, Siemens (840C/D), Tormach, Milltronics
- Haas: 26 ST/SL variants (`haas st-10.cps` through `haas st-55.cps` + DS-30 SSY/Y)
- Mazak: 17 Quick Turn variants (`mazak quick turn 100-m` through `450-my` + 350-MSY)

**PRISM Enhanced** (`H:/PRISM/JM DIE/POST PROCESSORS/2. PRISM ENHANCED/`):
- `lathe/OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps`
- `mill-turn/OKUMA_LATHE_LB3000-Ai-Enhanced 2.cps`
- `mill-turn/OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps`

**Fusion Cache** (`H:/PRISM/mcp-server/data/posts/fusion-cache/`): 324 lathe-related variants.

## 8. JM DIE LATHE ARCHIVE

**Root**: `H:/PRISM/JM DIE/CNC LATHE/`

- **118 customers** verified. Sample: ACME, ACUMENT, ADDISON FASTENERS, AEROTECH, AGRATI, AIR, ALCOA, ALLFAST, ALLSTAR, AMGLO, ANDERSON, ARCONIC, ATF, BELVIDERE, BIRMINGHAM FASTENER, BRAINARD RIVET, BRICO, BRISTOL, CAMCAR, CFC, CHERRY, CHOCTAW, CLENDENIN ... WHITESELL, WRENTHAM, WSR
- **14,475 A/B pairs** (iter202 full archive scan).
- **PRISM_UPGRADED v2.0.0 outputs** verified for all 118 customers at `<customer>/PRISM_UPGRADED/<Machine_Model>/<part>.nc`.
- **iter261 R12 retraction**: v2.0.0 is pure annotation pass-through across ALL 5 sampled customers (CAMCAR / ITW / ACME / AGRATI / ALCOA). NOT machining-improving. See `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]`.

## 9. JM DIE LATHE FLEET (7 Okuma)

From `mcp-server/src/data/jm-die-profile.ts`:

| ID | Model | Controller |
|----|-------|-----------|
| LTH-01 | Okuma GENOS L300-M | OSP-P300L-R |
| LTH-02 | Okuma GENOS L200E-M | OSP-P200LA-R |
| LTH-03 | Okuma LNC8 | OSP-U10L |
| LTH-04 | Okuma Crown L1060 | OSP-U10L |
| LTH-05 | Okuma GENOS L400II-E | OSP-P300LA-E (AI-Enhanced) |
| LTH-06 | Okuma LB 3000EX Big Bore | OSP-P500 |
| LTH-07 | Okuma Multus B250II | OSP-P300SA (Mill-Turn) |

**100% Okuma**. See `[[reference_jm_die_is_okuma_heavy_implications_2026_05_27]]` for CSS/G50/G76 implications.

## 10. CAD/CAM REFERENCE FILES

- `H:/PRISM/JM DIE/CAD/` — **NOT FOUND**
- `H:/PRISM/JM DIE/CAM/` — **NOT FOUND**

(CAD/CAM source files for JM-Die parts not present in archive.)

## 11. INGESTION-CACHE ARTIFACTS

**Path root**: `H:/PRISM/mcp-server/data/ingestion_cache/`

- `extracted-pdfs/cnccookbook-lathe-programming-tips.jsonl` — CNCCookbook lathe programming tips
- `jm-die-tribal-wiki-corpus.json` (19.1K) — JM-Die tribal corpus (lathe section pending — currently shared with mill ingestion)
- `training-curriculum/jm-die-easy-to-complex.jsonl` — JM-Die curriculum
- `lathe-tribal-master-index-2026-05-26.json` — 14-vendor tribal corpus
- `lathe-vendor-expansion-2026-05-26.json` — Vendor breadth expansion
- `lathe-videos-tribal-2026-05-26.json` — 432 indexed videos
- `whiskey-lathe-session-iter180.json` — Machine-readable sentinel (iter181 ship)
- `jm-die-ab-pairs-<date>.jsonl` — Per-iter scan outputs (gitignored, 4MB+; iter202 has 14,475 pairs)

## 12. WIKI ENTRIES (1,327 lathe-related)

**Path root**: `H:/PRISM/knowledge/wiki/`

**Top namespaces** (by lathe-keyword match):
- `code-tribal/learnings/post-bridge-synergy-ms0-u-lathe-*` (multiple)
- `code-tribal/canonical/*-turning-*` (feature taxonomy, stockmodel, tool definitions)
- `architecture/combos/combo-lathe-*` (combo patterns)
- `architecture/datacat/lathe-*` (catalogs: hardening, tooling, physics-science)
- `architecture/skills/project/lathe.md`

## 13. TRIBAL MEMORY NODES

**Path root**: `H:/PRISM/knowledge/memories/`

**Highest-priority lathe-domain entries** (whiskey-relevant):
- `reference/reference_whiskey_iter250_cron_re_establishment_2026_05_27.md` — iter250-268 work trace
- `reference/reference_whiskey_session_final_iter228_2026_05_27.md` — pre-compact comprehensive successor
- `reference/reference_whiskey_session_final_iter167_2026_05_27.md` — pre-iter168 snapshot
- `reference/reference_iter218_alcoa_outlier_retraction_2026_05_27.md` — R12 retraction (iter261 byte-level disproof)
- `reference/reference_jm_die_v2_upgrade_pattern_2026_05_27.md` — iter218 source memo (RETRACTED — see iter261)
- `reference/reference_jm_die_v2_upgrade_camcar_passthrough_2026_05_27.md` — cross-customer passthrough finding
- `reference/reference_jm_die_is_okuma_heavy_implications_2026_05_27.md` — Okuma-only fleet implications
- `reference/reference_ab_locator_over_pairing_human_revisions_2026_05_27.md` — iter256/257 over-pairing + flag spec
- `reference/reference_whiskey_real_data_validation_pattern_2026_05_27.md` — 14,475 A/B pair validation pattern
- `reference/reference_whiskey_lathe_design_memo_verification_checklist_2026_05_27.md` — design verification protocol
- `reference/reference_whiskey_lathe_complete_design_synthesis_2026_05_27.md` — full design synthesis
- `feedback/feedback_jm_die_b_versions_are_ai_not_human_upgrade.md` — B-version provenance doctrine
- `feedback/feedback_yolo_mode_stop_hook_unsatisfiable_loop.md` — iter271 architectural finding

## 14. SLOT-WHISKEY WIKI LESSONS

**Path root**: `H:/prism-slot-whiskey/knowledge/wiki/lessons/`

- `jm-die-v2-upgrade-pure-annotation-passthrough.md` — iter264 wiki companion to iter261 retraction
- `yolo-mode-stop-hook-unsatisfiable-loop.md` — iter271 architectural meta-finding

## 15. HOOK BRIDGES (lathe-context detectors)

**Path root**: `H:/PRISM/.claude/hooks/`

- `ai-auto-command-router.mjs` — `/lathe|turning|okuma|turning.*center/i` → `/lathe-studio`
- `ai-reasoning-inject.mjs` — lathe keyword → /lathe-studio injection
- `ai-system-activate.mjs` — activates lathe programming context
- `agi-safety-envelope-guard.mjs` — guards `lathe_agi_reason`, `lathe_auto_quote_from_print`, `lathe_job_schedule`
- `always-build-guard.mjs` — physics-constants import enforcement on lathe engines
- `audit-awareness-inject.mjs` — `\blathe\b|turning` → "lathe" domain tag

## 16. SKILL BRIDGES

**Path root**: `H:/PRISM/.claude/commands/`

- `/lathe-studio` — Full lathe/turning programming studio with AI
- `/lathe-postgen` — Lathe post-processor generation + validation
- `/lathe-master-post` — Lathe master post framework
- `/lathe-lora` — Lathe LoRA model training pipeline
- `/lathe.md` (34.6K aggregator) — Core lathe domain skill

## 17. CAD-TO-CAM-TO-LATHE PIPELINE

**Engine chain** (blueprint → G-code):

```
Blueprint
  ↓ CadCamHandoffEngine (CAD-gen feature normalization)
  ↓ TurningPrintToProgramEngine (lathe-specific G-code synthesis)
  ↓ LathePostKnowledgeGraphEngine (controller dialect mapping)
  ↓ LatheGeneticAlgorithmEngine (parameter tuning)
G-code
```

Orchestrator: `AutoPrintToProgramBridgeEngine.ts`.

## 18. CRITICAL DOCTRINE (cross-cuts)

- **iter261 R12 retraction**: v2.0.0 is pure annotation pass-through for ALL 5 sampled customers (zero machining content changes). ALCOA is NOT an outlier.
- **iter265 parseBlocks fix**: comment-stripping (`PAREN_COMMENT_RE`) prevents G-code-in-comment false-positives. Was iter218's root-cause bug.
- **iter257 --upgraded-only flag + iter270 3-class pair_type**: filter scan output by `prism_upgraded | human_revision | empty_source` for clean training-signal aggregation.
- **iter270 empty-source classification**: A-file <10 non-blank-non-comment lines → `empty_source` (was inflating ITW's avg_delta).
- **JM Die is 100% Okuma lathes** — all 7 LTH-* machines are Okuma. CSS/G50/G76 conventions apply.
- **B-versions are AI-generated** ([[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]) — adopting their pattern is partly self-referential.

## 19. NEXT-SESSION PRIORITY ORDER (from iter228)

1. **HIGHEST**: Real shop tool-list ingestion (iter194 template) — replace synthetic SHOP_INVENTORY
2. **HIGH**: Real master-index PDF ingestion (iter195 template, expand 14 → 25+ vendors)
3. **HIGH**: MCP dispatcher action `prism_lathe:query_vendor_tribal` (iter196 template)
4. **MEDIUM**: --score across more customers (5 of 118 done; AGRATI/ACME/CAMCAR/ITW/ALCOA)
5. **MEDIUM**: TS engine wiring (iter198 template, Path B dynamic-import recommended)

## Related

- `[[reference_whiskey_iter250_cron_re_establishment_2026_05_27]]` — durable cron + iter250-274 trace
- `[[reference_whiskey_session_final_iter228_2026_05_27]]` — pre-compact comprehensive successor
- `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]` — R12 retraction
- `[[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]` — B-version provenance
- `[[feedback_yolo_mode_nonterminal_goal_pattern]]` — cron-continuity doctrine
- `[[feedback_yolo_mode_stop_hook_unsatisfiable_loop]]` — iter271 architectural finding
- `H:/prism-slot-whiskey/scripts/lib/README-whiskey-lathe.md` — slot-whiskey scripts/lib entry point (updated iter274 to reflect iter272 status)
- Galaxy sentinel at `H:/PRISM/mcp-server/src/engines/lathe/CLAUDE.md` (auto-loads when editing under that dir)

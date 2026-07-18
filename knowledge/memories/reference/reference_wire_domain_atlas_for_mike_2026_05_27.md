---
name: reference-wire-domain-atlas-for-mike-2026-05-27
description: "WEDM/wire-EDM fast-lookup atlas for the mike slot — every backend node + knowledge node + archive path + database/bridge engine on disk, grouped for paste-able lookup. Mirrors the foxtrot mill-domain-atlas pattern. Built 2026-05-27 via 4 parallel Explore agents on operator directive."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.265Z
aliases: reference_wire_domain_atlas_for_mike_2026_05_27
---


# Wire-EDM domain atlas — fast-lookup for mike slot

Per operator directive 2026-05-27 (`/checkin-mike before you continue, add to memory anything wire machining related...`). Built via 4 parallel Explore agents covering backend code / knowledge nodes / JM Die archive / databases + bridges. Mirrors `[[reference_mill_domain_atlas_for_foxtrot_2026_05_27]]` shape.

**Read this FIRST before any wire-EDM query — paths are paste-ready.**

---

## A) BACKEND CODE (586 nodes)

### A1. Engines — 184 wire-EDM-relevant in `mcp-server/src/engines/`

- **LoRA pipeline (this session, 6 wired)** — `WEDMLoRATrainingScriptEngine` · `WEDMLoRARewardShapingEngine` · `WEDMLoRASafetyEvaluatorEngine` · `WEDMLoRAReasoningEvaluatorEngine` · `WEDMCurriculumSchedulerEngine` · `WEDMAcademyBridgeEngine` · `WEDMLoRADatasetBuilderEngine` (A2-DSB, prior) · `WEDMLoRAAdapterEngine` · `WEDMLoRACadenceEngine`
- **Wire-EDM AI/reasoning (21 WireEDM* bridge engines)** — `WireEDMDeepAIHardeningEngine` · `WireEDMMasterAIEngine` · `WireEDMKnowledgeSynthesisEngine` · `WireEDMDeepReasoningEngine` · `WireEDMAIPrintToProgramEngine` · `WireEDMCAMKnowledgeEngine` · `WireEDMAdvancedNeural` · `WEDMAnalogicalReasoningEngine`
- **Parameter physics** — `WEDMSparkErosionModelEngine` · `WEDMGapVoltageControlEngine` · `WEDMMRRPhysicsEngine` · `WEDMThermalFieldEngine` · `WEDMDielectricCorrection` · `WEDMCurrentDensityGuard` · `WEDMPowerDensityGuard` · `WEDMCornerPhysics`
- **Wire mechanics** — `WEDMWirePathCollision` · `WEDMWireBreakRisk` · `WEDMWireBreakPredictorEngine` · `WEDMWireSpoolConsumption` · `WEDMTaperErrorBudgetEngine` · `WEDMSlugTabRetentionEngine` · `WEDMWireStressAnalysisEngine` · `WEDMWireTensionOptimizerEngine` · `WEDMWeibullWireLifeEngine` · `WEDMWireHeatingEngine` · `WEDMKerfWidthEngine` · `WEDMWireDeflectionEngine` · `WEDMThinWireDerateEngine`
- **Surface integrity** — `EDMSurfaceIntegrityEngine` · `EDMMonitorSurfaceIntegrityEngine` · `WEDMRecastLayerMLEngine` · `WEDMRecastDepthPredictorEngine` · `WEDMHeatAffectedZoneEngine` · `WEDMRaPredictorEngine`
- **Post-router** — `WEDMPostDialectRouterEngine` (5 vendors) — `WEDMPostMitsubishi/Sodick/Makino/Agie/Fanuc` controllers
- **ML/learning** — `WEDMMLParameterOptimizerEngine` · `WEDMFeatureImportanceEngine` · `WEDMTransferLearningEngine` · `WEDMOnlineLearningEngine` · `WEDMNeuralTraining` · `WEDMLatticeGraphEngine` · `WEDMGraphAttentionEngine` · `WEDMNeighborQueryEngine` · `WEDMTribalTipLearnerEngine` · `WEDMFewShotMaterialEngine`
- **P2P pipeline** — `DXFGeometryParserEngine` · `EDMDrawingInterpretationEngine` · `EDMFeasibilityEngine` · `EDMMaterialMachineWireEngine` · `EDMStartHoleSetupEngine` · `EDMToolpathStrategyEngine` · `EDMMultiPassStrategyEngine` · `EDMCuttingParamFlushEngine` · `EDMWireSlugCornerTaperEngine` · `EDMPostProcessGCodeEngine` · `EDMCostDocumentationEngine` · `EDMQualityOrchestratorEngine` · `EDMBiMaterialCompensationEngine` · `WEDMPrintToProgramEngine` · `AutoPrintToProgramBridgeEngine` · `WEDMJobOutcomeEngine`
- **Quality/governance** — `WEDMQualityOrchestrator` · `WEDMGovernanceStore` · `WEDMPreFlightCheck` · `WEDMAutonomySubstrateGateEngine` · `WEDMTribalRuntimeEngine`

### A2. Dispatcher — `mcp-server/src/tools/dispatchers/edmDispatcher.ts` (3,262 lines · 203 cases · 519 `wedm_*` occurrences)
6 new actions wired iter17: `wedm_lora_train_script` · `wedm_lora_reward` · `wedm_lora_safety` · `wedm_lora_reason` · `wedm_lora_curriculum` · `wedm_academy_bridge`. Pre-existing big-buckets: feasibility (3) · geometry/toolpath (13) · ML (40+) · physics (50+) · process control (8+) · post-processing · cost/quality.

### A3. Schemas — `mcp-server/src/schemas/` (22 files · 2,980 lines)
`edmActionSchemas.ts` (1,124 — master) · `wedmDLCoreSchemas.ts` · `wedmErpActionSchemas.ts` · `wedmLatticeGraphSchema.ts` · `wedmTrainingTemplateSchemas.ts` · `wedmJobHistorySchema.ts` + 17 more.

### A4. Hooks — `.claude/hooks/lib/`
`wedm-batch-validate.mjs` · `wedm-digest-freshness.mjs` · `wedm-physics-constants-gate.mjs` · `wedm-program-safety-gate.mjs` · `wedm-synthetic-block.mjs`

### A5. Routes — `mcp-server/src/routes/`
`edm.ts` (46.5K) · `wedm-erp.ts` (43.2K)

---

## B) DATA / REGISTRIES / DATABASES

### B1. Code-side data files — `mcp-server/src/data/`
- `wedm-knowledge-tips.ts` — **122-entry tribal corpus** (THE canonical source for wire-EDM tribal — all `knowledge/tribal/wedm-knowledge-tips-*.md` regenerate from this)
- `wedm-engine-registry.ts`
- `wedm-published-conditions.ts` · `wedm-published-machines.ts` · `wedm-resources-index.ts`
- `jm-die-wedm-tech-tables.ts` (220 LOC — E12xx + E28xx canonical per-pass tables)
- `jm-die-wedm-program-patterns.ts` (570 LOC — 4 ground-truth program analyses)
- `jm-die-profile.ts` — shop config (FA-10S declared here)
- `edm-material-db.ts` · `wire-spec-sheets.ts` (brass/zinc-coated/gamma-phase Bedra/Berkenhoff)
- `academy/course-13-wire-edm-progressive.ts` — Lima's 5-module WEDM curriculum

### B2. Runtime state — `mcp-server/data/state/` (48 WEDM state files)
- `WEDM_LATTICE_GRAPH.json` (1.5M) · `WEDM_GNN_WEIGHTS.json` (131K)
- `WEDM_OUTCOME_LEDGER.jsonl` (268K) — outcome-capture stream
- `WEDM_REASONING_TRACE_LEDGER.jsonl` (74K)
- `WEDM_CAPABILITY_MANIFEST.json` · `WEDM_PARAMETER_CORPUS.json`
- `WEDM_MATERIAL_INDEX.json` · `WIRE-MS0/` directory · `WEDM_LORA_CHECKPOINT.json`

### B3. Lima's PDF corpus — `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` (16.7M · 8,752 pages from 73 PDFs · gitignored)
Sample/rollup committed at `state/shared/jm-die-corpus-extraction-sample.json`. Wire-relevant text dumps under `state/shared/pdf-extracts/jm-die-tribal-wiki/` (18 files mention wire/EDM/wedm — `mastercam-wire-tutorial.txt` is the #1 hit).

### B4. Training corpora — `state/shared/wedm-training-corpus/` · `mcp-server/data/wedm-intelligence/` · `mcp-server/data/wedm-lora-smoke-out/`

---

## C) KNOWLEDGE NODES (879 total)

### C1. Tribal tips — `knowledge/tribal/wedm-knowledge-tips-*.md` (86 files, MD auto-generated from B1's TS)
- `wedm-kb-001..030` (30) — knowledge-base style
- `jm-die-001..020` (20) — JM Die internal
- `wedm-jmd-001..008` (8) — JM Die program-derived
- `wedm-mcam-001..010` + variants (15) — Mastercam-specific
- `wedm-sp-001..006` (6) — surface-processing
- `wedm-research-001..010` (10) — research papers
- **+ 36 new this session**: research-011..026 + jmd-ground-truth-001..013 + wiki-tactic-001..004 + jmd-discrepancy-001 + mcam-tutorial-001..004

### C2. Wiki entries (349 files)
- `knowledge/wiki/architecture/engines/wedm/` (205) — per-engine docs
- `knowledge/wiki/architecture/tests/wedm/` (139) — test descriptions
- `knowledge/wiki/code-tribal/wedm-*.md` (43) — tactics + lessons (e.g. `wedm-tactics-multipass-and-recast.md`, `wedm-tactics-wire-and-flushing.md`)
- `knowledge/wiki/architecture/tribal/tribal-wedm-*.md` (11) — tribal-category indexes
- `knowledge/wiki/lessons/wedm-wire-material-and-parameter-research-2026-05-26.md` — this session's research lesson
- `knowledge/wiki/architecture/specs/spec-wedm-wizard-inventory-2026-05-22.md`

### C3. Memories — `knowledge/memories/` (425 files: 1 feedback + 422 reference + 2 project)
Wire-specific reference highlights: `wedm_wire_consumption` · `wedm_wire_cost_usd_per_m` · `wedm_wire_speeds` · `wedm_predict_wire_break` · `wedm_select_wire` · `wedm_thin_wire_derate_*` · `wedm_wire_heating_*` · `wedm_wire_stress_*` · `wedm_wire_tension_*` · `academy_course_13_wire_edm_progressive` · `tribal_wedm_tactics_wire_and_flushing` · `u_bridge_wire_agent` · project: `project_wedm_agi_status.md`, `project_wedm_erp_complete.md`.

### C4. Slash-command skills — `.claude/commands/`
`wedm.md` · `wedm-audit.md` · `wedm-program.md` · `wedm-safety-gate.md` · `wire-edm-analyze.md` · `wire-edm-studio.md`

---

## D) JM DIE WIRE EDM ARCHIVE — `H:/PRISM/JM DIE/WIRE EDM/`

**Scale: 4,058 files · 99 customer folders**

### D1. File-type breakdown
- 2,191 `.mcx-8` Mastercam X8 projects (under `MCAM X8/`)
- 1,779 `.MCX` Mastercam X2 projects (under `PROGRAMS MCAM X2/`)
- 28 `.ESP` Esprit projects
- 22 raw NC/MIN programs (19 `.MIN` ATF-customer + 3 `.NC`)
- 14 `.zip` archives

### D2. Top customers by file count (paste-ready)
TOMEK PROGRAMS (433) · ATF (66) · OPTIMAS (61) · AJ MANUFACTURING (52) · OMG (39) · GRANDEUR (37) · VALLEY (33) · ALLFAST (33) · STABIO (31) · HOLO-KROME (31) · FONTANA (31) · ITW (27) · SFS INTEC (26) · Anderson MFG-STABIO (26) · V-BLOCKS (25) · ALCOA FASTENING (18) · LEP (17) · JEBCO (15) · HEADER PRODUCTS (14) · WRENTHAM TOOL (12)

### D3. The 3 reference NC programs (ground truth — every parameter cited in tribal is from these)
- `ITW SHAKEPROOF 500-30540-24000-04.NC` (E12xx 4-pass straight, D2)
- `NOZE TEST.NC` (E28xx 5-pass UV taper, stainless)
- `Wire Program - 5 inch square.NC` (test/training cut)
- Cross-archive copy: `H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/500-30540-24000-04__from__WIRE EDM/CNC PROGRAM/`

### D4. Post processors
- **Consolidated**: `H:/PRISM/JM DIE/POST PROCESSORS/1. CONSOLIDATED/vanilla/wire-edm/`
  - Agie: `Agie Generic AC123 4X Wire.pst`, `Agie Generic Agievision_AWF 4X Wire.pst`
  - Makino: `makino a500z.cps`, `d200z.cps`, `d300.cps`, `d500.cps`, `slim3n.cps`, `Generic Makino 4X Wire (TECH).pst`
- **PRISM-enhanced**: `H:/PRISM/JM DIE/POST PROCESSORS/2. PRISM ENHANCED/wire-edm/`
  - `PRISM-Master-Agie-CUT-WEDM.cps` · `PRISM-Master-Fanuc-ROBOCUT-WEDM.cps` · `PRISM-Master-Makino-U-WEDM.cps` · `PRISM-Master-Mitsubishi-FA10S-WEDM.cps` · `PRISM-Master-Sodick-AQ-WEDM.cps`
- **Modified**: `H:/PRISM/JM DIE/PRISM MODIFIED POST PROCESSORS/PRISM-Master-Mitsubishi-FA10S-WEDM.cps`

### D5. Notable gaps
- Prints / drawings (.pdf .dwg .dxf .idw): **ZERO** in WIRE EDM tree — prints live in separate `_PART LIBRARY` hierarchy
- CAD models (.ipt .iam .stp .x_b): **ZERO** in WIRE EDM tree — same separation

---

## E) ROADMAP + CROSS-DOMAIN BRIDGES

- `mcp-server/data/roadmap-index.json` (377K) — 160+ `WEDM-*` milestone entries
- Cross-domain: `H:/PRISM/JM DIE/CNC LATHE/NORTHERN WIRE/` (customer named "Northern Wire" — NOT wire-EDM, it's a lathe customer; flag if confused)
- Worktree paths used by the fleet: `H:/prism-slot-mike/` (mike's own), peer worktrees `H:/prism--system-viz-brain-ms0-u--*` etc.

---

## F) FAST-LOOKUP CHEAT SHEET

| Need | Path |
|------|------|
| New WEDM engine | `mcp-server/src/engines/WEDM*.ts` |
| WEDM tribal tip (source-of-truth) | `mcp-server/src/data/wedm-knowledge-tips.ts` |
| WEDM dispatcher actions | `mcp-server/src/tools/dispatchers/edmDispatcher.ts` |
| WEDM action schemas | `mcp-server/src/schemas/edmActionSchemas.ts` |
| JM Die FA-10S tech tables | `mcp-server/src/data/jm-die-wedm-tech-tables.ts` |
| JM Die program patterns | `mcp-server/src/data/jm-die-wedm-program-patterns.ts` |
| JM Die wire-EDM archive | `H:/PRISM/JM DIE/WIRE EDM/` |
| Reference NC programs | `WIRE EDM/{ITW SHAKEPROOF 500-30540-24000-04, NOZE TEST}.NC` |
| Mitsubishi FA-10S post | `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/wire-edm/PRISM-Master-Mitsubishi-FA10S-WEDM.cps` |
| Wire wizard frontend | `mcp-server/web/src/pages/WireEdmWizardPage.tsx` |
| Lima's PDF corpus (gitignored, local-only) | `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` (16.7M / 8,752 pages) |
| Mastercam Wire Tutorial text | `state/shared/pdf-extracts/jm-die-tribal-wiki/mastercam-wire-tutorial.txt` |
| Course-13 academy curriculum | `mcp-server/src/data/academy/course-13-wire-edm-progressive.ts` |
| WEDM outcome ledger | `mcp-server/data/state/WEDM_OUTCOME_LEDGER.jsonl` |
| WEDM LoRA checkpoint state | `mcp-server/data/state/WEDM_LORA_CHECKPOINT.json` |

---

## G) GRAND TOTAL (for context)

- **586** backend nodes (engines + dispatcher + schemas + data + hooks + routes)
- **879** knowledge nodes (tribal + wiki + memories + commands + PDF extracts)
- **4,058** archive files (99 customers)
- **16** post processors (consolidated + enhanced + modified)
- **48** runtime state files
- **122** tribal-tip TS source entries (auto-generates the 86 MD files plus the 36 new this session)

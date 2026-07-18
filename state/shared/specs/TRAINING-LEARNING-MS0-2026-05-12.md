# TRAINING-LEARNING-MS0 — Domain Starting-Template Corpus

**Created:** 2026-05-12 by claude-8f2683e8 (slot alpha)
**Triggered by:** user request 2026-05-12 — "add a section for training and learning in the 3 primary machine domains: mill, lathe, wire edm. to look through every single one of our prints, programs, cad/cam files. we should be able to make starting templates for common or similar type parts. dont forget about the excel macro we have for electrodes (taptites) that should be heavily present for jobs that require sinker edm burning of copper taptites into carbide inserts"
**Status:** SCOPED — units enumerated, execution deferred (the corpus scan is 24,545 files; each engine ships with tests + dispatcher wiring + round-trip).
**Owns:** the closed-loop training pipeline that mines our existing corpus of prints/programs/CAD-CAM files and emits reusable starting templates per part family in mill / lathe / wire-EDM, including a heavy bridge to the taptite-electrode Excel macro for sinker-EDM-into-carbide jobs.
**Companion:** `MACRO-PROGRAM-PIPELINE-MS0-2026-05-12.md` (the lathe-macro half — same shape, narrower scope).
**Roadmaps it docks into:** `MILL-MASTER`, `LATHE-MASTER`, `WEDM-AGI` (latest), `OBSIDIAN-AUTOMATE-MS3` (training-corpus surface).

---

## Principle (per the user)

> *"Every single print, program, CAD/CAM file in our shop"* is a training corpus.
> *"Starting templates for common or similar type parts"* — a new job that resembles 30 we've already run should begin from a vetted skeleton, not from scratch.
> *"The excel macro we have for electrodes (taptites) … sinker edm burning of copper taptites into carbide inserts"* is a first-class asset on par with the Okuma OSP lathe macros — every electrode part in our system MUST have a corresponding entry.

**Non-goals (explicit, to keep scope sane):**
- ❌ NOT auto-emitting G-code from templates (the safety pipeline in `MACRO-PROGRAM-PIPELINE-MS0` handles that — templates feed it, never bypass it).
- ❌ NOT modifying `Automated Program_Corrected 5-25.xlsm` (operator-owned, read-only audit).
- ❌ NOT a full RAG / embedding stack from day one (catalog + cluster + template extract first; embeddings are a v2 improvement).

**Critical caveat (per [[feedback_box_programs_amateur]]):** Box-drive programs were written by amateurs without proper S/F discipline. **Treat historical S/F values as DATA, NOT GROUND TRUTH.** Template extraction extracts the *op-sequence* + *tool-numbering* + *fixturing pattern* + *macro-VC-var schema*; the *S/F band* is a stochastic distribution to compare against PRISM's physics-derived recommendation, NOT a target to converge on. If the historical S/F materially disagrees with `SpeedFeedOrchestrator`'s recommendation, log it as a deviation outcome (the operator may have known something the physics didn't — or may have been an amateur) — never silently override the physics.

---

## Corpus inventory (hard counts — read here, don't re-derive)

| Source | Path | Count | Notes |
|---|---|---|---|
| JM Die master archive | `H:/PRISM/JM DIE/` | 24,545 production NC files | 100+ customers (ITW, Alcoa, Optimas, SFS, Holo-Krome) |
| **JM Die authoritative index v2** | `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` (10.3 MB · rebuilt 2026-05-09 via `phase3b-v2-rebuild-jm-index.ps1`) | catalog | **the canonical join source for all 3 corpus-scanner units** — read this, don't re-walk the filesystem |
| Part Library (normalized) | `H:/PRISM/JM DIE/_PART LIBRARY/<customer>/<pn>/` | 25,028 part folders / 42,407 print pages / 10,678 program files | materialized via phase18 |
| Docustrata index | `H:/PRISM/Docustrata/` | indexed | phase15-huge + phase16-join + phase18-program-bind + phase19-customer-alias |
| Electrode files | (across `JM DIE/`) | **73** (39 .ipt · 17 .mcx-8 · 16 .iam · 1 .MIN) | hotspots: BIRMINGHAM/BFELECTRODE, NATHANS/OMG ELECTRODES ALL OD -.003, HAAS-HURCO BH-1414 ROUGHING/FINISHING |
| Taptite files | (across `JM DIE/`) | **22** | CONTINENTAL MIDLAN, ATF TAP, TAPTITE 2000, TOPURA |
| **TAPTITE ELECTRODE EXCEL MACRO** | `H:/PRISM/JM DIE/Automated Program_Corrected 5-25.xlsm` | 5.6 MB / 2026-04-10 | the canonical electrode-program generator — **safety-critical, READ-ONLY for this milestone** |
| Okuma OSP lathe macros | `H:/PRISM/JM DIE/Macro programs/` | 4 (wafer-insert, casing, casing-counterbore, top-hat-casing) | already cataloged by `MacroLibraryEngine` (this session, U-MACRO-LIB) |

## Acceptance criteria (omega_floor=1.0 per user's strict preference for all domain milestones)

- Every new engine ships with: real tests (reference values or algebraic invariants — NO `toBeDefined()` stubs), dispatcher wiring (import + call + action enum + schema), and a round-trip E2E assertion.
- Coverage floor per engine: happy path + ≥3 failure modes + ≥2 adversarial inputs.
- Variability floor: each engine exercises ≥3 families (e.g. for lathe: wafer-insert + casing + shaft; for mill: taptite + electrode + plate; for WEDM: taptite-electrode + carbide-die + punch-die).
- Read-only against the Excel macro file — audits MUST NOT write to `.xlsm`.
- Every template-emit path is gated by S(x) ≥ 0.70 + sim + operator-in-the-loop (delegated to `MACRO-PROGRAM-PIPELINE-MS0`'s gate).

---

## Units (7 in MS0 — same shape as MACRO-PROGRAM-PIPELINE-MS0, narrower scope per domain)

### MS0-U1 — LathePartFamilyTemplateExtractorEngine + corpus scanner (Lathe)
**Owner engine:** `LathePartFamilyTemplateExtractorEngine` (singleton in `src/engines/`).
**Methods:** `catalogCorpus({root, limit?})`, `extractTemplate(familyClusterId)`, `listTemplates()`, `getTemplate(family)`.
**Inputs:** corpus root path; uses `MacroProgramIntelligenceEngine` (Okuma macros), the lathe G-code parser (Mazak/Fanuc/Mitsubishi), `LathePartClassifierEngine`, `turning_feature_taxonomy`, `turning_rev_profile`.
**Output:** `TrainingTemplate` records (frontmatter: family, controller-baseline, representative parts, variability ranges, op-sequence, tool list, S/F bands, VC-var schema) saved into `mcp-server/data/training/templates/lathe/<family>.json`.
**Wires to:** `prism_turning` actions `lathe_training_corpus_status`, `lathe_training_template_list`, `lathe_training_template_match` + schemas. ALSO wire to `prism_cad` (template-placement re-uses the macro path).
**Tests:** ≥10 cases. Reference families: wafer-insert / casing / shaft / flange (≥3 from the corpus). Adversarial: empty corpus, malformed `.MIN`, unparseable customer dir.
**Companion script:** `Docustrata/.index/phase20-lathe-template-corpus-scan.py` (read-only walk + classify).
**Seed:** the existing 4 OSP macros are the wafer-insert / casing / casing-counterbore / top-hat-casing templates' seed; extend with shaft (stepped/threaded/keyway), flange (bored/bolt-circle), bushing/sleeve/hub (thin-wall), tube/hollow, taptite blanks, nut blanks, electrode rod blanks.

### MS0-U2 — MillPartFamilyTemplateExtractorEngine + corpus scanner (Mill)
**Owner engine:** `MillPartFamilyTemplateExtractorEngine` (singleton).
**Methods:** same shape as U1.
**Inputs:** uses `MillProgramAnalyzerEngine`, `MillProgramOptimizerEngine.analyzeProgram`, Mastercam `.mcx-8` parser, Inventor part-tree extractor, `cad_pattern_database`, `MillingStrategyLibraryEngine`.
**Output:** `mcp-server/data/training/templates/mill/<family>.json`.
**Wires to:** `prism_mill` (or `prism_cam`) actions `mill_training_corpus_status` / `_template_list` / `_template_match` + schemas.
**Tests:** ≥10. Families: taptite mills + electrode mills + plates (≥3). Adversarial: malformed mcx-8, missing Inventor reference, ipt with no features.
**Companion script:** `Docustrata/.index/phase20-mill-template-corpus-scan.py`.
**Seed families:** Taptite mills (Continental Midland, ATF Tap), Electrode mills (BH-1414, OMG `ELECTRODES ALL OD -.003`), Plates, Brackets/housings, Mold/die inserts, Aerospace brackets (Alcoa/ITW), Sheet-metal fixtures.

### MS0-U3 — Electrode-coverage gap audit (SAFETY-CRITICAL READ-ONLY)
**Goal:** verify every electrode part in our system has a corresponding entry in `Automated Program_Corrected 5-25.xlsm`.
**Owner script:** `Docustrata/.index/phase20-electrode-coverage-audit.py` (read-only; emits a markdown + JSON report).
**Owner engine:** `ElectrodeCoverageAuditEngine` (singleton). Methods: `enumerateElectrodes({roots[]})`, `parseExcelMacroRegistry({path})`, `crossReference({enumerated, registered})`, `report({format: 'md'|'json', outDir})`.
**Inputs:** all corpus roots; the Excel macro path (defaulted to `H:/PRISM/JM DIE/Automated Program_Corrected 5-25.xlsm`). Read via `exceljs` or equivalent — DO NOT write to the file.
**Output:** `state/shared/reports/electrode-coverage-<date>.{md,json}` with: total electrodes / by-extension / by-customer / by-hotspot / matched-in-Excel / unmatched / duplicate-names / naming-mismatch / coverage-percent.
**Wires to:** `prism_edm` action `wedm_electrode_coverage_audit` + schema. The action is read-only — no `_emit_` partner action in this unit.
**Tests:** ≥10. Cover: normal corpus, corpus with no electrodes, corrupt Excel, missing Excel (graceful fail with clear message), naming-variant cases (e.g. "BH-1414 ROUGHING ELECTRODE" vs "BH-1414 ROUGH"), `.ipt`-only and `.MIN`-only paths. Reference: at least the BFELECTRODE + BH-1414 + OMG family.
**Pre-existing inventory:** 73 electrode files / 22 taptite files (counted 2026-05-12).

### MS0-U4 — WEDMPartFamilyTemplateExtractorEngine + TaptiteElectrodeMacroBridgeEngine
**WEDM template engine:** mirror of U1/U2 — `WEDMPartFamilyTemplateExtractorEngine` over `JM DIE/WIRE EDM/` + the 26 indexed JM-Die WEDM programs.
**Bridge engine:** `TaptiteElectrodeMacroBridgeEngine` — a READ adapter around `Automated Program_Corrected 5-25.xlsm`. Methods: `listRegisteredElectrodes()`, `getElectrodeRecipe(electrodeName)`, `synthesizeProgram(electrodeName, partContext)` (returns G-code STRING ONLY — the safety gate in `MACRO-PROGRAM-PIPELINE-MS0` decides what happens with it).
**Two implementation paths** (build the parsed-snapshot one first; live-Excel is v2):
- **(a) Parsed snapshot (PRIMARY for MS0):** parse the Excel macro once (via `exceljs`), dump the electrode-types tab + parametric-formula tab to `mcp-server/data/training/electrode-registry/snapshot.json`. The bridge reads the snapshot. Stale snapshot → flag.
- **(b) Live Excel (deferred to v2):** drive Excel headless via COM (Windows-only) to execute the macro and read its output. Higher fidelity, more brittle.
**Wires to:** `prism_edm` actions `wedm_training_corpus_status`, `wedm_training_template_match`, `wedm_taptite_emit_from_macro`, `wedm_electrode_registry_list`, `wedm_electrode_registry_get` + schemas.
**Tests:** ≥10. Families: taptite electrode + carbide-die insert + punch-die. Adversarial: missing electrode name, electrode in registry but in physical corpus (gap), electrode in corpus but not registry (the audit's job), malformed Excel.
**Companion script:** `Docustrata/.index/phase20-wedm-template-corpus-scan.py`.
**Seed families:** Taptite electrodes (PRIMARY), Carbide-die inserts, Punch/die sets, PCD-tipped tooling, Aerospace turbine fir-trees, Mold inserts.

### MS0-U5 — Domain matcher engines (Lathe/Mill/WEDM PartFamilyMatcher) + dispatcher exposure
**Engines:** `LathePartFamilyMatcherEngine`, `MillPartFamilyMatcherEngine`, `WEDMPartFamilyMatcherEngine`.
**Methods (all 3):** `match({geometry, features, material, customer?, name?})` → `{family, confidence, template, nearest: [{partNumber, sxScore, runCount, lastShipped}]}`. Re-uses the same priority-cascade pattern as `MacroLibraryEngine.matchFamily()`.
**Output:** the matcher feeds the `/lathe` `/mill` `/wedm` mega-command pipelines' planning stage with "this part is closest to X — start there" + 3-5 nearest historical parts the operator can compare to.
**Wires to:** `prism_turning:lathe_training_template_match`, `prism_mill:mill_training_template_match`, `prism_edm:wedm_training_template_match` (the dispatcher actions live in U1/U2/U4 — this unit fills out the matcher logic).
**Tests:** ≥10 per engine. Cover at least 3 families per matcher with happy + boundary + null + adversarial.

### MS0-U6 — Closed-loop ingest (outcomes → template variability ranges)
**Goal:** every shipped part's actuals (cycle time, dim Cpk, tool life, chatter events, wire breaks, recast depth) update the matching template's variability ranges + confidence; stale templates get flagged for retirement.
**Owner engine:** `TrainingTemplateContinuousLearningEngine` (one engine, 3 domain methods: `ingestLatheOutcome()`, `ingestMillOutcome()`, `ingestWEDMOutcome()`). Or 3 small engines if cleaner.
**Inputs:** `feedback_loop_record` events from `prism_dev:feedback_record` + the domain AGI's continuous-learning hooks (`LatheAGIContinuousLearningEngine`, `MillingAGIMasterEngine`, `WireEDMAGIOrchestrator`).
**Output:** updates to `mcp-server/data/training/templates/<domain>/<family>.json` — bumped `runCount`, updated `sxScore` distribution, expanded/contracted `variability` ranges. Templates with `staleness > threshold` get flagged.
**Wires to:** `prism_dev` actions `training_template_outcome_ingest` / `training_template_staleness_report`.
**Tests:** ≥10. Cover: first outcome creates initial range, repeated outcomes converge, outlier outcome flagged not silently absorbed, staleness threshold trips at expected count, retirement workflow.

### MS0-U7 — `/learn-corpus` skill + close-out
**Skill:** `H:/prism/.claude/commands/learn-corpus.md` (or extend the existing `/learn` skill). Args: `lathe` / `mill` / `wedm` / `electrode-audit` / `status` / `match <part>`. Replaces freehand "look through prints" with a deterministic pipeline.
**Close-out checklist:**
- Update `state/shared/specs/DOMAIN-STUDIO-NODE-MAP.md` with the new training-corpus nodes.
- Wiki/index entries for the 6 new engines + `phase20-*` scripts + `electrode-registry/snapshot.json`.
- `ENGINE_DIGEST.md` regen.
- 3-way scrutiny gate.
- Operator runs `/learn-corpus electrode-audit` once → confirms the coverage report shows 100% (or flags the gaps for follow-up).

---

## Existing engines to wire (do NOT rebuild — found via `/dedup`)

- `MacroLibraryEngine` (this session, U-MACRO-LIB) — the Okuma OSP lathe macros + family priority cascade. U1's seed.
- `LathePartClassifierEngine`, `LatheJMDieKnowledgeEngine`, `LatheKnowledgeHarvesterEngine`, `LatheTribalInjectorEngine`, `LatheUnifiedScienceEngine` — already wired to `prism_turning`.
- `MillProgramAnalyzerEngine`, `MillProgramOptimizerEngine`, `MillingStrategyLibraryEngine`, `MillingPhysicsKernelEngine`, `cad_pattern_database`, `cad_feature_memory_*` — already in the codebase.
- `WEDMFeasibilityEngine`, `WEDMMLParameterOptimizerEngine`, `WEDMContinuousLearningEngine`, `WireEDMAGIOrchestrator`, `WEDMNeuralFormulaFusionEngine` — already in the codebase.
- `PartFolderOrganizerEngine`, `BlueprintProgramJoinEngine`, `BlueprintOCREngine` — for resolving parts ↔ folders.
- `prismSelfAwarenessEngine.searchTribalKnowledge()` / `.searchPlaybookRules()` — the experiential layer.

## Engines to build (6 + 3 phase scripts + 1 skill)

1. `LathePartFamilyTemplateExtractorEngine` + `LathePartFamilyMatcherEngine`
2. `MillPartFamilyTemplateExtractorEngine` + `MillPartFamilyMatcherEngine`
3. `WEDMPartFamilyTemplateExtractorEngine` + `WEDMPartFamilyMatcherEngine`
4. `ElectrodeCoverageAuditEngine`
5. `TaptiteElectrodeMacroBridgeEngine`
6. `TrainingTemplateContinuousLearningEngine`
+ `phase20-lathe-template-corpus-scan.py` / `phase20-mill-template-corpus-scan.py` / `phase20-wedm-template-corpus-scan.py` / `phase20-electrode-coverage-audit.py`
+ `/learn-corpus` skill

## Milestone-envelope JSON (to register at `mcp-server/data/milestones/TRAINING-LEARNING-MS0.json`)

```json
{
  "id": "TRAINING-LEARNING-MS0",
  "title": "Domain Starting-Template Corpus (Lathe + Mill + WEDM) + Taptite-Electrode Excel-Macro Bridge",
  "status": "scoped",
  "created": "2026-05-12",
  "owner": "claude-8f2683e8 / alpha",
  "omega_floor": 1.0,
  "roadmap_priority": 0,
  "track": "training",
  "total_units": 7,
  "completed_units": 0,
  "depends_on": ["MACRO-PROGRAM-PIPELINE-MS0"],
  "delivers": [
    "LathePartFamilyTemplate/Matcher engines",
    "MillPartFamilyTemplate/Matcher engines",
    "WEDMPartFamilyTemplate/Matcher engines",
    "ElectrodeCoverageAuditEngine + phase20-electrode-coverage-audit.py report",
    "TaptiteElectrodeMacroBridgeEngine (parsed-snapshot path)",
    "TrainingTemplateContinuousLearningEngine",
    "/learn-corpus skill"
  ],
  "non_goals": [
    "Auto-emitting G-code (handled by MACRO-PROGRAM-PIPELINE-MS0)",
    "Modifying Automated Program_Corrected 5-25.xlsm (read-only audit only)",
    "Full RAG/embedding stack (v2)"
  ]
}
```

---

**Bottom line:** every print, program, and CAD/CAM file in our shop becomes structured training data. Each domain matcher proposes "this new job looks like these 5 we've already shipped — start from that template." The taptite-electrode Excel macro is bridged as a first-class READ-ONLY asset, every electrode part is audited for coverage. No auto-emit — the templates feed the gated pipeline in `MACRO-PROGRAM-PIPELINE-MS0`, the operator is always in the loop.

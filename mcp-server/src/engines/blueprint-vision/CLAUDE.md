# blueprint-vision Galaxy -- slot:xray
> Universal rails (R1-R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama->Sonnet->Opus ladder · wiki protocol):
> -> `H:/prism/CLAUDE.md`. THIS file = blueprint-vision domain doctrine ONLY; never re-inline universal prose.

---

## 1. Domain scope + slot identity

**Owns:** OCR + blueprint reading + CAD file data extraction. Turns unstructured inputs (blueprints, PDFs,
raster scans, native CAD files) into structured PRISM data (features, tolerances, GD&T callouts, geometry,
materials). Owns multi-print PDF split discipline, VLM-ensemble OCR, extraction confidence gating, LoRA
training-set emission, and the blueprint->CAD/quote/program bridge surfaces.

**EXCLUDES:** CAD geometry authoring->delta; CAM toolpath->kilo; quote pricing logic->charlie;
G-code emission->echo; feature-to-strategy mapping->cam galaxy.

**Slot:** xray. Worktree: `H:/prism-slot-xray`. Branch: `slot/xray`.

**PROVENANCE:** Every engine name below was disk-confirmed 2026-05-29 by 3 parallel inventory agents
(correcting a 21-engine hallucination from the alpha seed). Before adding any new symbol here,
`Glob`/`Grep` it first -- never enshrine an unverified name.

---

## 2. Verified engines (all at `mcp-server/src/engines/*.ts`)

| Role | Engine file |
|------|-------------|
| Primary blueprint OCR | `BlueprintVisionOCREngine.ts` |
| OCR core + adapter | `BlueprintOCREngine.ts` + `BlueprintOCRAdapter.ts` |
| Live blueprint OCR adapter | `CADLiveBlueprintOcrAdapter.ts` |
| OCR pipeline + result model | `ImageOCRPipelineEngine.ts` + `OCRResultEngine.ts` |
| Tesseract bridge | `TesseractOCRBridgeEngine.ts` |
| Machine tag OCR | `MachineServiceTagOCREngine.ts` |
| PDF dimension extraction | `PDFBlueprintDimensionExtractorEngine.ts` |
| PDF pattern rescue | `PDFBlueprintPatternRescueEngine.ts` |
| RAG-assisted extraction | `BlueprintExtractionRAGEngine.ts` |
| GD&T callout parser | `GDTCalloutParserEngine.ts` + `PrismEnhancedGDTEngine.ts` |
| FCF syntax validator | `FCFSyntaxValidatorEngine.ts` |
| Tolerance stackup + generation | `ToleranceEngine.ts` + `ToleranceAwareGenerationEngine.ts` |
| DXF geometry + polygon parse | `DXFGeometryParserEngine.ts` + `DXFParserEngine.ts` |
| Fusion 360 (.f3d/.f3z) parser | `F3DSQLiteParserEngine.ts` |
| FreeCAD (.fcstd) parser | `FCStdNativeParserEngine.ts` |
| STL voxel grid | `STLToVoxelGridEngine.ts` |
| Feature recognition | `CADFeatureRecognitionEngine.ts` + `CADFeatureClassifierEngine.ts` + `FeatureRecognitionEngine.ts` |
| Lathe feature recognizer | `LatheTurningFeatureRecognizerEngine.ts` |
| Blueprint->CAD reconstruction | `BlueprintToCADGenerationEngine.ts` + `BlueprintToAllCADsOrchestratorEngine.ts` |
| Blueprint->program join | `BlueprintProgramJoinEngine.ts` |
| Corpus harvest + coverage | `BlueprintCorpusHarvestEngine.ts` + `BlueprintCoverageAuditEngine.ts` |
| LoRA training bridge | `BlueprintLoRABridgeEngine.ts` |
| Blueprint->quote bridge | `BlueprintToQuoteBridgeEngine.ts` |
| Ground-truth registry + validation | `GroundTruthRegistryEngine.ts` + `GroundTruthValidationEngine.ts` |
| Print->CAD orchestrator | `PrintToCADOrchestratorEngine.ts` |

No local `.ts` files exist in `engines/blueprint-vision/` -- all code lives at `engines/*.ts` top-level.
STEP/IGES backing engine class name unconfirmed -- route via dispatcher action, not a hardcoded class name.
No native reader for: SAT, OBJ, FBX, X_T (Parasolid) -- vendor SDK or forge required (standing gap).

---

## 3. Dispatcher quick-ref

**Primary: `prism_cad` / `cadDispatcher.ts`** (~40 blueprint-vision actions)

| Action | Use |
|--------|-----|
| `cad_pdf_blueprint_extract` | Multi-page PDF extraction entry point |
| `cad_pdf_pattern_rescue_extract` | Low-confidence OCR rescue |
| `cad_live_blueprint_ocr` | Live blueprint OCR via `CADLiveBlueprintOcrAdapter` |
| `cad_gdt_callout_parse` | GD&T callout parse |
| `cad_gdt_parse_enhanced` | Enhanced GD&T (`PrismEnhancedGDTEngine`) |
| `cad_tolerance_stackup` | Tolerance stackup |
| `cad_step_parse_file` | STEP file parse |
| `cad_dxf_geom_parse` | DXF geometry parse |
| `cad_f3d_parse` | Fusion 360 parse |
| `cad_fcstd_parse` | FreeCAD parse |
| `blueprint_to_all_cads` | Blueprint->CAD reconstruction |
| `blueprint_coverage_audit` | Corpus coverage audit |
| `blueprint_rag_extract` | RAG-assisted extraction |
| `feature_recognize` | Feature recognition |

Secondary: `businessDispatcher` (`blueprint_to_quote`, `blueprint_resolve_material`) ·
`qualityDispatcher` (`blueprint_compare_revisions`, `blueprint_extract`, `blueprint_inspection_plan`) ·
`camDispatcher` (`print_to_program_full`, `cam_feature_recognize`) ·
`resourceExtractionDispatcher` (`ocr_process`, `ocr_stats`) ·
`cadDrawingKnowledgeDispatcher` (`cad_select_gdt`, `cad_plan_drawing`).

Full action list: grep `cadDispatcher.ts` for the complete surface.
MCP-down fallback: `node scripts/blueprint-ocr-training-loop.mjs` (OCR pipeline).

---

## 4. Canonical constants + data paths

- **NEVER inline physics constants** -- import from `mcp-server/src/physics/constants.ts`.
- **Units:** every extracted dimension normalizes to mm internally. STEP files: read `CONVERSION_BASED_UNIT`
  header before ANY geometry work (25.4x trap). Imperial input allowed; imperial in the PRISM graph forbidden.
- **DocuStrata corpus:** `H:/PRISM/Docustrata/JMD Scans` + `JMD Laser Sheets` (257,992 files).
  Search `manifest.json` + `.index/` ONLY -- NEVER re-OCR the paid corpus.
  Dedup gate: `prism_data:database_search` against `JMDieDocuStrataDB` (111,745 entries) before extracting.
- **JM Die print corpus:**
  - `H:/PRISM/JM DIE/PRISM CAD TESTING/` -- test fixture prints
  - `H:/PRISM/JM DIE/REVERSE ENGINEERING/` -- ~36 mixed CAD/blueprint samples
  - `H:/PRISM/JM DIE/Prism JM Die/` -- 406 customer subdirs
  - Access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` -- NEVER Glob the 24K-file tree.
- **Extraction ledgers:** `state/shared/blueprint-extraction-*-<date>.jsonl` +
  `blueprint-accuracy-events.jsonl` -- dedup on source SHA before re-running.
- **OCR worklist:** `corpus-worklist-drawing.txt` (~7,794 prints) -- production task `PRISM OCR Training Loop`.

---

## 5. Domain gotchas / safety rails

1. **Multi-print split before OCR** -- one output object spanning N prints corrupts every downstream
   consumer. Use `scripts/extract-jm-die-corpus-page-by-page.py` (pypdf; 76x deeper than pdf-parse,
   per [[feedback_use_lima_pypdf_page_extractor]]). Phase21: 8,154 container PDFs -> 36,638 single-print PDFs.

2. **STEP AP203/AP214 carries geometry ONLY -- no GD&T.** GD&T survives via `PrintToCADOrchestratorEngine`
   side-channel. Never assume the STEP format carries GD&T.

3. **VLM JSON dropout (~30-37% prints lost):** `qwen2.5vl:7b` hits `num_predict:4096` mid-structure ->
   malformed JSON -> dropout. Fix `format:"json"` (Ollama grammar-constrained decode) is **SHIPPED**
   (commit `40b613afa7` U-XRAY-FORMAT-JSON-WIRE) -- `buildOllamaRequestBody` threads `opts.format`
   and the overnight wrapper (`run-ocr-training-loop-overnight.ps1`) passes `--format-json` on every
   ensemble call. `llama3.2-vision:11b` returns empty 100% (0/32 prints, tested 2026-06-10) -- DO NOT re-add it.

4. **Confidence-blind extraction is forbidden.** Every field emits `confidence: 0..1`. Verified floor:
   OCR per-field 0.70 -> operator-confirm (PRINT-TO-INSPECTION-PIPELINE-V2). Seed's 0.85/0.95/0.99 tiers
   are uncorroborated -- do not enforce them ([[reference_xray_confidence_thresholds_reconciled]]).

5. **CAD parser silent success** -- many parsers return empty geometry without erroring. Cross-check
   geometry volume vs source-file size; flag if implausible.

6. **Synthesis brain polluted** -- `knowledge/memories/patterns/blueprint-vision_synthesis.md` contains
   off-domain BM25 results (post-processor/holder/Fusion) as of 2026-06-10. Trust THIS CLAUDE.md +
   MEMORY.md over synthesis brain until re-synthesized. Fix owned by sierra/india.
   [[reference_xray_synthesis_pollution_2026_06_10]]

---

## 6. What NOT to do

- **NEVER OCR without multi-print split first** -- one object across N prints = corrupted downstream.
- **NEVER assume STEP carries GD&T** -- geometry only; GD&T via `PrintToCADOrchestratorEngine` side-channel.
- **NEVER re-OCR the DocuStrata paid corpus** -- search `manifest.json` + `.index/` first; dedup on SHA.
- **NEVER store an extracted dimension in imperial** -- normalize to mm before any downstream write.
- **NEVER skip per-field confidence emission** -- downstream S(x) gates depend on it.
- **NEVER parse GD&T callouts without datum-schema validation** -- FCF without datum-3-2-1 is meaningless.
- **NEVER trust a single VLM for safety-relevant dimensions** -- require >=2 VLM agreement (ensemble).
- **NEVER enshrine an unverified engine/action/path** -- Glob/Grep before writing (PROVENANCE rule).
- **NEVER export LoRA training data without anonymization** -- scrub names, part numbers, program content.
  Blocklist: ITW, OPTIMAS, SFS, HOLO-KROME, ALCOA, Continental Midland.
- **NEVER write directly to `knowledge/tribal/blueprint-vision-*.md`** -- auto-overwritten on regen;
  use `prism_knowledge:tribal_capture slot=xray`.

---

## 7. Domain workflow / pipeline contract

1. **Source SHA dedup** -- check `blueprint-accuracy-events.jsonl` + DocuStrata index before extracting.
2. **Multi-print split** -- `extract-jm-die-corpus-page-by-page.py` if PDF container.
3. **Per-print extraction** -- VLM ensemble (`scripts/lib/vision-ensemble-fuse.mjs`); >=2-agree=corroborated.
4. **GD&T side-channel** -- tie FCF to datum-3-2-1 schema via `PrintToCADOrchestratorEngine`.
5. **mm normalization** -- all dimensions normalized before downstream gate.
6. **Ground-truth stratification gate** -- 4-tier: `confirmed` (ERP-shipped+measured) > `produced` >
   `quoted` > `inferred`. Historical S/F + dims from amateur programs = DATA, not ground truth.
   Engines: `GroundTruthRegistryEngine` + `GroundTruthValidationEngine` -- EXTEND, never recreate.
7. **Ledger commit** -- entry to `blueprint-accuracy-events.jsonl`; publish outcome (see §10).

---

## 8. Tribal + corpus pointers

**Wiki entries (verified on disk):**
- [[architecture/blueprint-vision-knowledge-index]] -- compiled domain index; query first (auto-surfaced by `xray-blueprint-domain-inject.mjs`)
- [[architecture/blueprint-vision-galaxy]] · [[architecture/blueprint-vision-multi-print-discipline]] · [[architecture/blueprint-vision-extraction-confidence]]
- [[architecture/open-source-vision-options-for-blueprint-ocr]] · [[architecture/domain-blueprint]] · [[architecture/domain-pdf]] · [[architecture/domain-tolerance]] · [[architecture/domain-cad]]
- [[architecture/print-to-program-pipeline-canonical]] · [[lessons/cad-blueprint-revolve-2475-037]]
- [[code-tribal/blueprint-ocr-operator-wisdom]] + the 11 `code-tribal/blueprint-dim-*` callout tips
- **Missing -- do NOT link:** `lessons/blueprint-ocr-cad-reading-atlas` (memory only: `reference_blueprint_ocr_cad_reading_atlas_2026_05_27`), `architecture/cad-multi-system-arch`

**A/B benchmark:** `scripts/bench-vision-ocr-ab.mjs` + `scripts/lib/vision-ensemble-fuse.mjs` -- gating
mechanism for VLM upgrades; never run against real data yet. Run before any VLM promotion.

Tribal capture: `prism_knowledge:tribal_capture slot=xray` -- NEVER direct markdown writes.

---

## 9. Cross-galaxy edges (PSN)

- **-> delta (cad):** delta CONSUMES xray extractions (feature/geometry schema); xray adds orchestration + multi-print discipline on top of delta parsers.
- **-> kilo (cam):** kilo CONSUMES via `print_to_program_*`; tight extraction->toolpath contract.
- **-> charlie (quoting):** charlie CONSUMES via `blueprint_to_quote` (`BlueprintToQuoteBridgeEngine`).
- **-> foxtrot/whiskey/mike:** mill/lathe/wedm consume extracted features for print-to-program.
- **-> india (ai-training):** india CONSUMES extraction outcomes for GNN/LoRA loop; `BlueprintLoRABridgeEngine` feeds training sets.
- **-> victor (dormant-data):** `extracted/` subtree holds half-mined artifacts; coordinate before excavating.
- **-> lima/pdf-corpus:** bulk PDF infra + pypdf corpus; xray orchestrates on top.
- **-> juliett (database-expansion):** juliett OWNS the fast-search data layer xray queries (`manifest.json` + `.index/*.jsonl`). xray SEARCHES, never re-OCRs; new extractions feed juliett ingestion. NOTE: juliett CLAUDE.md does not yet list xray as consumer -- asymmetric edge; flag to juliett.

---

## 10. Closed-loop integration (india)

`xproc_outcome_publish {slot:'xray', domain:'blueprint-vision'}` after every extraction action.
Tribal capture: `prism_knowledge:tribal_capture slot=xray` (never direct markdown).
Full protocol: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.
Note: `xproc_outcome_publish` / `xproc_kg_project_features` / `xproc_calibration_monitor_record`
marked `// UNVERIFIED` until grep-confirmed in the dispatcher source.

---

## 11. Test commands

```bash
cd mcp-server && rtk npx vitest run -t "blueprint|ocr|vision|extraction|tolerance|gdt|feature"
node scripts/blueprint-ocr-training-loop.mjs --dry-run
node scripts/bench-vision-ocr-ab.mjs   # VLM upgrade gate -- run before any VLM promotion
```

---

## 12. Known bugs / open threads

- **VLM JSON dropout (~30-37% prints):** `format:"json"` constrained-decode **SHIPPED** (commit `40b613afa7`; `buildOllamaRequestBody` + `--format-json` in the overnight wrapper) -- no longer an open fix. [[reference_xray_ocr_yield_mechanics_2026_06_10]]
- **Closed-loop GT was LATHE-ONLY until `U-XRAY-MILL-PROGRAM-GT` (commit `d197fa6cd5`):** `extractMillProgramGT` (`scripts/lib/cnc-program-gt-lib.mjs`) now extracts mill hole/bore feature diameters (tool-comment dia + full-circle G2/G3 arc 2r) so `validate-perfect-parts` scores mill prints, not only lathe. Tap-drill + end-mill cutter + bare-SPOT diameters are EXCLUDED (not print callouts). [[reference_xray_mill_program_gt_2026_06_22]]
- **Calibration under-powered:** `reliable:false` (<50 samples, n~24). Do NOT use isotonic curve for safety gates until >=200 samples.
- **Synthesis brain polluted:** `knowledge/memories/patterns/blueprint-vision_synthesis.md` off-domain content pending sierra/india fix.
- **A/B benchmark unrun:** `bench-vision-ocr-ab.mjs` built 2026-06-03, awaiting quiet fleet window.

---

## 13. AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs blueprint-vision "<question>"
```

- Summarize STEP/DXF tree -> `gpt-oss:20b`
- Classify extracted dims / lint engine code -> `qwen2.5-coder:32b`
- Deep domain reasoning (ensemble consensus, ground-truth tier disputes) -> `gpt-oss:120b`
- VLM OCR: `qwen2.5vl:7b` primary (fix JSON dropout before relying on it); >=2-VLM agree = corroborated.

**Active domain hooks:**
- `.claude/hooks/xray-blueprint-domain-inject.mjs` -- domain context inject (UserPromptSubmit)
- `.claude/hooks/blueprint-accuracy-guard.mjs` -- HARD-BLOCKS >20% conformal-bound widening (knob: `PRISM_BLUEPRINT_DRIFT_WIDEN_PCT`)
- `.claude/hooks/blueprint-coverage-floor-guard.mjs` -- enforces min coverage floor
- `.claude/hooks/blueprint-join-index-stale-check.mjs` -- flags stale blueprint<->program join index
- `.claude/hooks/cost-bridge-on-pdf-extract.mjs` -- bridges PDF-extract -> charlie quote pipeline

## AI Synergy (PSN leg #10)

This galaxy is a first-class AI-substrate **participant** -- it OWNS 2 AI engine(s) (e.g. `BlueprintExtractionRAGEngine`, `BlueprintLoRABridgeEngine`), wired to PSN leg #10 via `blueprint_lora_`, `blueprint_lora_actions`, `blueprint_lora_prepare_set`.
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs blueprint-vision "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/blueprint-vision_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._

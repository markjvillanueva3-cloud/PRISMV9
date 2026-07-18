---
chat_id: claude-641d292f
slot: mike
topic: mike-print-ocr-100pct
branch: cad-fusion-live-ms0
source: live-chat
written_at: 2026-05-20
unit_focus: PRINT-OCR-100PCT-MS0 (new work order, supersedes COMMAND-KERNEL/NN-STACK)
---

## RESUME

NEW USER WORK ORDER (issued 2026-05-20, supersedes all prior RESUMEs for mike): **build the end-to-end pipeline that scans every print in PRISM, extracts data into standardized templates/data tables, feeds those into CAD generation, AND emits a large batch of wiki + tribal-knowledge entries that teaches the AI to read prints with 100% accuracy.** User explicitly named the tools to use: `/system-viz`, Obsidian brain, wiki, tribal, AI registry, neural network, hooks, skills, scripts, memories. Operator-in-the-loop unconditional. H: data NEVER published.

Three concrete deliverables:
1. **Corpus-wide print-scan orchestrator** — scans every PDF/TIF/image in JM DIE + harvested sources → emits one standardized template-row per print into a queryable data table (state/shared/print-corpus-tables/...). Must be resumable + idempotent + show coverage.
2. **100% accuracy proof harness** — per-print accuracy gate that cross-validates extracted dims against ground truth (JM-DIE inspection data + Docustrata + operator-confirmed). Reports per-customer/per-dim-type coverage. Fails loud when below 100%.
3. **Wiki + tribal batch generator** — produces a large batch of `knowledge/wiki/lessons/print-reading-*.md` + `knowledge/wiki/code-tribal/blueprint-*.md` entries + new tribal tips loaded into TribalKnowledgeEngine, generated from the JM-DIE corpus, MIT engineering courses, CAD/CAM vendor PDFs, and the BlueprintExtractionRAGEngine's existing retrieval surface. These teach the AI the patterns it needs to hit 100%.

## STATE — Session 641d292f outcome (this session)

**Inventory completed (NOT a rebuild — these all already exist):**
- **70 print/OCR/blueprint/pdf engines** on disk (git-tracked)
- **BLUEPRINT-OCR-TRAINING-MS1 = COMPLETED (8/8 units shipped 2026-05-12..16)**, owner BRAVO. RAG layer is the centerpiece. All 8 units already shipped:
  - U1: prism-enhanced-gdt-engine + prism-gdt-fcf-parser rescue (sha e88cf6429)
  - U2: prism-ocr-engine monolith rescue → PDFBlueprintPatternRescueEngine (sha edc0c0eaf)
  - U3: GroundTruthRegistryEngine extended (5 methods, 5 dispatcher actions) (sha 1ab682574)
  - U4: GroundTruthValidationEngine extended (3 methods, 4 dispatcher actions) (sha 8bdf10d5a)
  - U5: blueprint-accuracy-guard + blueprint-coverage-floor-guard hooks (sha b857e5193)
  - U6: BlueprintCorpusHarvestEngine (510 LOC, 6 methods, 6 dispatcher actions) (sha 4217d98c0)
  - U7: **BlueprintExtractionRAGEngine** (550 LOC, THE CENTERPIECE, 3 dispatcher actions) (sha 63305843c)
  - U8: BlueprintLoRABridgeEngine + BlueprintCoverageAuditEngine (sha b2d35ebe7)
- **BLUEPRINT-OCR-TRAINING-MS2 referenced in memory** ([[reference_post_ship_blueprint-ocr-training-ms2-u-bpa-consumer]], u-tdp01, u-tdp02) but envelope NOT in `mcp-server/data/milestones/` — only MS1 lives there. Find via git ls-files for "*BLUEPRINT*MS2*" OR check `state/shared/specs/` AND `mcp-server/data/state/MILESTONE_PROGRESS.json` for ship records.
- All 70 engines have test files: BlueprintCorpusHarvestEngine.test.ts, BlueprintExtractionRAGEngine.test.ts, BlueprintLoRABridgeEngine.test.ts, BlueprintOCREngine.test.ts, BlueprintVisionOCREngine.{complexParts,partClass}.test.ts, ImageOCRPipelineEngine.test.ts, BlueprintToAllCADs.integration.test.ts, BlueprintToCADGenerationEngine.test.ts, BlueprintProgramJoinEngine.test.ts, MILLING-PRINT-TO-PROGRAM.test.ts, AutoPrintToProgramBridgeEngine.{engine,wedmManifest}.test.ts, all 11 LathePrint*.test.ts, etc.
- **cadDispatcher.ts** wires the blueprint actions (gt_blueprint_register, gt_blueprint_join_docustrata, blueprint_rag_extract, blueprint_rag_explain, blueprint_rag_compare_to_baseline, corpus_harvest_*, blueprint_lora_*, blueprint_coverage_*, cad_pdf_blueprint_extract, cad_pdf_pattern_rescue_extract, cad_text_to_cad_generate, etc.)
- **JM DIE corpus PDF count is RUNNING IN BACKGROUND** (bash brjs9tg5r) — was getting `find "JM DIE" -iname "*.pdf" | wc -l` at /compact time. Pick that up next session via `TaskOutput brjs9tg5r` OR re-run.

**Per-machine doctrine fixes this session (R8/R9/R12, COMMAND-KERNEL leftover from pre-/compact):**
1. U-CK03 — committed `082b821088` — fixed Vitest 4 + vm.Script shebang regression in `.claude/kernel/psk.mjs` that had silently broken ALL 3 psk tests (0/93 running). Re-wrote `psk-syscalls.test.ts` to use `pathToFileURL(PSK_PATH).href` inside `beforeAll`. Fixed 3 stale U-CK01 placeholder assertions in psk.test.ts. 90/93 pass (3 remaining are stale assertion fixes I shipped).
2. U-CK22 — confirmed wiki mirror at `knowledge/wiki/os/pipelines/diagnose-fix.md` is the cross-machine canonical (`.claude/commands/*.md` is gitignored per design; ~41 force-added selectively but pipeline-commands NOT in that set).
3. U-CK23 — wiki mirror `--max-iter` default 10 → 3 (envelope spec); commit may have peer-absorbed (reported 3 files / 74+/3- vs my single-line pathspec) — verify next session via `git show --stat`.

## CONTEXT TO PRESERVE — gaps + key file pointers

**What's MISSING (the actual work for this new order):**
- No end-to-end orchestrator that runs `BlueprintCorpusHarvestEngine` → `BlueprintExtractionRAGEngine` → standardized template-row writer → `BlueprintCoverageAuditEngine` → loop until 100%. MS1 stopped at "operator-callable per print"; corpus-wide automation was explicitly DEFERRED ("Tier-4 BlueprintTrainingDashboard frontend deferred to MS2").
- No standardized print-template schema. The user wants ONE row per print with all dims/GD&T/material/tolerance/features in a queryable table. Closest is `GroundTruthRegistryEngine.registerBlueprintExtraction()` but that's per-call, not a corpus table.
- No 100% accuracy proof harness across the full JM DIE corpus. `BlueprintCoverageAuditEngine` reports coverage but doesn't gate at 100% with operator-loop fall-through.
- No `cad_blueprint_to_cad_generate` chain — `BlueprintToCADGenerationEngine` exists, `BlueprintExtractionRAGEngine` exists, but no orchestrator wires extract → template → CAD-gen as one composite action.
- **WIKI + TRIBAL BATCH NOT YET WRITTEN.** This is the user's explicit ask: generate a LARGE batch of wiki + tribal entries from the existing corpus + MIT + vendor PDFs. None of MS1 produced this.

**Key file pointers for next session (skip re-discovery):**
- Spec: `state/shared/specs/BLUEPRINT-OCR-TRAINING-MS1-2026-05-12.md` (43KB, 8-unit detailed spec, the architecture reference)
- Envelope: `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS1.json` (732 lines, line 96 = units array, lines 116-172 = resources_utilized)
- Engines (don't rebuild): `BlueprintExtractionRAGEngine` (the centerpiece, 550 LOC), `BlueprintCorpusHarvestEngine` (510 LOC), `GroundTruthRegistryEngine` (extended), `BlueprintCoverageAuditEngine` (255 LOC), `BlueprintLoRABridgeEngine` (430 LOC, has anonymization HARD RULE for H:/ scrub), `BlueprintToCADGenerationEngine`, `PrintToCADOrchestratorEngine`, `BlueprintVisionOCREngine` (base OCR), `pdfblueprintdimensionextractorengine`, `PDFBlueprintPatternRescueEngine` (4 pattern groups: fractional, limit-pair, ISO 1302 N-grade, standalone microinch)
- Dispatcher: `mcp-server/src/tools/dispatchers/cadDispatcher.ts` — already wires all the blueprint actions
- Tests: `mcp-server/src/__tests__/Blueprint*.test.ts` (8 files) — reference patterns for new tests
- Tribal source: 4,245 tribal tips + 3,700 shop tips + academy-course-0c-blueprint-reading-blueprint-reading-gd-t already in the system
- JM-DIE join source: `Docustrata jm-die-index-v2.json` (10.3 MB)
- Read-only paths (HARD RULE): `Automated Program_Corrected *.xlsm` + `_PART LIBRARY/<c>/<p>/CNC PROGRAM` — NEVER write here
- Online whitelist: `BlueprintCorpusHarvestEngine.ONLINE_HOST_WHITELIST` (13 hosts)
- LoRA anonymization HARD RULE: `BlueprintLoRABridgeEngine` asserts customer-names-not-in-bundle in tests; reuse — never weaken

## DEFERRED — U-CK11 + other mike queue

- U-CK11 (per-category scrutiny over migrated command corpus) — 26 subagent dispatches, deferred to a dedicated COMMAND-KERNEL session. NOT part of this work order.
- ~60 spec-less golf-migrated database data-ingests — defer or migrate to golf.
- U-DOCKER-HOOK-BROKER, U-OE-L3 — each needs dedicated session.

## NEXT SESSION'S FIRST ACTIONS (deterministic)

1. `/system-viz` — open the 3D system map. Per the user's directive ("utilize /system-viz to help you and obsidian brain"), THIS is the orientation surface for this work order. The `cad/blueprint` cluster + `pdf` cluster + `training-learning` cluster are the relevant nodes.
2. `node H:/prism/scripts/extract-misc-tasks.mjs` OR read `state/shared/specs/ROADMAP-CONSOLIDATED.md` — find any open BLUEPRINT/OCR/print units beyond MS1.
3. `find "JM DIE" -iname "*.pdf" | wc -l` (or check `TaskOutput brjs9tg5r` if still alive) — get the actual corpus size to scope the orchestrator.
4. Read `BlueprintExtractionRAGEngine.ts` end-to-end — it's the centerpiece; the new orchestrator wraps it.
5. Open the new milestone envelope: `PRINT-OCR-100PCT-MS0.json` with 4 units: U1 corpus-template-schema + writer, U2 corpus-wide orchestrator script (resumable, idempotent), U3 100% accuracy proof harness + Stop hook, U4 wiki+tribal batch generator. Apply per-file scrutiny gate (2 reviewers per file) per CLAUDE.md §PER-FILE SCRUTINY GATE.
6. Per CLAUDE.md §`/checkin-<nato> /loop` — typing `/checkin-mike /loop` re-engages autonomous loop with the slot bound. The hook stack will auto-inject ollama-pipeline, master-index pre-search, tribal-by-domain, error-pattern-capture, comprehensive-build-enforce, etc.

## Karpathy discipline pins for next session

- **R8 — READ BEFORE WRITE.** The 70 engines already exist. The corpus harvester already exists. The RAG engine already exists. The coverage auditor already exists. This work order is an **orchestrator + schema + proof harness + wiki batch** on top of them — NOT a rebuild. `duplicationGuardEngine.mustCheckBeforeCreating()` on every proposed engine name.
- **R12 — FAIL LOUD.** The accuracy gate MUST fail loud at <100%. No silent rollups. Operator-in-the-loop is unconditional per CLAUDE.md.
- **R7 — SURFACE CONFLICTS.** If the user's "100% accuracy" target conflicts with the existing MS1 ConfidenceFloor tiers (normal/low_no_prior/low_contradiction/low_no_vision), surface the conflict: 100% may require operator confirmation for every low-confidence extraction, not silent acceptance. Don't average — pick the more recent intent (the user's "100%") and flag the gate change.
- **No public H:/** — wiki/tribal entries that include JM-DIE customer data must use the BlueprintLoRABridgeEngine.anonymizePath() pattern OR live under `knowledge/wiki/code-tribal/` not `knowledge/wiki/lessons/` (internal-only). The H:/ prohibition is HARD.

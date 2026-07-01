# Blueprint-Vision Training Readiness — slot:xray, 2026-05-29

> **Goal (operator):** train the OCR / blueprint-reading / CAD-file-data-extraction AI across all files available on the H: drive.
> **What "training" means in PRISM** (per `state/shared/specs/BLUEPRINT-OCR-TRAINING-MS1-2026-05-12.md`): PRISM does NOT update vision weights on-device. It **assembles a ground-truthed LoRA/RAG corpus**; the actual fine-tune runs **externally** (Gemini / OpenAI / Modal) and the resulting endpoint plugs into `AISystemRouterEngine` as a backend. So this is a **data-pipeline + corpus-readiness** task, not a local trainer.
> **Slot boundaries (R8 + CHAT-SLOT-DOMAINS):** xray PRODUCES the extraction corpus · india OWNS model training/deploy/fine-tune (`/ai-train-india`, NN/GNN/LoRA/RAG) · juliett OWNS the persistence/DB layer (`jm-die-database`, Qdrant). xray never re-OCRs the paid-for corpus and never rolls its own trainer.

## 1. Verified corpus state (juliett `mcp-server/data/jm-die-database/manifest.json`, 2026-05-29)
- DocuStrata root `H:/PRISM/Docustrata` — **257,992 files**, ~95.6 GB.
- **111,745 indexed_documents** · 73,506 classified_v3_enriched · **38,251 jm_die_files_indexed** · **76,205 blueprint↔program joins**.
- **56,887 documents WITH a text layer** → extractable to text **WITHOUT OCR** (no Ollama/vision needed — the no-blocker seed).
- **73,506 documents NEED OCR** → require the GPU-OCR batch (out-of-session).
- Source index (already extracted/classified, the reuse surface): `H:/PRISM/Docustrata/.index/documents-classified-v3.jsonl` (66 MB) — per-doc records carry `needs_ocr`, `has_text_layer`, `text_layer_chars`, `disk_path`, `inferred_role`, `role_confidence`, `print_score`, `print_indicators`.
- Additional H: print/CAD roots beyond DocuStrata: `H:/PRISM/JM DIE/` (~2,158 entries depth-2; `PRISM CAD TESTING/`, `REVERSE ENGINEERING/`, `Prism JM Die/` 406 customer dirs) · `H:/PRISM/resources/` (~1,182 entries; `CAD FILES`, `RESOURCE PDFS`, Basic-Training-Day dirs).

## 2. Pipeline inventory — BUILT + WIRED (verified on disk)
| Component | Path | Role | State |
|-----------|------|------|-------|
| LoRA bundle producer | `mcp-server/src/engines/BlueprintLoRABridgeEngine.ts` | ground-truth pairs → anonymized LoRA bundle → `mcp-server/data/training/lora/staging/` | built+wired; **never run** (staging dir absent) |
| Corpus harvest | `BlueprintCorpusHarvestEngine.ts` | harvest blueprint sources into corpus | built |
| RAG extraction | `BlueprintExtractionRAGEngine.ts` | RAG-assisted extraction, cite ≥1 source | built (`blueprint_rag_*`) |
| Coverage audit | `BlueprintCoverageAuditEngine.ts` | extraction coverage % + retrain flag | built (`blueprint_coverage_*`) |
| Ground-truth | `GroundTruthRegistryEngine.ts` + `GroundTruthValidationEngine.ts` | 4-tier ground-truth (confirmed>produced>quoted>inferred) | built — **EXTEND, never recreate** |
| Corpus→train/val | `scripts/lora-dataset-builder.mjs` | generic `--corpus <jsonl> --track-field` → `<track>-train/val.new.jsonl` (operator promotes) | built; needs a corpus.jsonl input |
| OCR batch | `scripts/extract-jm-die-corpus-page-by-page.py` + `docustrata-pipeline.py` (gpu-ocr stage) | page-by-page pypdf + GPU-OCR | built (out-of-session GPU job) |
| Vision fallback | `scripts/lib/ollama-vision-extract-lib.mjs` | low-confidence vision-LLM | built (**Ollama vision DOWN 2026-05-29 — /api/chat dead**) |
| Drift guard | `.claude/hooks/blueprint-accuracy-guard.mjs` | HARD BLOCK on >20% conformal-bound widening | wired |

Dispatcher actions (all wired): `blueprint_lora_{prepare_set,export,register_endpoint,history}` · `blueprint_rag_{extract,explain,compare_to_baseline}` · `blueprint_coverage_{audit,by_customer,flag_retrain,report}` · `cad_pdf_blueprint_extract` · `cad_pdf_pattern_rescue_extract`.

## 3. The gap (why we are NOT training-ready yet)
1. **Ground-truth/accuracy ledgers are EMPTY** — `state/shared/blueprint-accuracy-state.json` window=[], 0 outcomes; `blueprint-accuracy-events.jsonl` = 2 lines. So `BlueprintLoRABridgeEngine.prepare_set` has **no training pairs to export**.
2. **No assembled `corpus.jsonl`** for `lora-dataset-builder` to split.
3. **73,506 docs un-OCR'd** + **Ollama vision daemon DOWN** (can't OCR now).
4. **`mcp-server/data/training/lora/staging/` does not exist** — the bridge has never run.

## 4. Execution plan (ordered; xray does 4.1–4.3, india does 4.5, operator unblocks 4.4)
**4.1 — Corpus partition manifest (NO OCR, no Ollama, no PDF reads — do FIRST, unblocked, in-session-runnable):** ⚠ **DATA FINDING 2026-05-29 (corrects an earlier draft of this step):** the `classified-v3.jsonl` records do NOT store raw text — they carry `text_layer_chars` + a structured `extracted` object that is **business-document fields** (tax/vendor/customer/line_items/PO/quote_validity), NOT blueprint dimensions. Sampled `has_text_layer:true` docs are `inferred_role:UNKNOWN` with low/negative `print_score` → **the text-layer subset skews to invoices/quotes/POs (charlie-quoting + hotel-ERP domain), NOT blueprints.** Real blueprints are scanned drawings → mostly `needs_ocr:true`.
   So step 4.1 is NOT a clean blueprint seed. The correct first build is a **partition manifest**: stream `documents-classified-v3.jsonl` (66 MB, line-by-line, no PDF reads) → classify each doc into `{blueprint_text_ready: print-like AND has_text_layer, blueprint_needs_ocr: print-like AND needs_ocr, non_blueprint: business-doc}` using `print_score`/`print_indicators`/`inferred_role` → emit `state/shared/blueprint-training-partition.json` (counts + per-bucket work-lists). This is the precise input the GPU-OCR batch (4.4) and the LoRA prep (4.3) consume. **In-session-runnable** (stream, no OCR). Build: `scripts/build-blueprint-training-manifest.mjs`. The few `blueprint_text_ready` docs can then be text-extracted (`pdf-text-extract-lib.mjs:extractDimensionsFromText` per `disk_path`) as the only true no-OCR seed.
**4.2 — Ground-truth pass:** route the seed through `GroundTruthValidationEngine`; tier each pair (`confirmed` only where ERP-shipped+measured or operator-confirmed; everything else `quoted`/`inferred`). Historical amateur-program S/F is DATA, not ground truth.
**4.3 — LoRA prepare_set:** `BlueprintLoRABridgeEngine.prepare_set` → anonymized bundle (scrub customer names + PNs; blocklist ITW/OPTIMAS/SFS/HOLO-KROME/ALCOA/Continental Midland) → `mcp-server/data/training/lora/staging/`. Then `lora-dataset-builder.mjs --corpus <seed.jsonl> --track-field inferred_role` for the train/val split.
**4.4 — GPU-OCR batch (OPERATOR, out-of-session):** restart Ollama vision (`/api/chat`), then run `docustrata-pipeline.py --only gpu-ocr` (or `extract-jm-die-corpus-page-by-page.py`) over the 73,506 needs-OCR docs → feeds the accuracy ledger → re-run 4.2–4.3 with the full corpus.
**4.5 — Fine-tune (INDIA, external):** `BlueprintLoRABridgeEngine.export` → register endpoint via `blueprint_lora_register_endpoint`; india runs the external fine-tune (Gemini/OpenAI/Modal) and plugs the endpoint into `AISystemRouterEngine`. Per `/ai-train-india` + the NN-GRAPH deploy-gate discipline (promote only on metric-gate pass).

## 5. Blockers + owners
- 🔴 **Ollama vision daemon DOWN** (`/api/chat` dead, GPU contention) — operator: restart Ollama / free GPU. Blocks 4.4 + any vision-fallback OCR.
- 🟡 **GPU-OCR of 73,506 docs / 95 GB** — out-of-session batch (operator-run); cannot run in a chat.
- 🟡 **External fine-tune** — india's domain + an external provider; not local.
- 🟢 **Text-layer seed (4.1)** — unblocked, but a 56K-file batch (out-of-session script run, not a chat).

## 6. Honest scope (R12)
This session VERIFIED the corpus + pipeline state, discovered the text-layer-skews-business-doc constraint (DATA FINDING in §4.1), and produced this executable plan. It did NOT run the bulk OCR (73K docs / 95 GB) or fine-tune — both are out-of-session GPU/external jobs by nature, and the vision daemon is currently down. **The next in-session-buildable unit is `scripts/build-blueprint-training-manifest.mjs` (§4.1 partition manifest)** — a deterministic, no-OCR, no-PDF-read streamer over `classified-v3.jsonl` that partitions the 257K corpus into `{blueprint_text_ready, blueprint_needs_ocr, non_blueprint}` by `print_score`/`inferred_role`. It tells the operator EXACTLY how many real blueprints need the GPU-OCR run (4.4) and seeds the LoRA prep (4.3) work-lists — without the OCR/Ollama blocker. Build that next; then 4.4 (operator GPU-OCR) and 4.5 (india fine-tune) are the out-of-session remainder.

## 7. Supervised training design (operator directive 2026-05-29) — CAD + programs ARE the labels
The insight: **don't hand-label prints.** A part's CAD file (exact geometry/dimensions) + its CNC program (the machined features) ARE the ground-truth answer key. Train "how to read a print" by aligning `print → (CAD geometry + program features)`; the print is the input, the CAD/program are the labels. No human labeling on the bulk set.

**Final eval (operator):** extract data from a print ALONE → did we pull EVERY feature/dimension? → generate a CAD file and compare to the known CAD. A pass = the print→CAD round-trip reproduces the reference geometry within tolerance. This is delta's consumer contract (`PRINT-TO-CAD-HANDOFF-CONTRACT`) used as the training eval. ML discipline: split by part_number (NEVER leak a part across train/val/test); stratify by `inferred_role`/feature-class; the round-trip is the out-of-distribution test.

**Data readiness (verified 2026-05-29):**
- ✅ **print↔program answer-key EXISTS** — `H:/PRISM/Docustrata/.index/blueprint-program-join-full-v6.jsonl` (76,205 part_numbers; each row = `{part_number, blueprints[]{doc_id,filename,drawing_score}, programs[], match_confidence, print_customers}`). The CNC programs encode actual machined dims/features → strong labels.
- ⚠️ **print↔CAD join MISSING** — the v6 join has NO CAD ref (`has CAD ref?: false`). CAD files (`jm-die-index-v2` 38,251 + `H:/PRISM/resources/CAD FILES`) must be joined to part_number. **Next in-session build: `scripts/build-blueprint-cad-program-pairs.mjs`** — join v6 (print↔program) + a part_number→CAD-file index → emit the supervised triple `state/shared/blueprint-training-pairs.jsonl` (`{part_number, print_docs, program_files, cad_files, label_source}`). Deterministic, no OCR, in-session-runnable.

**Ollama vision status (2026-05-29, verified):** daemon UP (5 text models: qwen2.5-coder:7b/3b, mistral:7b, codellama:7b, nomic-embed-text) but **NO vision model pulled**, and `/api/chat` HANGS (GPU contention — NIM endpoints). The OCR lib (`scripts/lib/ollama-vision-extract-lib.mjs`) wires `moondream` — too weak for dimension OCR at the accuracy bar; recommend `minicpm-v` or `llama3.2-vision` or `qwen2-vl` (india's call). **Operator unblock:** (1) free the GPU (stop NIM/contending procs so `/api/chat` responds); (2) `ollama pull <vision-model>`; (3) run the GPU-OCR batch over the 12,321 `blueprint_needs_ocr` docs. Until both, the bulk OCR + supervised training cannot start.

**Pipeline (supervised):** v6 join + CAD join → `blueprint-training-pairs.jsonl` → [OCR the 12,321 prints once GPU/vision ready] → for each print, extract features → label against the paired CAD+program → `GroundTruthValidationEngine` tiers → `BlueprintLoRABridgeEngine.prepare_set` (anonymized) → india external fine-tune → round-trip eval (print→CAD vs reference).

— slot:xray (U-PSGB-XRAY continuation, /goal training push). Owners to coordinate: india (training + model choice), juliett (DB/corpus + CAD join), operator (free GPU + pull vision model + GPU-OCR batch), delta (round-trip CAD eval consumer).

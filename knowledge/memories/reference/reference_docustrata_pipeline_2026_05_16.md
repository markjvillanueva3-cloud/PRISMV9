---
name: docustrata-pipeline-2026-05-16
description: "Docustrata print-reading pipeline — the \"104K unscanned\" backlog was a phantom (counted _organized/ copies); real delta is 7235 PDFs. 3 scripts shipped foxtrot 2026-05-16: phase22 delta-detector, phase6b delta-bridge, docustrata-pipeline.py orchestrator."
aliases: reference_docustrata_pipeline_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.089Z
---


# Docustrata print-reading pipeline — slot foxtrot, 2026-05-16

claude-32a39c0c, /loop "do it all" (post-/compact, /checkin-foxtrot). Built the unified print-reading pipeline for JM Die's `H:/prism/Docustrata/` document archive. 3 new scripts in `Docustrata/.index/`, each cleared by the per-file 2-agent scrutiny gate.

## The "104K unscanned" was a PHANTOM (the key finding)

A prior audit/handoff claimed ~104K-215K unscanned PDFs needing re-index. **False — a counting artifact.** Reality (measured by `phase22-delta-detector.py`):
- Raw `*.pdf` walk of the whole `Docustrata/` tree = **252,364** files.
- **140,909** of those live under `_organized/` — physical COPIES from `phase4-reorg-copy-only.py` + `phase21-split-containers.py`, NOT source documents.
- Genuine source corpus = **111,455** PDFs. phase6 ledger (`pdf-page-counts.jsonl`) covered **104,220** unique disk_paths.
- **TRUE delta = 7,235 PDFs** (~3.1 GB), 0 ghosts, 0 corrupt ledger lines.
The "104K" came from subtracting phase6's count from the inflated whole-tree total — it counted the `_organized/` copies as new work. Any future audit MUST exclude `_organized/` + `.index/`.

## Scripts shipped (all in `H:/prism/Docustrata/.index/`)

1. **phase22-delta-detector.py** — whole-tree walk minus generated dirs, set-diff vs phase6 ledger (case/separator-normalized). Outputs `phase22-delta-pdfs.jsonl` + summary. Fails loud on empty/corrupt ledger (won't report whole corpus as delta). Junction-safe walk.
2. **phase6b-delta-page-count.py** — the delta BRIDGE. phase6 is document-index-driven so it can't see the 7,235 (they're on disk, not in `documents-classified.jsonl`). phase6b page-counts them (parallel Pool) and APPENDS to `pdf-page-counts.jsonl` in phase6's schema (`inferred_role="UNKNOWN"` so phase7's role filter accepts them; deterministic uuid5 ids; `source:"phase6b-delta"` provenance). RAN 2026-05-16: 7,235 counted, 0 missing, 0 corrupt, 34,761 pages (6,876 multi-page → phase7/15 eligible, 359 single-page).
3. **docustrata-pipeline.py** — the KEYSTONE orchestrator. Declarative 7-stage table (delta-detect → delta-page-count → text-density → deep-rescan → verified-rollup[EXTERNAL] → split-containers → gpu-ocr), cost-cascade order. Sequences existing `phaseN-*.py` scripts as subprocesses — never reimplements. Taint-propagation: a failed/stale stage taints its output files; downstream consumers BLOCK rather than run on bad data. Per-stage log files. GPU-gated. `--list/--dry-run/--from/--to/--only/--skip-gpu`.

## Durable lessons

1. **phase21 (prior session) split 8,154 container PDFs → 36,638 single-print PDFs** into `_organized/PRINTS/` (0 errors). That output is what inflated the raw walk count.
2. **phase7 role filter**: keeps only `inferred_role ∈ {SCAN_GENERIC,UNKNOWN,IMPORTED_BATCH}` AND `page_count>=2`; missing role defaults to `UNKNOWN` (accepted). Any new ledger row must tag a passing role.
3. **`verified-rollup` producer FOUND + WIRED (2026-05-16 post-/compact)** — the producer was never missing. It lives at `scripts/docustrata/phase20-verified-prints-index.py` (git-tracked, outside `.index/`), so the orchestrator had it stubbed `script:None` EXTERNAL. Wired in via a new `_repo()` path helper (resolves into the PRISM repo, parent of the Docustrata archive). The pipeline is now end-to-end runnable with NO out-of-band step. The `run_stage` EXTERNAL `script is None` branch is kept intact (general mechanism, now unused).
4. **`ingestion-cache-root-guard.mjs` hook false-positives** on every Write under `Docustrata/` — file persists anyway (PostToolUse). Pipeline scripts MUST stay in `.index/` (sibling-phase convention + `__file__`-relative paths).
5. **GPU stages blocked**: Docker daemon was DOWN (API 500); no Ollama vision model. But torch+CUDA IS available locally (RTX 4080) — the orchestrator's `gpu-ocr` stage (phase9, Qwen2.5-VL) probes `RUN (GPU ready)`.
6. Per-file scrutiny caught real P0s: phase22 `SUMMARY.write_text()` on a `str`; empty-ledger silently reporting whole corpus as delta; phase6b non-atomic append could corrupt the shared 111K-line ledger + 500-row flush window double-append.

## phase23 — customer-folder match rollup (same session, /system-viz follow-on)

User: "utilize /system-viz to start matching prints and files to customer folders with cnc programs, cad files". KEY FINDING: the matching ALREADY EXISTS — `phase16-blueprint-program-join` produces `blueprint-program-join-full-v6.jsonl` (73,876 part-number records, print<->program/CAD); `jm-die-full-program-index.json` catalogs 34,786 JM Die program/CAD files with a `customer` folder tag; phase17/18/19 build a `_PART LIBRARY/` customer structure. It is PART-NUMBER-keyed — no per-customer view existed.

`phase23-customer-folder-match.py` (shipped, 3-agent scrutiny cleared: A PASS, B 2xP0+3xP1 -> fixed -> PASS) is the customer-folder ROLLUP — aggregates the existing v6 join + program index, applies the `part-library-layout.json` alias canonicalization (74 canonical customers, 383 variants). Output `phase23-customer-folder-index.json` + summary: **241 real customer folders**, 15,798 programs + 7,930 CAD bucketed, 54,467 print->customer attributions across 20,787 distinct blueprints.

Durable lessons from the scrutiny:
- **Honest confidence split**: only **exact:7,070** of 54,467 attributions are confirmed filename hits; loose:22,037 + ambiguous:25,360 are FUZZY candidates. The first cut lumped them into one headline number — a P0 over-claim. Always split exact-vs-fuzzy in any match-rate report.
- **`startswith` noise filter ate a real customer**: "RING SCREW" was silently dropped because the noise token "RING" prefix-matched it. Fix: single-token noise prefixes (no internal space) match only by exact equality or no-whitespace concatenation ("DRAWNDATE"), never a space-separated name. Multi-token prefixes ("CNC LATHE") still prefix-match.
- The JM Die `customer` field is just "the folder the file sits in" — mixes real customers with machine/version/tooling subfolders ("OldVersions", "MCAM X8", "CNC#1#2#3"). 11,058 of 34,786 files are non-customer noise.

## UPDATE 2026-05-16 (post-/compact continuation, /checkin-foxtrot /yolo /loop)

Continued the pipeline. The orchestrator is now end-to-end:
- **verified-rollup WIRED** — see lesson 3. `docustrata-pipeline.py --only verified-rollup`
  ran clean in 3.8s → fresh `phase20-verified-prints-by-doc.jsonl` (13,256 docs /
  42,973 verified print pages / 8,431 multi-print containers / 75,122 unique strong PNs).
- **split-containers RAN clean** — `--only split-containers`, 94.6s: 12,911 docs,
  5,358 new single-print PDFs written into `_organized/PRINTS/`, 36,653 skipped
  (idempotent), 0 errors. `_split-manifest.jsonl` now 40,174 lines.
- **gpu-ocr smoke-verified** — `Qwen2.5-VL-3B-Instruct` (4-bit) loads on the RTX 4080
  SUPER in ~3min cold (2.24 GB VRAM); torch 2.6.0+cu124, both 3B+7B weights cached at
  `H:/Tools/huggingface_cache`. Stage is genuinely runnable.

## Next steps (operator-paced — long batch jobs, NOT in-session loopable)
- **gpu-ocr** — `docustrata-pipeline.py --only gpu-ocr` runs phase9 Qwen2.5-VL over all
  27,388 phase7 candidates. Resumable (streams JSONL, skips done pages) but a
  multi-day GPU batch. `phase9-unified-pages.jsonl` currently 7,671 lines.
- **deep-rescan re-OCR** of the 6,876 delta docs — `--only deep-rescan` (now
  runs the OOM-safe `phase15-deep-rescan-parallel-memsafe.py`; see #3 below).
  After deep-rescan, re-run join + customer-rollup to lift the customer-match rate.

## UPDATE 2026-05-16 ("do all 4" pipeline improvements)

User reviewed the pipeline, asked for 4 improvements. 3 shipped + verified, #4 specced:

- **#1 — phase9 VLM output wired into the join.** KEY FINDING: the canonical join
  `scripts/docustrata/phase16-blueprint-program-join-v6.py` (git-tracked) consumed
  ONLY Tesseract OCR — the Qwen2.5-VL output `phase9-unified-pages.jsonl` was a
  dead-end branch nothing read. Added `load_vlm_page_fields()` + `_vlm_key()` +
  `_vlm_pn_ok()`; `collect_blueprints()` now opportunistically augments each
  phase20 page with the VLM part_number (garbage+shape filtered) and customer.
  phase9 is OPTIONAL — join is byte-identical when absent. 3-round per-file
  scrutiny PASS (caught: unhashable-key crash, phase9-vs-phase20 str/int
  page_index mismatch, int() ValueError on "--3"/unicode superscripts,
  garbage_class too weak for VLM hallucination phrases like "SEE NOTE 4").
- **#2 — orchestrator is now 9-stage end-to-end.** Added `join` + `customer-rollup`
  stages to `docustrata-pipeline.py` (corpus -> customer index in one command).
  verified-rollup `produces` extended to both phase20 files for taint coverage.
- **#3 — deep-rescan OOM-safe.** Stage rewired `phase15-deep-rescan-parallel.py`
  -> `phase15-deep-rescan-parallel-memsafe.py` (6 workers; defers >30-page huge
  PDFs to a skip list instead of OOM-crashing; same output ledger).
- **#4 — DocustrataCustomerIndexEngine — SPECCED, NOT BUILT.** A from-scratch
  PRISM engine surfacing `phase23-customer-folder-index.json` (240 customers) via
  a `cadDispatcher` action. Dup-guard cleared (`BlueprintProgramJoinEngine` does
  the join, not the customer rollup). Checkpointed rather than rushed at
  context-exhaustion — full spec in the foxtrot handoff + roadmap task #33.

Pipeline fact corrected: phase16-**v6** (the live join) reads
`phase20-verified-prints.jsonl`, NOT phase15 directly; the v6 producer lives in
`scripts/docustrata/` (git-tracked), same pattern as the phase20 producer.

---
name: reference_papa_psn_corpus_heap_guard_tribal_inject_2026_06_25
description: papa /loop resumed zulu's resource->tribal->AI-systems drain (2026-06-25). Injected the tribal-tip backlog (+1146 net-new -> index 104828), rebuilt the PSN training corpus (568605 rows, leg5 tribal=104828), auto-fixed the PSN-corpus OOM with a self-reexec heap guard (committed [MAIN-FORCE] U-PSN-CORPUS-HEAP-GUARD, 14/14 tests), and VALIDATED leg#5 retrieval end-to-end (PDF-drained tips return @0.787). Drain GENERATION is cron-owned (PID35824, ~179/4338 PDFs).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.722Z
aliases: reference_papa_psn_corpus_heap_guard_tribal_inject_2026_06_25
---


# papa /loop -- resource->tribal->AI-systems learning pass (2026-06-25)

Picked up zulu's overnight `drain-resources-tribal.mjs` (`PDF-TRIBAL-HERMES/U-TRIBAL-OVERNIGHT-DRAIN`). The
predecessor papa loop (`4a47dc50`) was evicted at iter 0 (no lost work). Corpus scope: resources 166,770
files + JM DIE 317,139.

## What shipped (3 verified iterations)
1. **INJECT** -- `embed-pdf-tribal-tips-into-index.mjs`: the generated-but-unembedded backlog. Of 30,824
   candidate tips, **1,146 net-new embedded, 29,678 hash-skipped (already present), 0 failed**. Tribal index
   **103,682 -> 104,828** entries (4 shards, clobber-guard held -- brain healthy). This is the leg the
   operator emphasizes ("injection into prism ai systems") -- it reaches `tribal-by-domain-inject` (PSN
   leg #5, every prompt) + RAG.
2. **FEED AI SYSTEMS** -- `build-psn-training-corpus.mjs`: rebuilt the PSN deep-learning/reasoning training
   substrate = **568,605 rows** (leg6 system-viz 358344, **leg5 tribal 104828**, leg3 wiki 46111, leg9
   formulas 31956, legs1+4 obsidian+memories 20398, leg7 engines 6211, leg11 prism-ai 634, leg8 algos 123)
   -> `state/shared/training/` + `psn-corpus-manifest.json`. Feeds DPO/KTO/STaR/replay.
3. **VALIDATE (R15)** -- `tribal-rerank.mjs` (live leg #5): query "carbide end mill chip load and surface
   speed for aluminum" -> 4 hits @ **0.787**, top hits are resource-PDF-drained tips (`microcut-handbook-catalog
   [38/40]`, `YU25_America [716/1030]`, `High Chip Load for Aluminum Machining`). Injection->retrieval proven.

## AUTO-FIX shipped (committed [MAIN-FORCE] U-PSN-CORPUS-HEAP-GUARD)
`build-psn-training-corpus.mjs` OOM'd on the **default heap** ("Ineffective mark-compacts near heap limit"
~378MB) -- it loads the ~550MB system-viz graph + accumulates 568K rows in-process. Added a self-reexec
`--max-old-space-size` guard (exported pure `shouldReexecForHeap`/`hasHeapFlag`, env breaker
`PRISM_PSN_CORPUS_REEXEC`, knob `PRISM_PSN_CORPUS_HEAP_MB` default 16384) -- **clone of the proven
`nn-graph-retrain-lifecycle.mjs::shouldReexecForHeap`** pattern (do NOT re-fork; both are the same logic).
14/14 tests incl a bare-launch E2E that FATAL'd pre-fix. Every launch path (cron/ad-hoc/loop) now self-bumps.
Wiki follow-up (bug-finding->wiki gate, advisory): not yet written.

## STRATEGIC FINDING (the key result -- read before brute-draining more PDFs)
The resources-PDF **text-drain has exhausted its high-value targets.** Tier census of the 4,338-PDF index
(`cad-cam-resources-pdf-index.json`) vs the drain cursor:
- **clean-prose manuals (operator/handbook/guide/programming): 140 total, 0 remaining -> 100% DRAINED.**
  These are the GOLD (one Haas manual gave ~600 tips). All done.
- catalogs: 297 total, ~258 remaining -- but image-heavy / sparse-text -> a TEXT-drain yields ~0; their
  parametric tables need VISION-OCR.
- thin CAD tool-drawings ("SECTION A-A" + dimension callouts): 3,901 total, ~3,877 remaining -> ~0 machining
  TEXT knowledge; they need VISION-OCR (dimension extraction), NOT text-drain.
Evidence: a 10-PDF drain batch past the clean-prose tier yielded only **+8 tips** (vs 411-844/batch on the
clean tier). **Do NOT brute-drain the remaining 4,155 via text -- that is slop (~93% are thin drawings).**

## NEXT high-value levers (where the real remaining knowledge is)
1. **VISION-OCR** the 258 catalogs + 3,877 drawings -> xray/blueprint-vision domain
   (`blueprint-ocr-training-loop.mjs`, multi-VLM ensemble on Blackwell). This is the RIGHT pipeline for the
   remaining resources PDFs, NOT the text-drain.
2. **Other corpora** not in the 4,338-PDF index: JM DIE 317K files (needs corpus-index expansion), MIT-OCW
   full lecture text (the `course-to-tribal-tips.mjs` path is only advisory descriptor-layer metadata).
3. Machining-tribal -> LoRA producer (no tribal->LoRA producer exists yet; LoRA corpus is doctrine-only,
   trainingReady=true 3186 rows / 34 galaxies).

## State for the next chat / cron (pick up here)
- **Drain GENERATION**: text-drain at 189/4338 (clean-prose 100% done). The `resources-drain.lock` PID-liveness
  steal works (acquireLock steals a dead-PID lock immediately; verified -- not a bug). The "PRISM Tribal Embed"
  scheduled task is STALE (Stop-hook warn) -> the auto-embed cron is lagging; embed must be driven manually
  (`embed-pdf-tribal-tips-into-index.mjs`) until re-registered from an elevated shell.
- Tribal index now **104,836** entries (was 103,682 at session start; +1,154 net this session). 4 shards, healthy.
- **Re-embed cadence:** the drain runs `--no-embed` (cron/this-pass embeds). When the tip backlog regrows,
  re-run `embed-pdf-tribal-tips-into-index.mjs` then `build-psn-training-corpus.mjs` to refresh leg5.
- **Not yet done this task:** LoRA/GNN-specific feeders from the machining tribal corpus
  (`assemble-fleet-lora-corpus.mjs`, `vault-to-lora-dataset.mjs`, `vault-to-gnn-refpool.mjs`) -- the PSN
  corpus already feeds DL, but a dedicated machining-tribal->LoRA dataset is the next leg.
- Hermes UP (xAI Grok OAuth) + full Blackwell Ollama fleet (qwen2.5-coder:32b, gpt-oss:120b/20b,
  nomic-embed-text) available for the next generation/synthesis pass.

Linked: [[reference_psn_training_substrate_2026_05_25]] (papa built this corpus builder) ·
[[reference_hermes_obsidian_utilization_pass2_2026_06_22]] (zulu's built-but-dark finding) ·
[[reference_ai_systems_6unit_complete_2026_06_11]] (the heap-reexec pattern source).

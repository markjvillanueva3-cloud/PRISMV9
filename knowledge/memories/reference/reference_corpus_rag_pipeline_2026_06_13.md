---
name: reference_corpus_rag_pipeline_2026_06_13
description: AI-SYSTEMS-MAXOUT corpus->RAG pipeline (local PDF + caption extractors -> Qdrant prism_corpus) + the Ollama inference-wedge ops fix. slot:india 2026-06-13.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.532Z
aliases: reference_corpus_rag_pipeline_2026_06_13
---


# Corpus -> RAG pipeline (AI-SYSTEMS-MAXOUT, slot:india 2026-06-13)

Operator goal: "use pdf-learn and video-learn to max out our AI systems / NN / CAG / RAG." Built a local-first, GPU-free corpus ingestion + RAG-wiring pipeline and PROVED end-to-end retrieval. All committed on `slot/india`.

## What was built (committed)
- **`scripts/extract-corpus-pages.py`** (U-CORPUS-PAGE-EXTRACT) — generalized, append-safe, directory-based pypdf page extractor. Fixes lima's `extract-jm-die-corpus-page-by-page.py` two disqualifiers: `open("w")` truncate-on-run (clobber) + hardcoded `H:/prism-slot-lima` REPO_ROOT. Dedup by **path-hashed id** (`corpus-page-<slug>-<sha1[:8]>-pNNNN`) so same-basename PDFs in different dirs never collide. Notability-scored, provenance-cited, `advisory:true`. LIVE: **27,756 page-cited rows** from `resources/` (~1,230 PDFs).
- **`scripts/extract-video-captions.py`** (U-VIDEO-CAPTION-EXTRACT) — the video-learn half, GPU-free: parses `.vtt/.srt` caption sidecars (NO download/Whisper/API) into the SAME corpus-page schema. Blank-line-bounded parse (VTT cue-ids don't leak), ~1400-char timestamp-cited chunks, rolling-caption dedup. LIVE: **10,610 chunks** from 351 MIT-OCW caption files (2.830j SPC, 18.03 ODEs, 10.34 numerical, 6.046j algorithms).
- **`scripts/embed-corpus-into-qdrant.mjs` + 24 tests** (U-CORPUS-RAG-EMBED) — self-contained nomic-768d embedder -> `{n,q:int8}` (q=clamp(round(v*127),-127,127), matches `populate-qdrant.mjs` SCALE=127 dequant). Resumable (id-keyed), fail-loud on Ollama error + N-consecutive dim-mismatch. **curl subprocess transport** (NOT Node fetch -- fetch starves the Windows http pool, the documented `populate-qdrant`/`ollama-docker-health` convention).

## Routing decision (R7, not averaging)
Bulk document corpus -> **dedicated Qdrant `prism_corpus` collection** (768d cosine, on-demand hybrid-retrieval dense arm). NOT the per-prompt tribal index (stays curated; 40K pages would dilute+slow it) and NOT LoRA (raw catalog/lecture pages = weak instruction pairs, R9 noise at weight 0.5).

## PROVEN end-to-end
`corpus-pages.jsonl` = 38,366 rows (0 dups, verified). 422 vectors populated into `prism_corpus`; query "carbide end mill speeds/feeds for hardened steel" -> top hits osg-high-speed-machining-guide / lmt-easymill / hannibal-reaming-guide (0.63-0.65 cosine). Real semantic retrieval over freshly-extracted corpus.
**Complete full coverage (resumable):** `node scripts/embed-corpus-into-qdrant.mjs --input mcp-server/data/tribal/corpus-pages.jsonl --input mcp-server/data/tribal/jm-die-corpus-pages.jsonl --output mcp-server/data/tribal/corpus-embeddings.jsonl` then `node scripts/populate-qdrant.mjs --jsonl <that> --collection prism_corpus`.

## OPS FINDING -- Ollama inference wedge (fleet-wide)
Ollama's control plane (`/api/tags`, `/api/ps`, `/api/version`) responded but ALL inference (`/api/embeddings` AND `/api/generate`) timed out 0-bytes for minutes, with 77GB free VRAM -- a wedged inference worker, fleet-wide dead. **Fix: restart the `PRISM Ollama Serve` scheduled task** (Stop-ScheduledTask + kill ollama proc + Start-ScheduledTask). After restart a fleet deep-reasoning process immediately grabbed `gpt-oss:120b` (64.5GB) + `:20b`, re-saturating the GPU (`MAX_LOADED_MODELS`-style 1-slot contention starved the tiny nomic embed) -- so embeds only land in GPU-free windows. Diagnose via `nvidia-smi --query-gpu=memory.used` + `/api/ps`; if inference hangs but control plane responds -> restart the task.

## Known issues / scoped follow-ups
- `run_in_background` Bash here detaches: the task wrapper reports exit 255 but the child node/python keeps running orphaned (observed on both extract + embed). Append-safe/resumable design makes this non-destructive, but full-coverage embed completes via re-run, not via a single tracked task.
- Remainder: ~15 giant catalogs (50-258MB) reaper-killed mid-extract (need memory-bounded handling); 105 raw videos lacking captions (need Whisper).
- Closed-loop starvation (separate): `outcomes-dataset.jsonl` 11 rows vs 69K `outcome-bus.jsonl` events -- `build-outcomes-lora-dataset.mjs` reads sparse `state/outcomes/<domain>.jsonl`. [[feedback_psn_definition]]

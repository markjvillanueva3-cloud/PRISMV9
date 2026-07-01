---
name: wiki-tribal-embed-pipeline-blocked-2026-06-08
description: Gap
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.265Z
aliases: reference_wiki_tribal_embed_pipeline_blocked_2026_06_08
---


2026-06-08 (slot golf, synergy loop). Investigating gap #5 from [[SYSTEM-SYNERGY-GAPMAP-2026-06-08]] (wiki↔tribal coverage 83.7%, 6401 files missing tribal embedding). Found the coverage is stuck because the embed pipeline is **broken**, not just incomplete.

**Root cause #1 (FIXED, the big one): heap OOM on the index.** `state/shared/tribal-embed-index.json` is **533MB**. `scripts/embed-wiki-into-tribal-index.mjs` loads it whole via JSON.parse → exceeds the default Node heap (~2GB) → **native segfault** (zlib/crypto stack frames; `Mark-Compact ... allocation failure` at ~1GB). A bare `node embed-wiki-into-tribal-index.mjs` and even a plain `JSON.parse` of the file both crash. **Fix: invoke with `node --max-old-space-size=8192`** — the 128GB box has the RAM; with 8GB heap the embedder loads the index fine (`applied: true`, no OOM). The DURABLE fix is to bake the heap flag into the script's wrapper/invocation OR stream the index instead of loading it whole (it will keep growing past 8GB eventually — streaming/sharding is the real architectural fix).

**Root cause #2 (REMAINING): per-file empty-text failure.** After the heap fix, the embedder fails on the first file with "ollama returned no embedding". The `/api/embeddings` endpoint WORKS (verified: `curl ... nomic-embed-text:latest` returns a 768-d vector) and the script's call is correct (`{model, prompt:text}` → reads `j.embedding`, fails loud if empty — R12, correct behavior). So the failure is per-file: a wiki page that extracts to **empty text** (all-frontmatter / all-links / a generated `_`-prefixed stub) → Ollama returns no embedding → fail-loud. **Fix needed:** the embedder should skip/warn on empty-extracted-text files instead of hard-failing the batch (and the audit's `missingFromTribal` includes generated `_`-files that don't exist on disk — filter those).

**Operational unblock for #5 (next iteration / victor):** `node --max-old-space-size=8192 scripts/embed-wiki-into-tribal-index.mjs --apply --domain <valid> <existing-non-empty-files>`, batched, skipping empty-text + `_`-generated files. Embeds run on the LOCAL GPU (nomic-embed-text, the idle-Blackwell efficiency win). My run did NOT corrupt the index (mtime unchanged 11.1h; crash was on read, before write). Builds on [[reference_system_synergy_loop_golf_2026_06_08]] + [[feedback_workflow_concurrency_and_local_routing_2026_06_08]].

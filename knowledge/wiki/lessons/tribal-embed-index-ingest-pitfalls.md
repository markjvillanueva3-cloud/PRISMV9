---
title: Tribal-embed-index ingest pitfalls — per-prompt surface, body-field, full-index heap
domain: dev-infra
tags: [tribal, embed-index, rag, psn, ollama, heap-oom, regression]
created: 2026-06-24
slot: zulu
milestone: PDF-TRIBAL-HERMES
---

# Tribal-embed-index ingest pitfalls

Three lessons from feeding 1,123 AI-generated tribal tips (Hermes/Ollama `/learn` over `H:/PRISM/resources` PDFs + 617 youtube-extraction video tips) into the canonical tribal vector index. Surfaced 2026-06-24 (slot:zulu, TRIBAL-KNOWLEDGE DRAIN loop).

## 1. The per-prompt tribal surface is the L1 index, NOT the seeds JSON

`state/shared/cad-cam-pdf-tribal-seeds.json` is read by **no hook** — only its own generator/ingest scripts (and `/shop-knowledge`). The surface that fires on every UserPromptSubmit (PSN leg #5) is `.claude/hooks/tribal-by-domain-inject.mjs` → `.claude/scripts/tribal-rerank.mjs`, which reads `state/shared/tribal-embed-index.json` (the **L1 vector index**, sharded: manifest + `.shard-00N.json`, ~1.18 GB / 74K entries / nomic-embed-text 768-dim). **A tip reaches the app only when embedded into the L1 index.** Older docs calling the seeds JSON "consumed by tribal-by-domain-inject" are stale.

## 2. youtube-extraction tips carry the text in `.body`, not `.tip`/`.text`

The video tips are shaped `{id, title, body, category, tags, confidence, ...}` — the knowledge is in `body`, with a per-tip `title` headline. A reader mapping `t.tip || t.text` silently ingests **zero** video tips (the field is absent). Fix: `videoTipText(t)` reads `t.body || t.tip || t.text`, title-prefixes for context, tolerates plain strings + empties. Same silent-data-loss class as the leading-dot/truncation VLM-OCR parse bugs — one wrong field name drops an entire corpus with no error. (U-VIDEO-TIPS-INGEST-FIX, 79978939ad — +617 video tips into the seeds store.)

## 3. A full-index flush OOMs the default Node heap — self-reexec the heap bump

Any embedder that re-reads the whole index inside its write-lock (`readTribalIndexGuarded` → 74K entries × 768-dim embeddings ≈ 1.18 GB of parsed JS objects) OOMs the default ~2 GB old-space. Observed: `FATAL ERROR: Reached heap limit` mid-flush — **but the index was NOT clobbered** (atomic tmp+rename + manifest-aware clobber-guard meant the crash left the prior index intact; manifest count unchanged). The robust fix is a **self-reexec** (`shouldReexecForHeap` → re-launch with `--max-old-space-size=12288`, env-breaker `PRISM_TRIBAL_EMBED_REEXEC=1`, skip if a heap flag is already present) so every launch path (ad-hoc / cron / wrapper) is safe — mirrors `nn-graph-retrain-lifecycle.mjs`'s `shouldReexecForHeap`. A bare `NODE_OPTIONS=--max-old-space-size` works for one invocation but doesn't protect the scheduled/wrapper paths. **Lesson:** a script that loads a multi-GB index into memory must own its heap via self-reexec, not document it.

## 4. Not every "tip store" is worth embedding — triage for real knowledge

A scan for `*.jsonl` tip stores surfaces high counts that are NOT high-content tribal knowledge: `state/shared/cam-tribal-corpus.jsonl` (598) and `cad-tribal-corpus.jsonl` (21) hold **autogen POINTER stubs** (`tip: "CAM training reference (kind=resource-catalog): read AUTOGEN-EXTRACT-SPEC-..."`, `must_human_verify:true`), and `print-reading-tribal-tips.jsonl` (122) holds **OCR-extraction metadata** (`"family-WH- prints typically extract at low_no_vision"`), not machining knowledge. Embedding these would **dilute retrieval** — they'd compete by cosine against real page-cited tips. Embed only real-knowledge tips: page-cited with `confidence > 0.3` (the `extracted-pdfs/` foc14 / mech-eng-handbook / solidworks rows), the Hermes-generated `pdf-tribal-tips/tips.jsonl`, and the youtube `.body` tips. **A row count is not a knowledge count** — sample the `tip`/`body` text before bulk-embedding a store. (verified 2026-06-24: 1,280 real tips embedded; the 741 pointer/metadata rows deliberately left out.)

## Safe ingest pattern (reuse, don't hand-roll)

Clone `embed-cited-tips-into-tribal-index.mjs`'s primitives verbatim — `readTribalIndexGuarded`/`writeTribalIndexGuarded` (shard-safe, manifest-aware, >50%-shrink clobber-guard), `withTribalIndexLock` (10-min stale window — a flush rewrites ~1.18 GB ~250s), `embedText` (Ollama nomic-embed-text), `runEmbedPool` (`PRISM_EMBED_CONCURRENCY=16` saturates Blackwell). Per-tip entries with a SHA-256 input `hash` make a re-run after a reaper/session-limit kill cheap (already-embedded ids skip). `domain` MUST be a `tribal-rerank` VALID_DOMAINS member (`mill|lathe|wedm|cad|cam|backend-dev|general`) or the in-domain 2× boost never fires.

See: `scripts/embed-pdf-tribal-tips-into-index.mjs` (U-TRIBAL-EMBED-INDEX, e79424845a) · [[reference_tribal_embed_index_is_the_perprompt_surface_2026_06_24]] · [[reference_tribal_index_v8_string_cap_2026_06_08]] · [[reference_tribal_shard_read_clobber_2026_06_10]].

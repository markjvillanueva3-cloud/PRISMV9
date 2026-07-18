---
name: reference_tribal_embed_index_is_the_perprompt_surface_2026_06_24
description: "The per-prompt tribal surface is tribal-embed-index.json (read by tribal-rerank), NOT the cad-cam-pdf-tribal-seeds.json — which no hook reads. Tribal tips must be embedded into the L1 index to reach the app."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.227Z
aliases: reference_tribal_embed_index_is_the_perprompt_surface_2026_06_24
---


**The load-bearing tribal surface is the L1 vector index, not the seeds JSON.** (verified 2026-06-24, slot:zulu, TRIBAL-KNOWLEDGE DRAIN loop)

- `state/shared/cad-cam-pdf-tribal-seeds.json` — read ONLY by its own generator/ingest scripts (`generate-cad-cam-pdf-tribal-seeds.mjs`, `ingest-tribal-tips-to-seeds.mjs`, `build-fleet-training-corpus-inventory.mjs`). **No hook reads it.** Feeding tips here helps `/shop-knowledge` + course content but does NOT reach the per-prompt injection. (Older docs calling it "consumed by tribal-by-domain-inject" are stale.)
- `state/shared/tribal-embed-index.json` — the **L1 vector index** (sharded: `.manifest.json` + `.shard-00N.json`; ~1.18 GB, 74,004 entries, nomic-embed-text 768-dim as of 2026-06-17). This IS what `.claude/hooks/tribal-by-domain-inject.mjs` → `.claude/scripts/tribal-rerank.mjs` reads every UserPromptSubmit (PSN leg #5), and the same index the RAG/semantic retrieval queries. **Tips reach the app only when embedded HERE.**

**To embed a tip corpus into the L1 index, clone the hardened path — never hand-roll index IO.** The index was clobbered to 1 entry on 2026-06-08 (V8 512 MiB string-cap fail-OPEN). Reuse `embed-cited-tips-into-tribal-index.mjs`'s primitives verbatim: `readTribalIndexGuarded`/`writeTribalIndexGuarded` (shard-safe, manifest-aware, >50%-shrink clobber-guard), `withTribalIndexLock` (cross-process, 10-min stale window — a full flush rewrites the whole ~1.18 GB sharded index ~250s), `embedText` (Ollama nomic-embed-text), `runEmbedPool` (`PRISM_EMBED_CONCURRENCY=16` saturates Blackwell). Entry shape tribal-rerank reads: `{id,source,domain,title,text,hash,embedding}`; `domain` MUST be a VALID_DOMAINS member (`mill|lathe|wedm|cad|cam|backend-dev|general`) or the in-domain 2× boost never fires.

**Resumable / safe pattern:** per-tip entries with a SHA-256 input `hash` → a re-run after a reaper/session-limit kill skips already-embedded ids (cheap tail re-embed). Default a SINGLE final flush (the ~250s rewrite is the only slow step). A mid-flush kill cannot corrupt the index (atomic tmp+rename + clobber-guard).

This session shipped: `scripts/embed-pdf-tribal-tips-into-index.mjs` (U-TRIBAL-EMBED-INDEX, e79424845a) feeding 1,123 AI-generated tips (≈506 PDF via Hermes/Ollama `/learn` + 617 youtube-extraction video tips). The video tips are shaped `{title, body, category}` — the knowledge is in `.body`, not `.tip`/`.text` (U-VIDEO-TIPS-INGEST-FIX, 79978939ad). Generator: `scripts/generate-pdf-tribal-tips-hermes.mjs`. See [[reference_tribal_index_v8_string_cap_2026_06_08]] · [[reference_tribal_shard_read_clobber_2026_06_10]] · [[feedback_psn_definition]].

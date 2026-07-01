---
title: Contextual Retrieval batch driver (U-RAG-3)
domain: backend-dev
type: architecture
status: shipped
shipped: 2026-05-22
unit: U-RAG-3-BATCH-CONTEXT-PLUMBING
commits:
  - 92aa9279d6  # U-RAG-3 lib + per-file embedder (Contextual Retrieval shipped)
  - 48d68448de  # batch driver plumbing (this entry's subject)
---

# Contextual Retrieval — batch driver `--with-context`

PRISM applies Anthropic's [Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) pattern to its wiki corpus: every chunk gets a 1-2 sentence Ollama-generated context blurb prepended *before* embedding. Across the published benchmark this technique drops failed-retrieval rate by **35-49%**.

This entry documents the batch driver — the operator-runnable command that brings the technique to the full 32K-file wiki corpus.

## Two-script architecture

| Layer | Script | Role |
|-------|--------|------|
| Lib   | `scripts/lib/contextual-blurb.mjs` | Pure module: `generateBlurb()` (Ollama `/api/generate`, fail-soft, version-keyed cache primitives), `prependBlurb()`, `loadBlurbCache()`/`saveBlurbCache()`. 25/25 tests with injectable fetch. |
| Per-file | `scripts/embed-wiki-into-tribal-index.mjs` | `--with-context` flag. Takes explicit file-path args, all-or-nothing per call. Stamps `entry.context` + `entry.context_version="v1"`. |
| Batch driver | `scripts/embed-all-wiki.mjs` | `--with-context` flag. Walks `knowledge/wiki/**/*.md`, resumable via `planAppend()` (skip by id). The thing the operator actually invokes. |

The batch driver is a thin orchestration over the per-file primitives — but for one shipping cycle (2026-05-22) the per-file shipped `--with-context` while the batch driver did **not** forward the flag. The operator had a feature with no operator-runnable invocation. **U-RAG-3-BATCH-CONTEXT-PLUMBING** (commit `48d68448de`) closed that.

## Operator command

```bash
# Dry-run: count + plan
node scripts/embed-all-wiki.mjs --with-context

# Full corpus, contextual:
node scripts/embed-all-wiki.mjs --apply --with-context
```

`--with-context` is opt-in by design — pre-existing callers that ran `--apply` continue to get the raw-chunk pipeline. Cache persists per-batch alongside the index at `tribal-embed-index.blurbs-cache.json`; an Ollama outage at file N loses at most `--batch` (default 500) blurbs.

## R12 fail-loud degradation signal

A latent failure mode: with `--with-context` set, if Ollama returns null for every blurb (qwen2.5-coder unloaded, daemon dead, model-name typo), the embed loop silently falls back to raw-chunk embed. Without an explicit signal, the operator would see `ok:true` for a pass that did **not** actually deliver contextual retrieval.

Pure helper `evaluateContextualDegradation({ blurbHits, blurbCacheHits, blurbMisses })` flips the output:

| `blurbMisses / attempted` | `ok` | `degraded` | exit |
|---------------------------|------|------------|------|
| ≤ 0.50 (threshold)        | true | false      | 0    |
| > 0.50                    | false | true      | 2    |

Threshold is the exported constant `DEGRADED_BLURB_FAILURE_THRESHOLD = 0.5`, pinned by a regression-guard test. Strict greater-than at the edge — exactly 50% does NOT trip (matches the per-file embedder's equivalent posture). The degraded `reason` names the upstream dep (`qwen2.5-coder loaded? daemon responding?`) so the operator can act without reading code.

## Cache-key invariants

The blurb cache uses keys `${makeWinPath(filePath)}:${BLURB_VERSION}`. Two invariants:
1. **BLURB_VERSION self-invalidates** — bumping `BLURB_VERSION` in the lib's `v1` → `v2` migration causes every cache entry to miss on read, regenerating against the new prompt.
2. **Mtime-guarded reads** — `readCacheHit(cache, key, mtimeMs)` invalidates when the source file's mtime drifts. Known leakage edges (git-checkout-old, cp -p, touch -m) match the per-file embedder's posture — addressed jointly as a follow-up unit.

## Concurrency caveat (pre-existing)

`atomicWriteJSON` uses a `temp-<pid>-<ts> + rename` pattern, **not a true lock**. The header docblock explicitly documents this — do not run two wiki/tribal embed scripts against the index concurrently. The `--with-context` flow doubles the cache-write surface but uses the same atomic-rename pattern. A proper O_EXCL lockfile is a follow-up hardening unit, **not** in U-RAG-3 scope.

## Concurrency with the GNN node-embedder

`scripts/build-node-embeddings.mjs` (NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST) also embeds against the same Ollama daemon using the same `nomic-embed-text:latest` model. If both run concurrently with `--with-context` adding `qwen2.5-coder:7b` on top, all three models compete for GPU VRAM. Serialize them when running the full corpus pass (operator discipline — not enforced by code).

## Retrofit limitation

`planAppend()` skips already-embedded files by id. So `--with-context` only adds blurbs to **newly-embedded** entries — the 23,552 already-embedded wiki files keep their non-contextual embeddings. To retro-blurb the existing corpus, add a `--force` flag that bypasses `planAppend()`. P2 follow-up — operator can request it when ready to spend ~hours of Ollama for the existing corpus.

## See also

- Spec: `state/shared/specs/RAG-UPGRADE-MS0.md` (U-RAG-3 row)
- [[two-stage-lexical-rerank]] — U-RAG-2 sibling pattern (rerank stage on the inject hooks)
- [[reference_u_rag_3_contextual_retrieval_2026_05_22]] — U-RAG-3 lib + per-file ship
- [[reference_u_rag_3_batch_context_plumbing_2026_05_22]] — this unit's memory entry
- [[reference_rag_upgrade_ms0_2026_05_22]] — milestone tracker

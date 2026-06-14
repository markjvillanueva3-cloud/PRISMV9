---
name: u-rag-3-batch-context-plumbing-2026-05-22
description: "U-RAG-3-BATCH-CONTEXT-PLUMBING — wired --with-context through wiki batch driver. The operator-runnable gap (per-file shipped --with-context but batch driver didn't forward it). Commit 48d68448de. 27/27 tests."
aliases: reference_u_rag_3_batch_context_plumbing_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.020Z
---


# U-RAG-3-BATCH-CONTEXT-PLUMBING — batch driver now supports --with-context

## The gap

The per-file embedder `scripts/embed-wiki-into-tribal-index.mjs` shipped `--with-context` in commit `92aa9279d6` (U-RAG-3 lib + per-file integration, 2026-05-22). But the batch driver `scripts/embed-all-wiki.mjs` — the thing the operator actually invokes to embed all 32K wiki files in one go — never plumbed the flag through. The U-RAG-3 status table said "operator-action only", but the operator literally couldn't run the corpus pass without manually invoking the per-file script 24,000 times.

Closed by commit `48d68448de`.

## What shipped

- **parseArgs** — `--with-context` flag (default false, opt-in only)
- **Imports** — `makeWinPath`, `OLLAMA_URL` from embed-wiki + 7 contextual-blurb helpers
- **Embed loop** — cache-keyed blurb generation, mtime-guarded reads, prependBlurb-before-clamp, `buildEntry` 5th-arg `context`
- **Cache persistence** — `.blurbs-cache.json` alongside index, persisted every flush() AND on embed-abort (P1-a fix: hoisted outside flush() early-return so 0-pending aborts don't lose banked blurbs)
- **R12 fail-loud (P0-2 fix)** — pure helper `evaluateContextualDegradation()` + `DEGRADED_BLURB_FAILURE_THRESHOLD = 0.5`. When >50% of blurb attempts fail, success summary flips to `ok:false, degraded:true, exit:2` with operator-actionable reason naming Ollama + qwen2.5-coder. Without this, a run against a dead qwen would silently fall back to raw-chunk embed on every file and report `ok:true` — the exact silent-degradation class.
- **Tests** — 27/27 (+11 new: 3 parseArgs, 1 threshold pin, 7 evaluateContextualDegradation behavioral)

## Operator-runnable command

```bash
# After node-embed pass completes (~15min ETA from this commit):
node scripts/embed-all-wiki.mjs --apply --with-context
```

Concurrency caution: don't run alongside `build-node-embeddings.mjs` against the same Ollama instance — both use nomic-embed-text and the wiki contextual pass adds qwen2.5-coder:7b on top, splitting GPU.

## Per-file scrutiny gate

- Iter1: arm A PASS (2 P1s), arm B FAIL (P0-2 silent degradation + P0-1 cross-process concurrency)
- Iter2: arm A PASS (P1 fixes verified), arm B PASS (P0-2 closed; P0-1 acknowledged as pre-existing surface limitation, deferred)

## Deferred (P1/P2 follow-ups, NOT in scope)

- **Cross-process O_EXCL lockfile** — the existing atomicWriteJSON is `pid+ts` not a lock; two concurrent runs against the index can clobber. Header docblock documents this pre-existing limitation; the new --with-context flow doesn't make it worse. P0-1 from arm B — defer as a separate hardening unit.
- **Retroactive blurb injection** — `planAppend` skips already-embedded ids, so `--with-context` only adds blurbs to NEW entries. To retro-blurb the 23,552 already-embedded files, add a `--force` flag that bypasses planAppend.
- **Mtime-guard cache leakage** — git-checkout-old / cp -p / touch -m can serve stale blurbs because cache key is mtime-based. Per-file embedder has identical posture; addressing both together is a separate unit.

## See also

- Spec: `state/shared/specs/RAG-UPGRADE-MS0.md` (U-RAG-3 row)
- [[reference_u_rag_3_contextual_retrieval_2026_05_22]] — U-RAG-3 lib + per-file ship (commit `92aa9279d6`)
- [[reference_rag_upgrade_ms0_2026_05_22]] — milestone tracker
- [[reference_git_index_saturation_camx11_2026_05_18]] — pathspec-only commit pattern used here (peer-staged TaylorShim files in the index forced `git commit -- pathspec`)

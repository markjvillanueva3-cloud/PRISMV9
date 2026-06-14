---
title: Embeddings-sidecar staleness gate (brain-upgrade rank 21)
type: architecture
status: shipped
shipped: 2026-05-30
slot: alpha
tags: [obsidian-brain, recall, hybrid, embeddings, staleness, observability]
---

# Embeddings-sidecar staleness gate (rank 21)

The hybrid memory recall (A6: BM25+dense+RRF) fuses BM25 hits from the memory-index sidecar with
dense hits from the **embeddings** sidecar. The embeddings sidecar is built manually/unwired, so it
silently falls behind the corpus — and there was **no signal**: recently-added memories were
BM25-reachable but **dense-unreachable**, the fusion mixing a current BM25 set with a stale dense set,
invisibly. (Complement to the rank-4 auto-rebuild and the brain-refresh orchestrator that *fixes* the
drift; this *detects* it.)

## What

`tryLoadEmbeddingsSidecar` (in `scripts/lib/memory-index-search-lib.mjs`), after schema/array
validation, compares the **embeddings sidecar FILE mtime vs the BM25 index sidecar FILE mtime**: if the
dense sidecar is OLDER, the BM25 arm was rebuilt from a newer corpus → recently-indexed memories are
dense-unreachable → **stderr advisory**, but **returns the records anyway** (graceful — a stale dense
arm still helps; re-embed via `build-memory-embeddings-sidecar.mjs --resume`). Absent BM25 sidecar or
any stat failure → skip (no false alarm). The BM25 sidecar path + `statImpl` are threaded from the
caller through `tryHybridFuse` so a non-default vault / test harness is honored.

**Basis correction (2026-05-30, same session — caught by real-data verification, R12):** the first cut
compared `sc.sourceMtimeMs` vs the vault's youngest namespace-**DIR** mtime — but that is
**hypersensitive**: any vault touch by the busy fleet bumps the dir mtime, so it fired **47 s after a
fully in-sync rebuild** → cry-wolf (rank-35's exact failure class), and its advisory over-claimed
"older than BM25" when the two sidecars were actually in sync. File-mtime is cheap (2 stats), precise
(tracks BM25-vs-dense build order), and never false-fires on unrelated vault writes. Lesson: verify a
staleness signal against the *live* busy system, not just unit fixtures.

## Live finding (the gate's first fire = a true positive)

On ship, the advisory fired on the real vault: embeddings sidecar `sourceMtimeMs`=04:52, BM25 sidecar
=15:44, vault youngest=now → **~11.6h of dense-unreachable corpus growth**. The drift the sweep flagged
is real and now observable on every recall.

## Tests

`scripts/lib/memory-index-staleness.test.mjs` — 9 node:test: `youngestNamespaceMtime` (max/empty/
fail-soft), the gate's fresh/stale/absent trichotomy (real `packInt8` record + stderr capture, graceful
+ advisory + no-false-alarm), and **2 discriminating wiring guards** through the real `tryHybridFuse`
seam (assert the caller's `statImpl` is honored, not the default vault — the "hermetic fakes don't
prove wiring" class). 2-reviewer per-file scrutiny PASS. Memory:
[[reference_alpha_embeddings_staleness_gate_2026_05_30]]. Sibling: [[memory-recall-eval]].

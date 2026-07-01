---
title: Incremental compounding refresh (amplifier #2) — re-synthesize only what changed
type: architecture
status: shipped
shipped: 2026-05-29
slot: alpha
tags: [obsidian-brain, compounding, incremental, freshness, fleet-amplifier]
---

# Incremental compounding refresh (amplifier #2)

Makes the compounding **self-maintaining and cheap**. B1 (`galaxy-reflection-synthesis.mjs --all`)
is the blunt tool — it re-synthesizes all 34 galaxies every run (~20 min of
generation). `galaxy-synthesis-refresh.mjs` is the surgical tool — it
re-synthesizes ONLY the galaxies whose domain memory-cluster actually CHANGED.

## How (the freshness fingerprint)

Each L1 synthesis stamps a `sourceHash` (in frontmatter): a sha256[:12] of the
sorted `namespace/name + description + opening` of the memories it was built from —
i.e. the *actual synthesis input* (so a memory whose CONTENT changes, not just its
filename, flips the hash). `classifyGalaxy` gathers a galaxy's CURRENT cluster (via
the A6/A3 recall — the query embedding uses `/api/embeddings`, which stays up even
when `/api/generate` is wedged) and compares hashes → `fresh | stale | new | thin`.

**Staleness is ALWAYS detectable** (embedding-only). Only the *regen* needs
generation — and if it's down, the stale set is reported + the run exits **3
(deferred)**, never silently skipped.

## The cascade (P1 — load-bearing)

When ≥1 L1 is regenerated, `executeRegenAndCascade` rebuilds the sidecars BEFORE
anything reads them, in this order:
1. **strip** the regenerated galaxies' `patterns/<g>_synthesis` vectors from the
   embeddings sidecar (`--resume` skips by key, so a changed synthesis keeps its
   STALE vector unless stripped),
2. **index** rebuild (`build-memory-index-sidecar.mjs` — fresh synthesis text into
   the BM25 sidecar, which the embed builder reads from — so index MUST precede embed),
3. **embed** `--resume` (re-embed the stripped keys via `/api/embeddings`),
4. **then** cascade to L2 (`galaxy-meta-synthesis.mjs`) — **gated on rebuild
   success**: if the rebuild fails, L2 is SKIPPED loudly (never clusters on stale
   vectors — R12).

Without this, L2 would cluster on pre-refresh vectors and a brand-new synthesis
(no vector yet) would be silently dropped; and the refreshed syntheses would be
invisible to recall until an unrelated rebuild. A `main()`-seam oracle pins the
`strip→index→embed→meta` order + the skip-on-failure gate.

## Exit-code contract (for cron / Stop-hook consumers)

`0` = done (regenerated, or all-fresh) · `1` = hard failure · **`3` = stale
detected but generation DOWN → deferred (benign; re-run when up — do NOT alarm)**.

## Operate

```
node scripts/galaxy-synthesis-refresh.mjs            # detect + regen changed + rebuild + L2
node scripts/galaxy-synthesis-refresh.mjs --dry-run  # classify only (which galaxies are stale)
node scripts/galaxy-synthesis-refresh.mjs --no-cascade
```
Wire to a cron or a Stop hook → the brain's syntheses stay current as the fleet
adds memories, at a fraction of B1's cost. 23 node:test (incl 5 orchestration-oracle
cases); 2 per-file reviewers PASS. Reuses B1's helpers (R8). Roadmap: amplifier #2
of 6 — see [[galaxy-meta-synthesis]] §Roadmap. Memory:
[[reference_alpha_amp2_incremental_refresh_2026_05_29]].

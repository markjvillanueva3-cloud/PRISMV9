---
title: Hybrid memory-vault retrieval (BM25 + dense + RRF) — A6
type: architecture
status: shipped
shipped: 2026-05-29
slot: alpha
tags: [recall, obsidian-brain, embeddings, rrf, nomic-embed-text, fail-safe]
---

# Hybrid memory-vault retrieval (A6)

The recall arm of the "the brain captures but does not compound" research
([[reference_alpha_obsidian_brain_improvement_research_2026_05_29]]). Adds a
DENSE (semantic) ranking + Reciprocal Rank Fusion on top of the existing
BM25-lite scoring in `scripts/lib/memory-index-search-lib.mjs`, so a query
surfaces memories that share *meaning* but not *tokens* — the class BM25 alone
silently misses. Anthropic Contextual Retrieval reports ~35-49% fewer failed
retrievals from this exact combination.

## Where it runs

`runMemoryIndexSearch(query, opts)` is called **synchronously** by the
`memory-index-precheck-inject.mjs` UserPromptSubmit hook (50-200×/session
across the fleet via the cag-router fan-out). That hook lives under
`.claude/hooks/` and is **cross-worktree-write-locked** (fleet safety) — its
call site cannot change. Every design choice below follows from "must stay a
synchronous, drop-in, fail-safe extension of the existing function."

## Pipeline

1. **BM25-lite** over the prebuilt `memory-index-sidecar.json` records
   (unchanged — `scoreMemoryRecord`, name/desc/body/alias weighted).
2. **Dense**: embed the query via ollama `nomic-embed-text` (`search_query:`
   prefix) through a **synchronous curl subprocess** (`embedQueryViaOllamaSync`
   — node fetch is unreliable under parallel-localhost contention per CLAUDE.md,
   and sync keeps the hot path sync). Cosine vs the int8 vectors in
   `memory-embeddings-sidecar.json`; top-50 candidates.
3. **Fuse**: `reciprocalRankFusion([bm25Keys, denseKeys], {k:60})` —
   `score(d)=Σ 1/(k+rank+1)`. A dense-only (BM25-miss) doc still surfaces; keys
   hydrate to full records via the all-records `byKey` map.

## Fail-safe ladder (every rung degrades to byte-identical BM25)

`tryHybridFuse` returns `null` → BM25-only (`source:"sidecar"`) on any of:
`opts.hybrid===false` · `PRISM_MEMORY_HYBRID_DISABLE=1` · **no embeddings
sidecar** (the self-activation gate — hybrid is dormant until the sidecar
lands) · **circuit breaker tripped** (a query-embed failure stamps
`.memory-embed-circuit.json`; fresh failure <120s skips the network entirely,
so a wedged/contended ollama adds ZERO latency) · embed timeout/junk ·
dim-mismatch (model swap guard) · zero dense candidates.

## Storage (int8, scale-cancellation)

int8 quantization is direction-preserving and **cosine is scale-invariant**, so
the per-vector quant scale cancels — the sidecar stores ONLY the int8 bytes
(base64) + the int8 vector's L2 norm. ~8 MB for 10.9k×768-d vs ~67 MB
float32-as-JSON (a 5 s-hook-budget-relevant difference). `cosineSimInt8(qFloat,
int8, int8Norm, qNorm)`.

## Build / operate

```
node scripts/build-memory-embeddings-sidecar.mjs            # full (~7 min, 10.9k embeds)
node scripts/build-memory-embeddings-sidecar.mjs --resume   # continue after a stall
```

Reuses the BM25 sidecar's record list (1:1 key alignment), fail-loud (exits 1
on ollama-preflight fail or >25% embed failures), atomic write, `.partial`
checkpoints. Should be re-run on the same cadence as `build-memory-index-
sidecar.mjs` (Stop/cron). A **stale** embeddings sidecar is used anyway (it just
misses recently-added memories' dense vectors — those still surface via BM25).

## Knobs

`PRISM_MEMORY_HYBRID_DISABLE=1` (full revert) · `opts.{embedTimeoutMs,
denseCandidates,rrfK,embeddingsSidecarPath,embedQueryImpl}` (the last makes the
network injectable for hermetic tests).

## Tests + lesson

`scripts/memory-index-search-hybrid.test.mjs` (19 node:test). Load-bearing
fail-on-revert oracle: a lexically-disjoint memory surfaces in HYBRID but NOT in
BM25-only (proves the dense path is load-bearing, not decorative). **Lesson:**
the hermetic suite (injected `embedQueryImpl`) ALL-passed while the real
sync-curl path silently failed on a COLD nomic load (1.5s cap → ceil 2s, too
tight); only the real-data E2E caught it (→ 2.5s). Pure-core + injected-deps
MUST ship one real-data E2E — recurring class. Memory:
[[reference_alpha_hybrid_memory_retrieval_a6_2026_05_29]].

## A3 — the 34 galaxy brains in the corpus (2026-05-29 slot:alpha)

A6 upgraded the recall *mechanism*; A3 widened what it can reach. The 34
per-galaxy brains at `mcp-server/src/engines/<galaxy>/MEMORY.md` were absent from
the recall corpus (the `galaxies` namespace held only the vault README) — so the
per-domain brains were not semantically reachable through the hot path. They are
named `MEMORY.md` (which the vault loop deliberately skips) and carry the galaxy
name in the DIRECTORY, so `build-memory-index-sidecar.mjs` gained a dedicated
`collectGalaxyBrains()` (exported, pure, fail-soft) wired into `buildSidecar`
(`includeGalaxyBrains`, default-true, additive). Each brain → a `galaxies`-namespace
record: `name`=galaxy slug (a synthetic `<slug>.md` filename fed to
`buildMemoryRecord` sidesteps the 34-way "MEMORY" name collision), `description`
from the leading H1, `fileName`=`<slug>/MEMORY.md` (distinct key from
`galaxies/README`). The embeddings builder reuses the index record list 1:1, so a
`--resume` rebuild embeds the 34 new keys automatically.

**Load-bearing invariant:** the galaxy/engines-root mtime is returned separately
(`galaxyMtimeMs`) and is NEVER folded into `sourceMtimeMs` — that field is the
lib's vault-staleness oracle (compared against the vault namespace dirs only), and
the fast-churning `engines/` tree would otherwise dominate it and suppress the
"sidecar stale → regen" advisory. A named `LOAD-BEARING` test pins this.

**Verified live:** 34/34 brains embedded (`/api/embeddings`, 0 failures),
recordCount 10892→10944, `source=hybrid`; `galaxies/token-optimization` ranks #1
on a domain query, `galaxies/speed-feed` #26. **Known limit (E-tier follow-up):**
brains whose H1 is templated boilerplate ("Lathe Galaxy MEMORY.md — per-domain
memory cascade index") rank low on domain-term queries — their indexed text
describes the FILE FORMAT, not the DOMAIN. A slot's *own* brain is already
auto-injected via the slot-context-bundle, so A3's incremental value is
cross-domain discovery, which the generic headers throttle. Memory:
[[reference_alpha_galaxy_brain_recall_indexing_a3_2026_05_29]].

### A3-enrichment — index DOMAIN text, not the boilerplate header (2026-05-29 slot:alpha)

Closes the limit above. New pure `extractGalaxyDomainText(body)` in
`build-memory-index-sidecar.mjs` builds the galaxy record's `opening` (which feeds
both BM25 and `buildEmbedDocText`) from the brain BODY's domain vocabulary — H2/H3
heading texts, the `Filename heuristic: lathe, turning, css, g96…` line, fenced
domain rules — while dropping two noise clusters: the cascade-index template block
AND the generic governance lead ("Cross-session working brain… older entries
collapse… eats its own dogfood") that was crowding real domain terms past the
700-char cap on RICH brains (post-processor was losing Haas/Okuma/Fanuc). Phrases
are distinctive — bare "append-only" is NOT dropped (legit DB-galaxy content).
**Real-data E2E:** `galaxies/lathe` >200→61, `wedm`→33, `speed-feed` 26→8,
`post-processor`→4, `token-optimization` held top-2. The residual low ranks
(lathe/wedm) reflect those brains being thin cascade STUBs awaiting content
migration — a per-domain-slot content task, not a builder limit. **P3 follow-up:**
capture-REORDER (prioritize the heuristic line + domain headings ahead of
session-meta) for meta-heavy brains. 37/37 tests, 2 reviewers PASS.

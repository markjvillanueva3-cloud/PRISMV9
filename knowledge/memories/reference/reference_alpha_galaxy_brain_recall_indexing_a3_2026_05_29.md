---
name: reference_alpha_galaxy_brain_recall_indexing_a3_2026_05_29
description: A3 — the 34 per-galaxy MEMORY.md brains are now indexed + embedded in the hybrid recall corpus (galaxies namespace); compounds A6
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.469Z
aliases: reference_alpha_galaxy_brain_recall_indexing_a3_2026_05_29
---


A3 (2026-05-29, slot:alpha, commit `481b725a38`) — the recall-corpus half of
"the brain captures but does not compound." A6 built hybrid BM25+dense+RRF recall
([[reference_alpha_hybrid_memory_retrieval_a6_2026_05_29]]); A3 widened *what it
can reach* by indexing the 34 per-galaxy brains at
`mcp-server/src/engines/<galaxy>/MEMORY.md` — previously ABSENT from the corpus
(the `galaxies` namespace held only the vault README, 1 record).

**What shipped:** new exported pure `collectGalaxyBrains()` in
`scripts/build-memory-index-sidecar.mjs`, wired into `buildSidecar`
(`includeGalaxyBrains`, default-true, additive). The brains are named `MEMORY.md`
(which the vault loop deliberately skips) and carry the galaxy name in the
DIRECTORY — so they need a dedicated collector. Each → a `galaxies`-namespace
record: `name`=slug (a synthetic `<slug>.md` filename fed to `buildMemoryRecord`
avoids the 34-way "MEMORY" name collision), `description` from the leading H1
(brains carry no frontmatter), `fileName`=`<slug>/MEMORY.md` (distinct key from
`galaxies/README`). The embeddings builder reuses the index record list 1:1, so
`build-memory-embeddings-sidecar.mjs --resume` embedded the 34 new keys
automatically.

**Load-bearing invariant:** `sourceMtimeMs` stays VAULT-ONLY — the galaxy/engines
mtime is returned + stored separately (`galaxyMtimeMs`) and NEVER folded into the
lib's vault-staleness oracle (else the fast-churning `engines/` tree suppresses
the "sidecar stale → regen" advisory). A named `LOAD-BEARING` test pins it.

**Verified live (real-data E2E, mandatory per the A6 cold-model lesson):** 34/34
brains embedded via `/api/embeddings` (0 failures), recordCount 10892→10944,
`source=hybrid`; `galaxies/token-optimization` ranks **#1** on
"token optimization efficiency obsidian memory", `galaxies/speed-feed` #26.
31/31 tests; 2 per-file reviewers PASS (0 P0/P1). Also fixed 2 pre-existing
staleness tests drifted from the U-OBF graceful-degradation contract
(stale→use-anyway; live reserved for corruption).

**Known limit → E-tier follow-up:** brains whose H1 is templated boilerplate
("Lathe Galaxy MEMORY.md — per-domain memory cascade index") rank low on
domain-term queries (`galaxies/lathe` >200) — their indexed text describes the
FILE FORMAT, not the DOMAIN. A slot's OWN brain is already auto-injected via the
slot-context-bundle, so A3's incremental value is *cross-domain* discovery, which
generic headers throttle. Fix = enrich per-brain indexed text builder-side (index
`##` section headings / first substantive domain sentence) OR descriptive-header
the 34 brains. Tracked as the next obsidian-brain iteration.

The compounding arm (B1 per-galaxy reflection — cluster `reference_*` into
`patterns/<galaxy>_synthesis.md`) remains BLOCKED on Ollama generation
(`/api/chat` wedged fleet-wide under GPU contention; `/api/embeddings` works,
which is why A3/A6 could ship). See [[feedback_psn_definition]] leg #1 (Obsidian
brain).

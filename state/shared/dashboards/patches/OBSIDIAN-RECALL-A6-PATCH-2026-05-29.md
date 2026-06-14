> **✅ ALREADY-DONE (triage, 2026-06-02).** A6 hybrid BM25+dense+RRF code is live in `memory-index-search-lib.mjs` + wiki + per-file memory. The `## OBSIDIAN-BRAIN RECALL` CLAUDE.md section A6 would CREATE is deferred — adding a ~20-line section to the peer-locked 494-line (2.5× size-limit) CLAUDE.md is the high-risk doc-edit consistently routed to a main-tree hygiene pass; the feature is reflected in wiki/memory. CLOSED.

# PATCH-SIBLING — A6 hybrid memory retrieval (doc-reflection for locked surfaces)

slot: alpha · 2026-05-29 · unit: A6 (obsidian-brain recall arm)

The A6 code + wiki + Obsidian-memory surfaces landed directly. These two
surfaces are cross-worktree-write-locked from slot/alpha (`state/shared/*.md`
top-level + the 74KB root `CLAUDE.md`). **Integrator (golf): apply both edits
on merge.** Neither is behavioral — both are pointer-index entries.

---

## 1. `state/shared/MEMORY-RECENT.md` — prepend as the NEWEST entry (top of the list, before the YouTube line)

```md
- [A6 hybrid memory retrieval SHIPPED](../../../C:/Users/wompu/.claude/projects/H--prism/memory/reference_alpha_hybrid_memory_retrieval_a6_2026_05_29.md) — alpha 5/29. BM25+dense(nomic int8)+RRF in memory-index-search-lib.mjs; sync curl-embed keeps hook sync; self-activating on sidecar presence; circuit-breaker+2.5s cap fail-safe→BM25; 10,892-vec sidecar; 19 tests; real-data E2E caught cold-model timeout. The recall arm of "captures-but-doesnt-compound".
```

## 2. `H:/prism/CLAUDE.md` — insert this section immediately BEFORE the line `## MASTER INDEX + AWARENESS STACK (search-first discipline)`

```md
## OBSIDIAN-BRAIN RECALL — hybrid BM25+dense+RRF (A6, 2026-05-29 slot:alpha)

The memory-vault recall hot path (`scripts/lib/memory-index-search-lib.mjs`,
`runMemoryIndexSearch` — fired 50-200×/session by the cross-worktree-locked
`memory-index-precheck-inject.mjs` hook via cag-router fan-out) now fuses
BM25-lite with DENSE nomic-embed-text cosine via Reciprocal Rank Fusion, so
recall surfaces semantically-related memories that share no query tokens (~35-49%
fewer failed retrievals, Anthropic Contextual Retrieval). **Strictly additive +
fail-safe**: absent embeddings sidecar / wedged-or-unreachable ollama / embed
timeout / dim-mismatch → byte-identical BM25 (`source:"sidecar"`). Stays
SYNCHRONOUS (the hook can't change) by embedding the query through a sync curl
subprocess; SELF-ACTIVATES on sidecar presence; a file circuit-breaker
(`.memory-embed-circuit.json`, 120s) makes a dead ollama add ZERO latency.
Sidecar `state/shared/memory-embeddings-sidecar.json` (10,892 int8 768-d
vectors); rebuild `node scripts/build-memory-embeddings-sidecar.mjs [--resume]`
(fail-loud >25%). Disable `PRISM_MEMORY_HYBRID_DISABLE=1`. Closes the recall arm
of the "captures-but-doesnt-compound" research; compounding arm (B-tier
reflection) still pending. Wiki:
[`knowledge/wiki/architecture/hybrid-memory-retrieval.md`]. Memory:
[[reference_alpha_hybrid_memory_retrieval_a6_2026_05_29]].
```

---

Provenance: research [[reference_alpha_obsidian_brain_improvement_research_2026_05_29]] A6 (highest-ROI item). Both per-file scrutiny reviewers PASS (no P0; 2 converged P1s fixed pre-commit). 19/19 node:test green.

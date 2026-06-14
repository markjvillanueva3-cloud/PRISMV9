---
name: reference_qdrant_tribal_migration_defer_2026_06_09
description: "DEFER the 'migrate tribal-embed-index.json into a new prism_tribal Qdrant collection' unit — DON'T build it as scoped. Two blockers found via R8 read: (1) the source corpus is mid-rebuild (167MB, mtime 06-09 00:09, was clobbered 33,639->1 then restored on 06-08 — unstable foundation, R13 forbids a consumer atop it); (2) a tribal->Qdrant path ALREADY exists via populate-tribal-vault.mjs -> prism_memory:remember(kind='tip'), so a parallel prism_tribal collection is the R7 two-patterns anti-pattern. Reuse-vs-new-collection is an operator decision. Live Qdrant has only prism_skills/prism_engines/prism_formulas."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.903Z
aliases: reference_qdrant_tribal_migration_defer_2026_06_09
---


**2026-06-09 (slot golf/charlie, synergy /goal) — scoped the 'Qdrant tribal migration' unit, then correctly DEFERRED it after an R8 read. Recording so the next chat does not repeat the pre-compaction scoping error.**

**What the unit WAS (pre-compaction scoping):** bulk-upsert the ~10,555 pre-computed 768-dim vectors in `state/shared/tribal-embed-index.json` into a NEW `prism_tribal` Qdrant collection (768-dim Cosine), then repoint `.claude/scripts/tribal-rerank.mjs` (PSN leg #5, fires every UserPromptSubmit) to query Qdrant with a JSON fallback. It looked tractable ("bulk upsert, no re-embed").

**Why it is DEFERRED (two independent blockers, both verified live 06-09):**

1. **R13 — unstable foundation (the decisive one).** The source corpus `state/shared/tribal-embed-index.json` is **actively mid-rebuild**: live size **167,637,848 B (167MB), mtime 2026-06-09 00:09**. It was clobbered **33,639→1 entries on 2026-06-08** (fail-OPEN read → empty-then-clobber, see [[reference_tribal_index_v8_string_cap_2026_06_08]]), restored to a ~4,162-entry baseline, and is now being re-embedded back up (167MB and climbing, was 537MB pre-clobber). Building a new Qdrant collection + repointing the LIVE PSN leg #5 on a corpus that is changing under you is "a consumer atop an unproven dependency" — exactly what R13's logical-order rule forbids. Wait for the corpus to stabilize (size stops climbing, entry count steady) before migrating.

2. **R7/R8 — a tribal→Qdrant path already exists (don't fork it).** `scripts/populate-tribal-vault.mjs` (INTEL-OLLAMA-OBSIDIAN-MS0/P1-U03) already embeds every tip into Qdrant via `prism_memory:remember` with `kind="tip"` (MCP server computes the embedding). It sources the STRUCTURED tip catalogs (`mcp-server/src/data/*-tips*.ts` via `dump-all-tips.ts`), writes per-tip markdown to `knowledge/tribal/`, and embeds. That is a DIFFERENT corpus from `tribal-embed-index.json` (which is the WIKI-embedded tribal corpus consumed by tribal-rerank), but it proves Qdrant tribal embedding is already a wired pattern. **Live Qdrant collections (06-09): `prism_skills, prism_engines, prism_formulas` — no tribal collection exists yet**, so wherever `prism_memory:remember(kind=tip)` routes, it is not a visible dedicated tribal collection. Standing up a NEW `prism_tribal` collection without first deciding "reuse the prism_memory tip path vs. a dedicated collection" is the R7 two-contradicting-patterns trap.

**The real decision to make FIRST (operator / next chat):** does the tribal-rerank PSN leg want (a) its own `prism_tribal` Qdrant collection populated by a one-shot bulk-upsert of the pre-computed vectors (fast, but a 2nd store to keep in sync), or (b) to route through the existing `prism_memory` tip-embed path (single store, but re-embeds + different corpus shape)? This is an architecture choice with real sync/consistency consequences — not a reflexive build. Resolve it, THEN migrate once the corpus is stable.

**Honest status:** no code shipped for this unit — deferral IS the R12/R13-correct outcome (don't build on a mid-rebuild corpus, don't fork an existing path). The MCP-boot-heap-floor / cmdMatch / hook-protocol infra fixes from earlier this session ARE shipped (see [[reference_mcp_boot_heap_oom_2026_06_09]], [[reference_mcp_cmdmatch_blind_2026_06_09]]). Related: [[reference_tribal_index_v8_string_cap_2026_06_08]] (the clobber + V8 string-cap that destabilized the corpus).

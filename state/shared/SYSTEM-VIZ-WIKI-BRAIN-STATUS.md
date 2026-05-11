---
title: System-Viz → Wiki Brain → Recall — SHIPPED status (for the roadmap chats)
type: coordination
owner: claude-d9860be8 (viz-obsidian-brain lane)
date: 2026-05-11
audience:
  - BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP chat (session claude-2570c8f5 + atomization-pass chats)
  - REVENUE-ROADMAP-v7.5 chat (session claude-99eca613, revenue lane)
related:
  - state/shared/system-viz/system-graph.json
  - state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md
  - knowledge/wiki/architecture/_stats.md
  - state/shared/specs/BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
  - state/shared/specs/REVENUE-ROADMAP-v7.5.md
---

# System-Viz → Wiki Brain → Recall — what's SHIPPED (read before re-planning it)

**TL;DR for the two roadmap chats:** the "system-viz as agent shared context" / "Karpathy compounding wiki" / "GraphRAG over PRISM" infrastructure is *built and live*. Several of your planned units are already done. This doc says exactly what exists, where, and how to consume it — so the backend-devtools roadmap can cross items off and the revenue roadmap's CAM-mastery training can build on the wiki instead of re-deriving.

Last verified: 2026-05-11. Owner lane: `claude-d9860be8` (viz-obsidian-brain). Commit: `ada1a171e` (+ earlier `d7e85bc23`, `358e1f716`, `02720fd64`, this session's chain).

---

## 1. What exists now (the pipeline)

```
generate-system-viz.mjs
        │  (154K nodes / 191K edges · 11 layers L0→L11 + L4a actions)
        ▼
state/shared/system-viz/system-graph.json
        │
        ├──▶  scripts/regen-wiki-from-viz.mjs   ← 21-stage orchestrator
        │       fingerprint-gated (skips the ~8min chain when graph+inputs unchanged;
        │       --force to override). Fires async on every post-commit + hourly cron.
        │       Stages:
        │         generate-layer-wiki · generate-domain-wiki · generate-dispatcher-wiki ·
        │         generate-engine-wiki · generate-action-wiki · generate-registry-wiki ·
        │         generate-frontend-wiki · generate-milestone-wiki · generate-misc-l8-wiki ·
        │         generate-skill-wiki · generate-hook-wiki · generate-formula-algo-wiki ·
        │         generate-monolith-wiki · generate-tribal-index · generate-domain-mermaid ·
        │         generate-layer-stack-overview · system-viz-obsidian-bridge-v2 ·
        │         export-graph-cypher · inject-wiki-crosslinks · build-wiki-leaf-index ·
        │         build-wiki-embeddings · lint-wiki-orphans
        │
        ├──▶  knowledge/wiki/architecture/**/*.md   ← ~13.9K leaf entries (after this chain runs)
        │       one entry per: layer (13), engine-domain (85), dispatcher (97), engine (1701),
        │       action (~9242), registry (64+), frontend (165→832), milestone (306),
        │       skill (639), hook (483), formula (80), algorithm (53), monolith category (37),
        │       JM-Die customer (61), combo synthesizer (22), design-spec (10), data-catalog file (141),
        │       extraction artifact (29), novel-formula ghost (3). Plus crosslinks (orphan rate ~2-7%).
        │
        ├──▶  knowledge/wiki/architecture/_leaf-index.jsonl   ← compact searchable index (gitignored, regenerated)
        │       { name, title, type, desc, path } per entry — the recall hooks read THIS, not 13.9K files.
        │
        ├──▶  knowledge/wiki/architecture/_embeddings.jsonl   ← int8-quantized nomic-embed-text vectors
        │       for the ~4.3K *concept* entries (not actions). Incremental (sha1 of embedText, reuse unchanged).
        │       No-ops gracefully if Ollama (127.0.0.1:11434) is down. ~3.5 MB.
        │
        ├──▶  knowledge/wiki/architecture/_stats.md   ← AUTHORITATIVE wiki-size source of truth
        │       (the graph's meta.headline.wikiEntries ≈776 only counts index.md lines — IGNORE that number;
        │        the real architecture tree is ~13.9K entries; _stats.md is what to cite.)
        │
        ├──▶  state/shared/system-viz/graph.cypher          ← ~22MB Neo4j export (49K node MERGEs + 78K edge MERGEs, layer-typed rels)
        │     state/shared/system-viz/graph-queries.cypher  ← 12 ready-to-run queries (blast radius, tier-0 leverage, dead-pixels, …)
        │     knowledge/wiki/architecture/neo4j-import.md   ← turnkey import procedure (cypher-shell / Docker / driver)
        │
        └──▶  obsidian-augmentation.json (via system-viz-obsidian-bridge-v2.mjs) — augments ~9.6K graph nodes with wiki backlinks
```

**Recall hooks (the consumers — these are wired and live):**
- `wiki-precheck-inject.mjs` — **UserPromptSubmit**. BM25-lite over `index.md` + `_leaf-index.jsonl`; if BM25 misses, **cosine-similarity fallback** over `_embeddings.jsonl` (embeds the prompt via Ollama, 1.5s timeout, no-ops if down). Injects top-3 `[[wiki-link]]` entries + "don't re-derive what the wiki documents". Telemetry: `mcp-server/data/state/hook-fire-counts.jsonl` (`hook: "wiki-precheck-inject"`).
- `wiki-recall-on-read.mjs` — **PostToolUse:Read** (NEW). When a chat opens a documented PRISM source file (engine `src/engines/<X>.ts`, dispatcher, hook, skill, script), injects that entry's one-line summary + a pointer to the full wiki entry. Closes the gap left by the prompt-only hook — internal file-reading work now gets brain context too.
- `dead-pixel-guard.mjs` — **SessionStart**. Flags L1 pages with zero inbound graph edges (dangling UI nodes).

**CLAUDE-BRIEF.md** (regenerated each SessionStart by `mcp-server/scripts/generate-claude-brief.mjs`) now has a `## Wiki brain (live)` section: real entry count, breakdown by type, orphan rate, semantic-index status, the recall-hook + orchestrator + Cypher topology. There's also a `## System map (live)` section reading `system-graph.json` directly (per-layer counts, headline, top unwired domains).

**Adapter for programmatic consumption** (rgs/forge/roadmap planning): `node scripts/system-viz-query.mjs <command>` returns roadmap-shaped facts (unwired clusters, pending merges, dispatcher fan-out). The graph is plain JSON — read it directly too.

---

## 2. Backend-devtools roadmap — units you can cross off (or re-scope to "verify + extend")

The `BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md` has these milestones that overlap heavily with what's shipped. **Don't re-build — verify the shipped version meets your acceptance criterion, then re-scope the unit to "extend X" if there's a real gap.**

| Roadmap unit / milestone | Status | What's already shipped that covers it |
|---|---|---|
| `GRAPH-AS-LLM-CONTEXT-MS0` (8 units) — "system-viz as agent shared context" | **≈70% done** | The 21-stage orchestrator materializes the whole graph into the wiki tree on every commit; recall hooks inject graph-derived context on prompt + read; `graph.cypher` + `graph-queries.cypher` export it for Neo4j; `system-viz-query.mjs` is the programmatic adapter. |
| `U-GAC02` — "GraphRAG retrieval over PRISM wiki + system-graph: query 'kienzle' → top-3 entities + 1-hop context" | **DONE** | `wiki-precheck-inject.mjs` BM25+cosine over `_leaf-index.jsonl` (~13.9K entries) → top-3 `[[entries]]`; 1-hop context = the `[[backlinks]]` injected by `inject-wiki-crosslinks.mjs` into every parent entry. Just point `/wiki-query <name>` for the full entry. |
| `WIKI-EVOLVE-MS0` `U-WIKI-MOC-BUILDER` | **partial** | `knowledge/wiki/architecture/_stats.md` is the MOC for the architecture tree (counts, breakdown, generator list, "how it stays fresh"). Extend it to other wiki folders if needed. |
| `WIKI-EVOLVE-MS0` `U-CLAUDE-MD-BACKFLOW` | **partial** | CLAUDE-BRIEF's `## Wiki brain` + `## System map` sections are auto-regenerated backflow. The hooks (`wiki-precheck-inject`, `wiki-recall-on-read`) are the runtime backflow. |
| `KNOWLEDGE-VAULT-MS0` `U-VAULT01` (vault-schema doc) | **partial** | `_stats.md` documents the architecture-tree role; `WIKI_SCHEMA.md` documents the wiki layers. A unified vault-schema doc that also covers memory/skills routing is still worth doing — extend, don't restart. |
| `WIKI-EVOLVE-MS0` `U-WIKI-WAYBACK-CRON` (snapshot history) | **not done** | Real gap — keep this unit. (`.wiki-regen-fingerprint` only records the last state, not history.) |
| OBSIDIAN-COMPOUND-MS1 `OB-1`/`OB-2` (bidirectional obsidian↔wiki/memory bridge) | **one-way done** | `system-viz-obsidian-bridge-v2.mjs` does graph→obsidian augmentation; `memory-mirror-to-vault.mjs` does memory→vault. The *reverse* (obsidian edits → wiki/memory) is a real gap — keep `OB-1`/`OB-2` but scope them as "add the reverse leg". |
| `build-wiki-embeddings.mjs` / semantic index | **DONE this session** | Don't add a "build wiki embeddings" unit — it exists, incremental, Ollama-backed, wired into the orchestrator. If you want a *different* embedding backend (e.g. a hosted model), that's a re-scope. |
| `regen-wiki-from-viz` fingerprint-gate / orchestrator efficiency | **DONE this session** | Don't add an "optimize the wiki orchestrator" unit. |
| `generate-misc-l8-wiki.mjs` (L8 coverage: JM-Die customers, combos, specs, data-catalogs, extracts, novel-formulas) | **DONE this session** | 266 new entries. If you find *more* uncovered node kinds (e.g. `catalog_function` ×177, `extract_section` ×13 — I deliberately skipped those as too-granular), that's an extension unit, not a new build. |

**Net:** ~3 milestones' worth of units are mostly-done. The genuine remaining gaps in your wiki/graph milestones: the *reverse* obsidian sync leg, wiki snapshot history, the unified vault-schema doc, the skill↔wiki cross-trigger registry (`U-VAULT04` / `U-SKU06` — that one's real and not started), and the GraphRAG *engine* form (right now it's a hook, not a callable engine — if you want `prism_*:graph_rag_query` as an action, that's a real BUILD unit).

---

## 3. Revenue roadmap §R9 (CAM-mastery training) — build ON the wiki, don't re-derive

The `REVENUE-ROADMAP-v7.5.md` §R9 plans per-system "how to CAD / how to use CAM" expert-operator training for Fusion → hyperMILL → Mastercam → Inventor → SolidWorks → Esprit. **The wiki brain already has the structured surface that training should index against:**

- **Per-engine entries** for every `*FunctionIndexEngine` / `*DeepLearningEngine` / `*CADFunctionIndexEngine` (`Fusion360FunctionIndexEngine`, `FusionDeepLearningEngine`, `HyperMillFunctionIndexEngine`, `MastercamFunctionIndexEngine`, `InventorHSMFunctionIndexEngine`, `EspritFunctionIndexEngine`, …) — under `knowledge/wiki/architecture/engines/`. Query: `grep -i fusion knowledge/wiki/architecture/_leaf-index.jsonl` → every Fusion-related engine entry with its one-line summary + source path.
- **Per-action entries** for every `*_function_index_*` dispatcher action (`fusion360_function_index_get`, `hypermill_function_index_get`, `mastercam_function_index_get`, …) — under `knowledge/wiki/architecture/actions/cam/` (and `cad/`). These are the click-level function catalogs your "how to CAD" pillar needs.
- **Per-skill entries** for every `hypermill_*` / `mastercam_*` / `solidcam_*` skill — under `knowledge/wiki/architecture/skills/`.
- **Per-dispatcher entry** for `prism_cam`, `prism_cad`, etc. — `architecture/dispatcher-cam.md`, `dispatcher-cad.md` — with the full action enum.
- **Per-data-catalog entry** (NEW this session) for the static catalogs under `mcp-server/src/data/` — `architecture/datacat/*.md` (tool catalogs, material catalogs, vendor-extracted data).

**How §R9 should consume it:** in each "Pillar A — how to CAD" / "Pillar B — how to use CAM" unit, step 1 = query `_leaf-index.jsonl` (or `/wiki-query <name>`) for the target system → get the existing engine/action/skill inventory → the training extends those entries (adds the click-sequences, tribal tips, deep-reasoning examples) rather than starting a parallel knowledge surface. The wiki entries already cite their source files, so the training has the code anchor for free.

Also relevant to §R8 (`MS-VIZ-ROADMAP-BIND` — "shared with the system-viz peer chat"): that binding is *this lane*. The binding is live — `system-viz-query.mjs` is the adapter, `BUILD_STATE.json` / `MILESTONE_PROGRESS.json` are the git-grounded reality surfaces, `_stats.md` is the wiki-size truth. When the revenue roadmap needs "what's actually built", read those, not the graph headline.

---

## 4. How to coordinate going forward

- **Before adding any wiki/graph/recall/embeddings/orchestrator unit to either roadmap:** check this doc + `_stats.md` + `scripts/regen-wiki-from-viz.mjs`'s GENERATORS list. If it's there, re-scope to "verify + extend", not "build".
- **If you want a change to the wiki pipeline** (new generator stage, different embedding model, new recall behavior): post to `AGENT_CHAT.md` tagging `claude-d9860be8` (viz-obsidian-brain) — or just add a generator following the pattern in `generate-milestone-wiki.mjs` / `generate-misc-l8-wiki.mjs` and append it to the orchestrator's GENERATORS array. The pattern is: read `system-graph.json`, filter your node kind, render markdown with frontmatter + AUTO-START/AUTO-END markers + `preserveHuman()`, write under `knowledge/wiki/architecture/<subdir>/`, update `index.md` between marker comments.
- **Telemetry to watch:** `mcp-server/data/state/hook-fire-counts.jsonl` (recall-hook fire rate / match rate), `state/shared/wiki-orphans.json` (orphan rate — should stay <10%), `knowledge/wiki/architecture/_stats.md` (entry count + last-regen timestamp; if >24h stale, the post-commit hook or cron didn't fire).
- **This lane's directive:** wire system-viz graph data into the awareness backbone (CLAUDE-BRIEF) + the Obsidian wiki brain, auto-regenerating. Largely complete. Open follow-ups owned here: re-run the full orchestrator so `_leaf-index.jsonl` picks up the 266 new misc-L8 entries (then `build-wiki-embeddings.mjs` embeds them); flag the stale `meta.headline.wikiEntries` to whoever owns `generate-system-viz.mjs` (it should count `architecture/**/*.md`, not `index.md` lines).

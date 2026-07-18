---
title: Master Index + Awareness Stack — unified search surface
date: 2026-05-13
agent: claude-80d35610
slot: alpha
milestone: OBSIDIAN-PRISM-OS-MS0
tags: [search, indexing, awareness, dispatchers, obsidian]
boost_keywords: [master index, awareness stack, search-first, orphan inventory, deep-search, master_index_query]
links:
  - "[[reference_master_index_surface]]"
  - "[[reference_awareness_stack]]"
  - "[[reference_system_viz]]"
  - "[[reference_build_state_surface]]"
---

# Master Index + Awareness Stack

Source: this content lived inline in `H:/prism/CLAUDE.md` lines ~254-284 from 2026-05-12 through 2026-05-13 (two overlapping sections — a current table + a "legacy section preamble" the current table superseded). Extracted to the wiki via U-CLEANUP-D2 to keep CLAUDE.md under the 200-line "compliance collapse" threshold. The two CLAUDE.md sections are merged here into one canonical entry; the legacy table is preserved below for historical reference.

## Doctrine — search-first discipline

Before Grep / Glob / Agent, hit the unified index. Auto-injects top-5 hits on every UserPromptSubmit via `master-index-precheck-inject.mjs` (T2 hook); auto-injects a 15-line awareness digest on every SessionStart via `awareness-snapshot-inject.mjs` (T2). Manual entry via `/master-index <query>` skill or `prism_session:master_index_query` action.

## Surfaces (current)

| Surface | What | Skill |
|---------|------|-------|
| `MasterIndexEngine.ts` | Singleton, mtime-cached, single-flight. Fuses system-graph (110K nodes, pre-joined w/ wiki+memory) + PRISMSelfAwarenessEngine + BUILD_STATE. | — |
| `prism_session:master_index_query` | Ranked unified search (filter by layer/source/buildClass/min_utilization/min_confidence). | `/master-index` |
| `prism_session:master_index_node_status` | Single-node degree + utilization lookup. | (`/master-index --node`) |
| `prism_session:master_index_utilization_dashboard` | Graph-wide hub/sink/source/orphan/ghost classifier. | `/utilization-dashboard` |
| `scripts/awareness-snapshot.mjs` | 60-line built/utilized/drifted digest → `state/shared/AWARENESS-SNAPSHOT.md`. | `/awareness-snapshot` |
| `scripts/orphan-inventory.mjs` | Built-but-unwired punch list with heuristic dispatcher hints → `state/shared/ORPHAN-INVENTORY.md`. | `/orphan-inventory` |
| `master-index-precheck-inject.mjs` | UserPromptSubmit T2 — auto-injects top-5 hits. | (auto) |
| `awareness-snapshot-inject.mjs` | SessionStart T2 — auto-injects 15-line digest. | (auto) |
| `/deep-search` | Policy: defines search→reason→neural escalation order. | `/deep-search <query>` |

## Hit shape

Each hit carries: `source` (graph_node / engine / action / hook / skill), `confidence` [0,1], `utilization` [0,1] (log-normalized in-degree), `buildClass` (wired / unwired / pending / frontend / unknown), pre-joined wiki+memory entry names.

The shared keyword-search lib `scripts/lib/master-index-search-lib.mjs` (behind the 4 `pre-*-graph-inject` hooks + subagent pre-search + `master-index-precheck-inject`) additionally attaches a **`noteCount`** to each `searchGraphHits` hit (commit `1b1325b38c`, `U-SV-MASTERINDEX-NOTECOUNT`): the FULL `wikiEntries.length + memoryEntries.length` brain-coverage count — distinct from the truncated `wiki`(3)/`memory`(2) display arrays. Same arithmetic as the find-cache `projectForFind` noteCount (it always emits the field incl. 0; the sparse find-cache omits it at 0). Structural count for context-retention routing — consumers can prefer documented nodes / surface ` (N docs)`. Additive: existing consumers ignore it.

**Answers "is node X fully utilized?"**:
- high in-degree + high out-degree → hub
- low in-degree + low out-degree + has docs → orphan (punch-list candidate)
- low in-degree + low out-degree + no docs → ghost (dead-code candidate)
- high out-degree + low in-degree → utility called by few

## Knobs

| Env | Effect |
|-----|--------|
| `PRISM_MASTER_INDEX_INJECT=0` | Disables UserPromptSubmit auto-inject |
| `PRISM_MASTER_INDEX_K=N` | Sets top-K (default 5) |
| `PRISM_AWARENESS_INJECT=0` | Disables SessionStart awareness digest |
| `PRISM_AWARENESS_INJECT_STALE_HOURS=N` | Threshold before regenerating digest |

## Origin

Obsidian vault rooted at `H:/prism/knowledge` (wiki/ + memories/). Built 2026-05-12..13 in OBSIDIAN-PRISM-OS-MS0 (6 units, slot alpha overnight loop). Commits: `3cd27c288`, `28fccde44`, `b13f220cd`, `0089b2de7`, `79b6366fd`, `aae8e7b64`.

## Legacy section preamble (kept for reference)

Pre-supersede form that lived above the table in CLAUDE.md. Carries the same intent in a compacter shape — included so anyone reading the git history can recognize the same content.

| Surface | What |
|---------|------|
| Engine | `mcp-server/src/engines/MasterIndexEngine.ts` — singleton, mtime-cached, single-flight |
| Actions | `prism_session:master_index_query` (filter by layer/source/buildClass/min_utilization/min_confidence), `prism_session:master_index_node_status` (single-node degree + utilization) |
| Hook | `.claude/hooks/master-index-precheck-inject.mjs` (UserPromptSubmit, T2) — auto-injects top-5; excludes L9/L11 noise + dedups by label |
| Skill | `.claude/commands/master-index.md` (/master-index) |
| Fusion sources | system-graph.json (110K nodes, pre-joined w/ `knowledge.wikiEntries[]` + `knowledge.memoryEntries[]`), PRISMSelfAwarenessEngine.findCapabilities, BUILD_STATE.json |

## Related memory

- `reference_master_index_surface.md` — auto-injected user memory describing the search-first discipline
- `reference_awareness_stack.md` — the broader 6-surface awareness stack (master-index + utilization + snapshot + injects + deep-search + orphan-inventory)

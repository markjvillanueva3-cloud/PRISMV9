---
name: master-index-system-viz-first
description: Always hit the trio master-index + master-graph + /system-viz BEFORE Grep/Glob/Agent when searching the codebase. Each tool answers a different question; together they cover every search class. Operator-codified 2026-05-28 after observing 0.4% fleet take-rate on route nudges.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.433Z
aliases: feedback_master_index_system_viz_first
---


**Master-index + master-graph + /system-viz are the canonical search trio — Grep/Glob/Agent are FALLBACK only.**

**Why:** Each of the three answers a DIFFERENT question. Grep/Glob/Agent re-scan the whole codebase every time (O(N)) while the trio is pre-indexed (O(1)). PRISM's route-nudge telemetry shows 0.4% fleet take-rate on these tools (11/2735 nudges actioned) — meaning chats overwhelmingly default to Grep/Glob, paying the token cost every search.

**How to apply (use the right tool for the question):**

- **`prism_session:master_index_query` (master-index)** — "Where is X?" / "What handles Y?" / "Is Z built/wired/utilized?" Ranked unified search over system-viz graph + Obsidian vault + capability index + BUILD_STATE. Returns top-K hits with relevance scores. ALWAYS try this FIRST for any "find something by concept" query. Auto-injected as top-5 hits on every UserPromptSubmit via `master-index-precheck-inject` (T2).

- **`prism_session:master_index_node_status` (master-graph)** — "What state is node X in?" Returns lifecycle status (built / wired / utilized / orphaned / ghost) for a specific node. Use when you have a name and need disposition before acting on it.

- **`/system-viz` (live 3D visual surface)** — "Show me the entire system." 3D 10-layer + 21-roost overlays of the whole codebase + all 11 PSN legs. Open in browser for visual exploration when you need to see relationships between domains, not just answer a point query. Auto-regenerates from live state, starts :8765.

- **Adapter `scripts/system-viz-query.mjs`** — CLI alternative when not in browser. `node scripts/system-viz-query.mjs find <keyword>` / `coverage-by-domain` / `headline`.

- **`prism_intelligence:ai_feature_discover`** — For AI/ML feature questions specifically, this is the recommendation surface (wraps PRISMSelfAwarenessEngine.recommendAIFeatures). Use AFTER master-index returns nothing relevant.

**When Grep/Glob ARE correct:**

- Looking for a literal string in a file you already know (e.g. function call site by exact name).
- Looking for files with a pattern in their name when you know the directory (e.g. `Glob("*.test.ts", "mcp-server/src")`).
- Confidence ≥0.5 that the result will land in the first hit.

Below that threshold → trio first.

**Failure modes the trio prevents:**
- Grep across 26,051 wiki files when master-index already knows the top-3 (token disaster).
- Spawning an Explore agent when a 1-call master-index would answer (per soul refuse `exploratory-subagent-when-grep-suffices`).
- Missing a renamed/moved engine that Grep would never find but graph traversal would.
- Asking "does this exist?" with Grep when `master_index_node_status` returns the lifecycle disposition in one call.

**Operator-codified by:** slot:alpha session a198ff5f 2026-05-28 — after observing trio under-utilization despite being canonical per CLAUDE.md §MASTER INDEX + [[reference_awareness_stack|AWARENESS STACK]] + §SYSTEM-VIZ FIRST.

Related:
- [[feedback_system_viz_first_audit]] — broader system-viz-first doctrine for audits
- [[reference_master_index_surface]] — surface + hit-shape doc
- [[reference_awareness_stack]] — SessionStart auto-injects from these surfaces

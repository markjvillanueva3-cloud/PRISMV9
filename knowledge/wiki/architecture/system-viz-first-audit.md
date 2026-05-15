---
title: System-viz-first audit doctrine
kind: architecture
tags: [doctrine, audit, system-viz, discoverability, master-index]
related: [[audit-viz-first-skill]] [[master-index-surface]] [[awareness-stack]]
last_updated: 2026-05-15
---

# System-viz-first audit doctrine

> **The rule:** Before any cross-cutting discovery question — "does X exist", "where is X wired", "is X duplicated", "are there orphan Y" — query `/system-viz` first. Grep / Glob / Agent search is a **fallback** when graph confidence is < 0.5, not the first move.

Adopted **2026-05-15** as part of `SYSTEM-VIZ-BRAIN-MS0/U-P0-SVB-DOCTRINE`. The doctrine is enforced by [[audit-viz-first-skill]] (UserPromptSubmit T2 hook + `/audit-viz-first` skill) which auto-runs `node scripts/system-viz-query.mjs find <noun>` on prompts containing audit-intent keywords (`audit · inventory · find all · where is · orphan · duplicate · unwired · gap analysis · are there any · how many · list all · what exists · check for · missing · survey · reconcile · enumerate`).

## Why this exists — three concrete grep-only audit failures

Audit recon 2026-05-15 (SYSTEM-VIZ-BRAIN-MS0 P0 reconnaissance) had three independent agent reports each claiming PRISM was missing capability X. `/system-viz` resolved every claim in under 30 seconds:

| Grep-only claim | `/system-viz` reality |
|---|---|
| `OllamaHookBridgeEngine` is orphan / not in src | EXISTS at L5/eng.ai — 10 dispatcher refs, 9 graph nodes |
| `QdrantMemoryEngine` has no dispatcher action | EXISTS at L5/eng.memory — 4 dispatcher refs |
| `CrossDisciplinaryDeepLearningEngine` is orphan | EXISTS at L5/eng.ai — 3 dispatcher refs |
| `distill-tribal` auto-flow MISSING | EXISTS as both `/distill-tribal` skill AND `scripts/distill-tribal` script |
| RTK no auto-wrap | 3 hooks already wired: `rtk-auto-suggest` · `rtk-path-ensure` · `rtk-prefix-reminder` |

**Root cause** — grep matches *text*, not edges. A dispatcher action that imports `engine.method` and re-exports under a different action name is invisible to `grep -r "EngineName"` in dispatcher files but trivially visible in the system-viz graph (the import edge is materialized). Wiki backlinks, test coverage edges, and milestone cross-refs are likewise invisible to grep and load-bearing for "is this wired" / "what depends on this" questions.

The cost of a grep-only audit isn't just wrong answers — it's the secondary work: agents file follow-up "wire the missing engine" tickets, peer chats start writing duplicate engines, milestone scope creeps. The 2026-05-15 recon flagged five engines as "missing" that needed building; system-viz showed every one was already wired. Hours of duplicate work would have shipped before the wrongness surfaced.

## The 4-step protocol

When the question is *discovery* (exists / wired / depends / duplicate / orphan):

1. **Graph query first** — `node H:/prism/scripts/system-viz-query.mjs find <noun>`. Each hit line carries layer + kind + node id + label. The layers tell you *what* the match is:
   - `L5/eng.*` — the engine file (source of truth)
   - `L5/atomic_engine` — engine at the deepest atomic layer
   - `L6/script · L6/hook · L6/skill · L6/test` — the asset itself
   - `L8/wiki_entry` — wiki documentation
   - `L9/worktrees · L9/ghost.ms.*` — git worktrees or milestone refs
   - `L10/architecture · L10/feedback · L10/reference · L10/project` — vault entries
2. **Interpret confidence** — if any hit's label is an exact match for the noun, confidence is high. Multi-layer hits (engine + wiki + test) raise confidence further. Single L10 hit with no L5/L6 match means "documented but not built" — that itself is a useful answer.
3. **Drill where needed** — `node H:/prism/scripts/system-viz-query.mjs node-status <id>` returns dispatcher wiring + utilization (in/out edges) + buildClass (wired/unwired/pending/frontend/unknown).
4. **Semantic fallback** — when the noun is a free-text concept rather than an identifier, route through `prism_session:master_index_query` (action) or `/master-index <query>` (skill). The master index fuses the graph with PRISMSelfAwarenessEngine and BUILD_STATE.

**Grep only when** confidence is < 0.5 and the question is free-text. **Log the fallback** in the chat-bus so the gap can be filled (every grep-fallback is signal that a node label needs adding to the graph).

## How the hook + skill enforce it

- **`audit-viz-first-inject.mjs`** (T2 UserPromptSubmit hook) detects audit-intent keywords in the prompt, extracts the candidate noun via a 4-tier regex cascade (quoted-string → CamelCase → kebab-case → first non-stopword), runs `system-viz-query.mjs find <noun>` with an 8s timeout, and injects the top-K hits as `additionalContext`. Knobs: `PRISM_AUDIT_VIZ_FIRST_DISABLE=1` · `PRISM_AUDIT_VIZ_FIRST_K=N` (default 5, max 20) · `PRISM_AUDIT_VIZ_FIRST_TIMEOUT_MS=N` (default 8000, range 500-30000).
- **`/audit-viz-first <noun>`** skill (`H:/prism/.claude/commands/audit-viz-first.md`) is the operator-facing wrapper for the same protocol. Score 0.80 in the skill-trigger ledger; surfaces whenever audit keywords match.

## When NOT to use this

The doctrine is "graph first," not "graph only":

- **Reading a specific file by path** → use the Read tool directly.
- **Searching inside a known file for a string** → use Grep with that file's path.
- **Counts of an aggregate metric** → use BUILD_STATE / awareness-snapshot / `/utilization-dashboard`, not system-viz.
- **Pure novel concepts not yet ingested into the graph** → falls back to grep + Agent search; log the gap so the regen can backfill.

## Forge integration

Every forge-triple bundle that introduces an audit/regen/discovery script MUST declare its system-viz-query call in the generated stub. This is the envelope-level `doctrine_principle` of SYSTEM-VIZ-BRAIN-MS0: *"every audit/regen/discovery script MUST declare its system-viz-query first; Grep/Glob only as fallback when graph confidence < 0.5."* The per-file scrutiny gate rejects forge stubs that grep without first hitting the graph.

## Cross-references

- Hook source: `.claude/hooks/audit-viz-first-inject.mjs`
- Skill source: `.claude/commands/audit-viz-first.md`
- Master-index surface: [[master-index-surface]]
- Awareness stack: [[awareness-stack]]
- Memory: [[feedback_system_viz_first_audit]]
- Companion: [[reference_master_index_surface]] (semantic search on the same graph)

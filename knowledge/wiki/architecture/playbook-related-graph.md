---
title: playbook-related-graph
type: architecture
date: 2026-05-23
slot: foxtrot
unit: U-PB-RELATED-GRAPH
commit: fa2ccacafe
related:
  - playbook-capability-extensions
  - playbook-suggest-resolution
---

# playbook-related-graph — multi-hop BFS over PlaybookRule.related_rules

Extends 1-hop `explainRule()` into an N-hop walker (`maxDepth ∈ [0,10]`, default 2) surfacing the full neighborhood graph from a root rule. Closes out the playbook conflict-management suite: **detect → rank → RESOLVE → related-graph**.

## Action

```
prism_shop_practice:playbook_related_graph
```

## Inputs

| field | type | required | default | notes |
|---|---|---|---|---|
| `ruleId` | `string (1-256 chars)` | yes | — | Root rule id for the BFS traversal (e.g. `"SEQ-001"`). |
| `maxDepth` | `integer [0,10]` | no | `2` | BFS hop cap. `0` = root only; `1` = direct neighbors; etc. |

## Output

```typescript
{
  success: true,
  report: {
    rootId: string,
    maxDepth: number,
    nodes: Array<{ rule: PlaybookRule, hopDepth: number }>,
    edges: Array<{ fromId: string, toId: string }>,
    unresolvedRefs: string[],   // R12 fail-loud — stale ids
    cycleEdges: Array<{ fromId, toId }>,  // R12 fail-loud — back-edges
    truncated: boolean,         // R12 fail-loud — depth-cap clipped real work
  }
}
```

Returns `{ success: false, error: "...not found in corpus" }` when the root id is missing from the corpus (R12 — surface the stale id, never silently drop).

## Invariants

- `nodes[0]` is always the root @ `hopDepth=0`.
- `hopDepth ∈ [0, maxDepth]` for every node.
- Self-references (rule listing itself in `related_rules`) silently skipped.
- Malformed `related_rules` entries (`typeof !== "string" || length === 0`) filtered.
- `unresolvedRefs` deduplicated via a `seenUnresolved` Set.
- `cycleEdges` deduplicated by `(fromId, toId)` pair.
- `truncated` only fires on an UNVISITED neighbor at the depth cap (not on already-visited).
- BFS visited Set prevents infinite loops on cycles.

## Defense in depth — 3 independent maxDepth guards

1. **Schema layer** — `z.number().int().min(0).max(10).optional()`
2. **Handler layer** — `Math.min(Math.floor(maxDepthRaw), 10)`
3. **Engine layer** — `Math.max(0, Math.floor(maxDepth))`

Each layer clamps independently. Reviewer B flagged this as schema/handler "inconsistency"; retained intentionally as layered guards — schema rejects at the protocol boundary, handler defends if an internal caller bypasses the schema, engine defends if the handler is bypassed. **Not contract drift — defense-in-depth.**

## R12 fail-loud — 3 operator-visible channels

| channel | what it surfaces |
|---|---|
| `unresolvedRefs` | Stale ids that don't resolve in the current corpus (rules referenced in `related_rules` that have since been removed/renamed). |
| `cycleEdges` | Back-edges from BFS (the corpus violates DAG, not necessarily an error — but visible to the operator). |
| `truncated` | `true` when `maxDepth` clipped real unexplored work. Operator can rerun with higher depth. |

## Test coverage

35/35 PASS — 22 engine tests + 13 dispatcher round-trip wiring tests.

**Engine tests** (`PlaybookRelatedGraph.test.ts`):
- Base cases — null root / root-only / empty `related_rules` / undefined `related_rules`
- BFS correctness — 1-hop / 2-hop / depth-respect / default / order-invariant
- Cycle handling — 2-node / 3-node / dedupe / self-reference
- R12 unresolvedRefs — single / dedupe / malformed-filter
- Structural invariants — echo / negative-clamp / fractional-floor / diamond / real-corpus
- R12-negative empty-arrays-not-undefined (added per Reviewer B P2 finding)

**Dispatcher wiring tests** (`PlaybookRelatedGraphDispatcherWiring.test.ts`):
- enum-validation gate (typo rejected by zod)
- input validation — missing / empty / oversized `ruleId`
- input validation — out-of-bounds / fractional `maxDepth`
- happy path — real corpus `SEQ-001`, maxDepth=0 (root-only), maxDepth=10 (upper bound)
- response shape conformance with sibling playbook actions

## Files

| file | role |
|---|---|
| `mcp-server/src/engines/MachiningPlaybookEngine.ts` | + types (`RelatedGraphNode`, `RelatedGraphEdge`, `RelatedGraphReport`) + `relatedGraph()` method |
| `mcp-server/src/tools/dispatchers/shopPracticeDispatcher.ts` | + action enum + `handlePlaybookRelatedGraph` + ACTION_HANDLERS map |
| `mcp-server/src/schemas/shopPracticeActionSchemas.ts` | + strict zod schema + ACTION_SHOP_PRACTICE_SCHEMAS map |
| `mcp-server/src/__tests__/PlaybookRelatedGraph.test.ts` | NEW — 22 engine tests |
| `mcp-server/src/__tests__/PlaybookRelatedGraphDispatcherWiring.test.ts` | NEW — 13 dispatcher round-trip tests |

## Lineage

- iter9 (`6bd789d40d`) — `U-PB-SUGGEST-RESOLUTION` added the RESOLVE step of the conflict workflow.
- iter10 (`fa2ccacafe`) — this entry — adds related-graph traversal.

Together iter9 + iter10 complete the playbook conflict-management suite: **detect → rank → RESOLVE → related-graph**.

## See also

- [[playbook-suggest-resolution]] — sibling action, ranks conflict resolutions
- [[playbook-capability-extensions]] — broader playbook MS pointer
- [[feedback_parallel_scrutiny_per_file]] — per-file scrutiny doctrine

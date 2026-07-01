---
name: reference-master-index-surface
description: MasterIndexEngine — unified search across system-viz graph + Obsidian + capability index + BUILD_STATE. ONE call replaces N Grep/Glob/Agent searches. Auto-injected via UserPromptSubmit hook + accessible via skill + dispatcher action.
aliases: reference_master_index_surface
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.649Z
---


# Master Index — search-first to cut Grep/Glob/Agent token waste

Built 2026-05-12 in OBSIDIAN-PRISM-OS-MS0 (slot alpha, claude-7f79dd78) per user directive: *"set it up so we can utilize the obsidian brain and /system-viz as a master index for quick searching to hopefully save on search tool calls."*

## What it is

A thin orchestrator engine that fuses 4 pre-built data sources into ONE ranked search call. **Use INSTEAD OF `Grep` / `Glob` / `Agent`** for "where is X" / "what handles Y" / "is Z built and wired" questions. The Grep/Glob/Agent path stays available as fallback when the master index returns nothing with `confidence > 0.5`.

## Surfaces (all 4 entry points)

| Surface | Where | When to use |
|---------|-------|-------------|
| **Engine** | `mcp-server/src/engines/MasterIndexEngine.ts` (singleton `masterIndexEngine`) | TypeScript code calling from another engine |
| **Action** | `prism_session:master_index_query` (full query) / `prism_session:master_index_node_status` (single node) | MCP tool call from skill / Claude turn |
| **Skill** | `/master-index <query>` (`.claude/commands/master-index.md`) | User-typed slash command |
| **Hook** | `.claude/hooks/master-index-precheck-inject.mjs` (UserPromptSubmit, T2) | Automatic — fires on every prompt with searchable tokens |

## Sources fused

1. **system-graph.json** at `H:/prism/state/shared/system-viz/system-graph.json` — 110,375 nodes / 114,858 edges / 11 layers. Each node carries pre-joined `knowledge.wikiEntries[]` + `knowledge.memoryEntries[]` (the `system-viz-obsidian-bridge-v2.mjs` script does the join — keep it running).
2. **PRISMSelfAwarenessEngine.findCapabilities** — fuzzy match across engines / actions / hooks / skills with confidence scoring. Wrapped with `withTimeout(800ms, [])` so a hung child engine never stalls the master query.
3. **BUILD_STATE.json** at `H:/prism/state/shared/BUILD_STATE.json` (NOT mcp-server/data/state — the reviewer flagged this as a P0 but the project canonical is state/shared/) — supplies `unwiredEngines` set for `buildClass` annotation.
4. **Graph edge in-degree** → `utilization` score `log1p(inDeg) / log1p(maxInDeg)`, clamped to [0,1].

## Hit shape

```typescript
interface MasterIndexHit {
  source: "graph_node" | "engine" | "action" | "hook" | "skill" | "wiki" | "memory";
  id: string;                              // e.g. "engine.KienzleForceModel"
  label: string;
  path?: string;
  layer?: string;                          // L0..L10 (L11 excluded by hook)
  status?: string;                         // graph node.status raw
  confidence: number;                      // [0,1]
  utilization: number;                     // [0,1] — answers "fully utilized?"
  buildClass: "wired" | "unwired" | "pending" | "frontend" | "unknown";
  wikiEntries?: string[];                  // pre-joined obsidian links
  memoryEntries?: string[];
  fullAction?: string;                     // "prism_calc:cutting_force" for actions
}
```

Returned in `MasterIndexResult` with `bySource` + `byBuildClass` aggregates, `topUtilized[]` (max 5), `underUtilized[]` (max 5, graph_node only with util<0.1), `cacheHit`, `graphMtime`, `warnings`.

## Knobs

| Env var | Effect | Default |
|---------|--------|---------|
| `PRISM_MASTER_INDEX_INJECT=0` | Disable UserPromptSubmit auto-inject | enabled |
| `PRISM_MASTER_INDEX_K=N` | Top-K in injection block | 5 |
| (hook excludes L9/L11) | filesystem leaves stripped from hook output to keep digest dense | — |

## Score blending

Final rank = `confidence × max(UTIL_FLOOR=0.4, utilization^UTIL_BIAS)` with `UTIL_BIAS=1.5`. Result: heavily-used nodes get a boost, but orphans with exact-match relevance still surface (UTIL_FLOOR floor guarantees minimum visibility). **v1.0.0 first draft had `UTIL_BIAS=0.25` which inverted the intent** — fixed before ship.

## Caching contract

- Graph file (64MB) cached by mtime; concurrent first-callers share a single `buildGraphCache` invocation via `graphLoadPromise` (single-flight latch with mtime recheck at completion).
- Inverted index built once per graph load; indexes id + label + info + wiki entry names + memory entry names. v1.0.0 first draft missed wiki/memory tokens — fixed before ship (otherwise nodes whose only match is on Obsidian metadata were invisible).
- `cacheHit: true` only when graph was cached at the same mtime BEFORE the call (fresh load = false).

## Edge cases handled

- Empty / whitespace / stopword-only query → 0 hits + warning
- Oversize query (>500 chars) → backstep to whitespace, not mid-word slice
- Unicode in graph info / wiki names → `\p{L}\p{N}` regex with `u` flag
- Graph file missing → fallback to capability index only
- BUILD_STATE.json missing → no buildClass annotation, no throw
- Windows EBUSY mid-rename → 75ms backoff retry
- findCapabilities hangs → 800ms timeout with empty fallback
- Concurrent first-calls → single-flight via promise latch

## Tests

26 tests in `mcp-server/src/__tests__/MasterIndexEngine.test.ts` — real-value assertions, no `toBeDefined()` stubs (gate-rejected those). Covers input handling, search invariants, caching contract, node lookups, vault stats, score blending direction.

## When NOT to use master index (fall through to Grep)

- `confidence > 0.5` on no hits → master index is uncertain, Grep may help
- Looking for a literal string (e.g., a comment, an error message) that wouldn't be indexed
- Need to scan a directory the graph doesn't index (e.g., `mcp-server/data/state/*.json` raw)

Otherwise: query the master index first. It returns provenance + buildClass + utilization, which Grep can't.

## Wiring history (do NOT trust earlier claims without checking the date)

| Date | Slot/Chat | What landed | Where wired |
|------|-----------|-------------|-------------|
| 2026-05-12 | alpha / claude-7f79dd78 | Engine + dispatcher action + `/master-index` skill + `master-index-search-gate.mjs` (Edit bundle) — original ship of OBSIDIAN-PRISM-OS-MS0/U-MASTER-INDEX | `.claude/hooks/bundles/edit-bundle.mjs:49` (search-gate only) |
| 2026-05-14 | alpha / claude-a2b1b5ca | **Orphan rescue:** `master-index-precheck-inject.mjs` wired into UserPromptSubmit chain (settings.json) — was orphaned in `.claude/hooks/` for 2 days. `awareness-snapshot-inject.mjs` wired into SessionStart chain (individual entry, not bundle — peer DELTA owns bundle this session). Commit `417d2b287` carried the precursor hook-fix; wiring landed in a follow-up. Verified live via 2x dry-run: precheck returns top-5 hits; awareness returns built/wired/drift stats. Exit 0/0. | `C:/Users/wompu/.claude/settings.json` UserPromptSubmit (after `prompt-context-inject.mjs`) + SessionStart (after `build-state-inject.mjs`); auto-mirrored to `H:/.claude/settings.json` by `c-to-h-mirror` hook |

Stale-claim hazard logged 2026-05-14 by predecessor `pid-2712` (precompact handoff `H:/last2.md`): *"reference_master_index_surface memory's claim that the injector 'auto-injects on every UserPromptSubmit' is STALE — verify before relying on memory claims."* This was correct between 2026-05-12 and 2026-05-14. As of the 2026-05-14 row above, the claim is again TRUE for both injectors. Doctrine: when a memory says "auto-injects" without a date, treat as suspect; check `settings.json` + run the hook with empty stdin to verify.

Companion: [[reference_skill_tier_wire_pattern]] (orphan-rescue 5-file recipe — applies for engine wires; for hook wires, it's just 2 settings.json inserts + dry-run verification).

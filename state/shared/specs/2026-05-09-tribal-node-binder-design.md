---
title: Tribal Knowledge ↔ System-Viz Auto-Wiring Layer (sub-project C)
date: 2026-05-09
author: Claude (claude-671e2b1f, brainstorming with Mark Villanueva)
status: approved-design
scope: H:/prism (single-machine, multi-chat aware)
parent-roadmap: tribal-knowledge-auto-wiring-program (5 sub-projects: A/B/C/D/E)
this-spec: sub-project C — keystone schema + binder + PreToolUse hook
follow-on-specs:
  - A — mine H:/PRISM/extracted/ for new tribal tips
  - B — ingest *-cam-tips.js backlog (~3,400 tips)
  - D — HTML render layer over markdown wiki
  - E — neural-network "needed-now" auto-utilization trigger
brief-for: writing-plans
---

# Tribal Knowledge ↔ System-Viz Auto-Wiring Layer

## 1. Problem statement

PRISM has accumulated 243 indexed tribal tips in `TRIBAL_TIP_INDEX.json` plus an estimated ~3,400 unindexed tips embedded in 18 per-CAM `*-cam-tips.js` files (skill descriptions reference "3,700+ tips"). The system-viz graph contains 771 nodes across 10 layers. Today these two assets are completely disconnected:

- **No backlinks**: tips have no way to declare which engine/dispatcher/action they apply to.
- **Invisible at call time**: when Claude (or a spawned Agent) calls `prism_calc:cutting_force_calc`, no mechanism surfaces "the 3 tips operators recorded about this calc."
- **Invisible to viz**: clicking an engine node in `/system-viz` shows no tribal context — the schema lacks `tips[]` / `metadata` / `tags` fields entirely.
- **Separate Obsidian pipeline**: `tribal_export_*` actions and `obsidian_sync_*` actions exist on the same dispatcher but never converge — wiki pages about engines do not embed tribal tips for those engines.
- **No agent parity**: even if Claude main-thread eventually surfaces tips, spawned Agent subagents have no mechanism to consume them, breaking the "agents need to use the entire prism system in the same manner as the regular CLI" requirement.

The user's literal ask: *"every single tribal knowledge tip is wired to corresponding nodes in system-viz so they get utilized automatically when needed."*

## 2. Goals

1. **G1 — Bind**: every tip in the tribal index has zero or more node bindings (1 tip → many nodes); every node has zero or more bound tips ranked by relevance.
2. **G2 — Auto-utilize at call time**: when a tool call resolves to a known node, top-K tips for that node inject into Claude's context as additional context, sub-100ms.
3. **G3 — Agent parity**: same injection fires on subagent tool calls (verified by Phase-0 spike; fallback path defined if harness blocks it).
4. **G4 — Full PRISM stack utilization (build-time)**: binder pipeline consumes Ollama embeddings + PRISMCreativeReasoningEngine NN re-rank + system-viz graph neighbors + Obsidian canonical entries + PRISMSelfAwarenessEngine domain classification.
5. **G5 — Hot path resilience**: hot-path lookup never blocks a tool call; advisory-only by design. Failures emit hint and pass through.
6. **G6 — Hybrid freshness**: pre-baked cards primary; live-fetch escape when card missing or `bakedAt` > 24h. Live path budget 50ms.
7. **G7 — Inspectable and reversible**: cards diffable as JSON; cron rebuild idempotent; env flag `PRISM_TRIBAL_INJECT=0` disables the hook in <5s.
8. **G8 — Wired to all sources** (per CLAUDE.md): new engines registered in `prism_knowledge`, plus `prism_memory` for context-card retrieval, plus `prism_session` for nodeId resolution.

## 3. Non-goals

- N1. Mining `H:/PRISM/extracted/` for new tips. Sub-project A covers it; this spec consumes whatever tips exist at build time.
- N2. Ingesting the `*-cam-tips.js` backlog. Sub-project B.
- N3. HTML render layer for wiki. Sub-project D. Markdown stays canonical (research basis: see §10).
- N4. Live NN inference at hook time. Sub-project E. NN runs at build time only in this spec.
- N5. Rewriting `TRIBAL_TIP_INDEX.json` schema. Existing schema is sufficient; bindings live in a sidecar.
- N6. Multi-hop graph traversal. v1 is 1-hop only. v2 may extend.
- N7. Real-time tip authoring. Tips ingest via existing `prism_knowledge:tribal_capture` action.

## 4. Constraints

- **C1 — Sub-100ms hot path**: PreToolUse hook total budget is 100ms. Realistic split: 5ms parse + 5ms sqlite SELECT + 10ms format + 80ms reserve.
- **C2 — Sub-80ms cold-path**: live-fallback `Promise.race` deadline. If live also misses, emit hint, no block.
- **C3 — Advisory-only**: hook MUST NEVER block a tool call. Wrap in outer `try/catch`; uncaught → log + emit `[tribal-inject error: <msg>]` + return.
- **C4 — Wire-to-all-sources** (CLAUDE.md): new engines must be registered in every dispatcher that would naturally consume them (`prism_knowledge` + `prism_memory` + `prism_session`).
- **C5 — Multi-chat safety**: card builds use atomic rename for JSON mirror; sqlite UPSERT is single-writer (cron lock file at `mcp-server/data/state/.tribal-rebuild.lock`); concurrent chats trigger waits, not corruption.
- **C6 — Token budget**: injection payload capped at 800 tokens (configurable); re-injection cooldown 5 min per (session, nodeId).
- **C7 — Reuse, don't reinvent**: `dont-reinvent` skill applies. Reused: `TribalKnowledgeEngine`, `PRISMSelfAwarenessEngine`, `PRISMCreativeReasoningEngine`, `OllamaHookBridgeEngine`, `system-viz-query.mjs`, `system-viz-obsidian-bridge.mjs`, `CODE_SYSTEM_INDEX.json`. New only: binder engine, store, resolver, hook, rebuild script.
- **C8 — Karpathy discipline**: classify (search + index + cache), technique (precomputed inverted index + sqlite for sub-30ms reads + Ollama embeddings for semantic match + NN re-rank for relevance + 1-hop graph join for context), edge cases enumerated in §7, failure modes enumerated in §7.
- **C9 — No physics inlining**: spec touches no physics constants. Tips that quote constants (e.g. "Kienzle kc1.1 P-group=1800") reference `src/physics/constants.ts` by symbol, never by value.

## 5. Architecture

### 5.1 Build-time pipeline (offline)

Triggers (any one fires a debounced rebuild):

- Cron: daily 03:00 local time (full rebuild, ~5 sec warm)
- Event: `prism_knowledge:tribal_capture` post-action hook (incremental, ~200ms per tip)
- Event: `system-viz-on-commit.mjs` post-graph-regen (selective, only nodes whose embedding-input changed)
- Event: wiki write under `knowledge/wiki/code-tribal/` (debounced 5 min)
- Manual: `prism_knowledge:tribal_rebuild_index` dispatcher action

Inputs:
- `mcp-server/data/state/TRIBAL_TIP_INDEX.json` (243+ tips)
- `state/shared/system-viz/system-graph.json` (771 nodes, 901 edges, schema v2.1.0)
- `knowledge/wiki/` (770 .md entries, especially `code-tribal/canonical/` for explicit overrides)
- `mcp-server/data/docs/CODE_SYSTEM_INDEX.json` (for nodeId resolution)

Pipeline stages (full table in §6):
1. Embed tips and nodes via Ollama `nomic-embed-text`.
2. Cosine match: top-K=5 candidates per node, threshold τ=0.55.
3. Frontmatter override: explicit `binds_to: [...]` / `binds_excludes: [...]` in tip frontmatter.
4. NN re-rank via `PRISMCreativeReasoningEngine.rankRelevance()`.
5. 1-hop graph neighbors via `system-viz-query.mjs`.
6. Obsidian canonical resolution via `system-viz-obsidian-bridge.mjs` (currently unwired — this spec wires it).
7. Safety class classification via `PRISMSelfAwarenessEngine.classifyDomain()`.
8. Persist: sqlite UPSERT + JSON mirror (atomic rename).

Outputs:
- `mcp-server/data/state/node-context-index.sqlite` (primary, ~5–15 MB)
- `mcp-server/data/state/node-context-index.json` (mirror, audit-friendly, ≤5 MB by storing tipId references only)
- `mcp-server/data/state/embeddings-cache.sqlite` (vectors keyed by content hash, persists across runs)

### 5.2 Runtime path (PreToolUse hook, <100ms)

```
Claude main-thread tool call ─┐     Agent subagent tool call ─┐
                              ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│   .claude/hooks/tribal-context-inject.mjs (NEW PreToolUse hook)  │
│                                                                  │
│   1. Parse tool call → resolve nodeId (engine|dispatcher|action) │
│      via NodeIdResolver (uses CODE_SYSTEM_INDEX.json)            │
│   2. SELECT card FROM sqlite WHERE node_id = ?         [<30ms]   │
│   3. If found AND bakedAt ≤ 24h:  ─────────► HOT path: emit      │
│   4. Else (cold/stale):                                          │
│      Promise.race([                                              │
│        liveEnrich(nodeId, timeout=50ms),  // abridged pipeline   │
│        sleep(80ms).then(() => null)                              │
│      ])                                                          │
│      Write-through cache on success.                             │
│   5. If still no result: emit "no bindings; /tribal-search hint" │
│   6. Format injection: structured block with tips + neighbors    │
│      + canonical wiki link, capped at 800 tokens                 │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 New components

| Component | Path | Wires to |
|---|---|---|
| `TipNodeBinderEngine.ts` | `mcp-server/src/engines/` | `prism_knowledge`: `tribal_bind_node`, `tribal_bindings_for_node`, `tribal_rebuild_index`, `tribal_index_stats` |
| `EnrichedNodeContextStore.ts` | `mcp-server/src/engines/` | `prism_memory`: `context_card_get`, `context_card_list`, `context_card_stats` |
| `NodeIdResolver.ts` | `mcp-server/src/engines/` | `prism_session`: `resolve_node_id` (single-action wire); reused at runtime by hook (direct import, not via dispatcher — avoids dispatcher overhead in hot path) |
| `tribal-context-inject.mjs` | `.claude/hooks/` | PreToolUse in `settings.json`. Allowlisted (cannot be disabled by `PRISM_HOOK_PROFILE`). Disable via `PRISM_TRIBAL_INJECT=0`. |
| `node-context-rebuild.mjs` | `scripts/` | Cron-runnable; also fired by `system-viz-on-commit.mjs` post-graph-regen. |

### 5.4 Reused (do not rebuild)

- `TribalKnowledgeEngine` — tip read API
- `PRISMSelfAwarenessEngine.classifyDomain()` — safety class + domain tags
- `PRISMCreativeReasoningEngine.rankRelevance()` — NN re-rank step
- `OllamaHookBridgeEngine` — nomic-embed-text routing (model already deployed locally per `feedback_ollama_token_routing.md`)
- `system-viz-query.mjs` — 1-hop neighbors
- `system-viz-obsidian-bridge.mjs` — wiki canonical resolution (this spec wires its first consumer)
- `CODE_SYSTEM_INDEX.json` — symbol→path mapping for nodeId resolution

## 6. Data model

### 6.1 EnrichedNodeContext (TypeScript)

```typescript
// mcp-server/src/schemas/enrichedNodeContext.ts
export const SCHEMA_VERSION = "1.0.0";

export type NodeKind = "engine" | "dispatcher" | "action" | "registry" | "page" | "skill";
export type SafetyClass = "shop_floor" | "production" | "proven_out" | "sim";
export type BindReason = "embedding" | "frontmatter_override" | "domain_match";
export type BakedBy = "cron" | "on_tip_ingest" | "on_graph_regen" | "manual" | "live_fallback";

export interface TipBinding {
  tipId: string;          // SHA256 from TRIBAL_TIP_INDEX
  title: string;
  excerpt: string;        // first 200 chars of content
  source: string;
  confidence: number;     // 0..1, original tip confidence
  bindScore: number;      // composite cosine + NN-rerank, 0..1
  bindReason: BindReason;
}

export interface NeighborRef {
  nodeId: string;
  relation: "calls" | "called_by" | "sibling" | "wires_to" | "reads" | "writes";
  distance: 1;            // v1 is 1-hop only
}

export interface EnrichedNodeContext {
  schemaVersion: typeof SCHEMA_VERSION;
  nodeId: string;
  nodeKind: NodeKind;
  nodeLabel: string;
  nodeLayer: string;       // L0..L10
  nodeSubgroup: string;
  tips: TipBinding[];      // ≤ 5
  vizNeighbors: NeighborRef[]; // ≤ 8
  obsidianCanonical: string | null;
  domainTags: string[];
  safetyClass: SafetyClass;
  nnConfidence: number;    // 0..1
  hadFrontmatterOverride: boolean;
  bakedAt: string;         // ISO8601
  bakedBy: BakedBy;
  ttlHours: 24;
}
```

### 6.2 SQLite schema

```sql
-- mcp-server/data/state/node-context-index.sqlite
CREATE TABLE node_context (
  node_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  baked_at TEXT NOT NULL,              -- ISO8601
  payload_json TEXT NOT NULL,          -- full EnrichedNodeContext
  card_hash TEXT NOT NULL              -- SHA256 of payload, for diff/no-op skip
);
CREATE INDEX idx_baked_at ON node_context(baked_at);

CREATE TABLE tip_to_node (             -- inverted: "what nodes cite this tip?"
  tip_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  bind_score REAL NOT NULL,
  PRIMARY KEY (tip_id, node_id)
);
CREATE INDEX idx_tip ON tip_to_node(tip_id);
CREATE INDEX idx_node ON tip_to_node(node_id);

CREATE TABLE rebuild_log (
  rebuild_id TEXT PRIMARY KEY,         -- ISO8601-pid hash
  started_at TEXT NOT NULL,
  finished_at TEXT,                    -- null if in flight
  trigger TEXT NOT NULL,               -- BakedBy enum value
  tips_processed INTEGER,
  nodes_processed INTEGER,
  cards_written INTEGER,               -- distinct from cards_skipped (no-change hash)
  cards_skipped INTEGER,
  errors_json TEXT                     -- array of {stage, message, nodeId?}
);
```

### 6.3 Embeddings cache

```sql
-- mcp-server/data/state/embeddings-cache.sqlite
CREATE TABLE embeddings (
  content_hash TEXT PRIMARY KEY,       -- SHA256 of input string
  source_kind TEXT NOT NULL,           -- "tip" | "node"
  source_id TEXT NOT NULL,
  vector BLOB NOT NULL,                -- Float32Array, 768-dim from nomic-embed-text
  embedded_at TEXT NOT NULL
);
CREATE INDEX idx_source ON embeddings(source_kind, source_id);
```

### 6.4 JSON mirror

`mcp-server/data/state/node-context-index.json` mirrors sqlite for human auditing. Stores tip references only (not full content); resolves to `TRIBAL_TIP_INDEX.json` on read. Atomic rename on write. Regenerated alongside sqlite. Target size: ≤5 MB for 771 nodes.

## 7. Pipeline detail

### 7.1 Stage budgets (cold full build)

| Stage | Per-unit | Total (3,700 tips + 771 nodes) |
|---|---|---|
| ① Embed tips | ~500ms | ~30 min cold; ~5s warm (only changed) |
| ① Embed nodes | ~250ms | ~3 min cold; ~1s warm |
| ② Cosine match | <1ms / pair | ~2s for full corpus |
| ③ Frontmatter override | ~50ms / overridden tip | ~1s |
| ④ NN re-rank | ~50ms / node | ~40s |
| ⑤ Viz neighbors | ~10ms / node | ~8s |
| ⑥ Obsidian canonical | ~5ms / node | ~4s |
| ⑦ Safety class | ~5ms / node | ~4s |
| ⑧ Persist | ~3ms / card | ~2.5s |
| **Total** | — | **~35 min cold, ~25s warm** |

### 7.2 Live-fallback abridged pipeline (50ms budget)

When hook hits cold/stale card:
- Skip ①: load embeddings-cache into hook process at startup (~50 MB resident, OK)
- Skip ④: no NN re-rank; cosine ranking only
- Skip ⑥: skip Obsidian canonical (backfilled by next cron pass)
- Run ②③⑤⑦⑧: ~30ms typical, ≤50ms worst
- Card written with `bakedBy: "live_fallback"` so cron knows to re-elevate it next pass

### 7.3 Frontmatter override format

Tips authored under `knowledge/wiki/code-tribal/` may declare bindings explicitly:

```yaml
---
tipId: <sha256>
title: Kienzle kc1.1 must come from constants.ts — never inline
binds_to:
  - engine:KienzleConstantsEngine
  - engine:CuttingForceEngine
  - action:prism_calc:cutting_force_calc
binds_excludes:
  - engine:Composite*  # glob allowed
confidence: 0.95
source: shop-floor.JM-Die.2025-Q3
---
```

Override semantics: `binds_to` entries replace the cosine-derived top-K (additive, deduped). `binds_excludes` removes any cosine-derived candidate matching the glob (subtractive). Conflicts: explicit wins.

## 8. Hook contract

### 8.1 PreToolUse input (from Claude Code harness)

```typescript
interface HookInput {
  hook_event_name: "PreToolUse";
  tool_name: string;            // e.g. "mcp__prism__prism_calc"
  tool_input: Record<string, unknown>;  // e.g. {action: "cutting_force_calc", params: {...}}
  session_id: string;           // e.g. "claude-671e2b1f"
  is_subagent?: boolean;        // KEY for agent parity, may be undefined in older harness
  cwd: string;
}
```

### 8.2 NodeIdResolver

```typescript
function resolveNodeId(toolName: string, toolInput: Record<string, unknown>): string | null {
  // MCP dispatcher action: mcp__prism__prism_calc + action="cutting_force_calc"
  //   → "action:prism_calc:cutting_force_calc"
  // Edit/Write/Read with file_path matching src/engines/X.ts
  //   → "engine:X"
  // Bash: no resolution; return null
  // Agent: no resolution; return null (agent's internal calls are intercepted on their own)
  // Unknown: null
}
```

### 8.3 Output (additionalContext to Claude)

Plain text, capped at 800 tokens. Format:

```
─── Tribal Knowledge for action:prism_calc:cutting_force_calc ───
★ Top 3 tips (NN-reranked, score):
  • [0.91] Kienzle kc1.1 must come from constants.ts — never inline
    (source: shop-floor, JM Die incident 2025-Q3)
  • [0.84] For aluminum 6061 ramping, halve fz on entry to avoid welding
    (source: hyperMILL tribal, confidence 0.78)
  • [0.79] Verify spindle torque headroom before push above 8500 RPM
    (source: Mark's playbook rule R-142)
↻ Related nodes: engine:KienzleConstantsEngine, action:prism_safety:check_spindle_torque
📖 Wiki: knowledge/wiki/code-tribal/canonical/cutting-force.md
🛡 Safety class: shop_floor (Ω≥0.95, S(x)≥0.98 required)
─────────────────────────────────────────────────────────────
```

Format details:
- Score formatting: 2 decimal places, descending order, max 5 tips emitted
- Excerpt: first 80 chars of tip title (not full content; content lives in wiki link)
- Neighbor list: max 4 entries (most-relevant by edge type weight)
- Safety line: only emitted if `safetyClass != "sim"` (sim is dev-default, no emit)
- Cooldown: same nodeId fired in same session within 5 min → no-op

### 8.4 Suppression

- `PRISM_TRIBAL_INJECT=0` env var → hook is no-op.
- In-memory cooldown `Map<session_id, Map<node_id, lastFiredAt>>` (per §15 Q3) — process-scope only, not persisted.
- `MINIMAL_ALLOWLIST` registration in `settings.json` ensures `PRISM_HOOK_PROFILE` cannot disable the hook (it's expected to provide value, not just block).

### 8.5 Telemetry

Each fire appends to `mcp-server/data/state/tribal-injection-stats.json`:

```json
{
  "schemaVersion": "1.0.0",
  "fires": [
    {
      "ts": "2026-05-09T20:00:00Z",
      "session_id": "claude-671e2b1f",
      "nodeId": "action:prism_calc:cutting_force_calc",
      "is_subagent": false,
      "path": "hot" | "cold_live_success" | "cold_live_timeout" | "miss" | "error",
      "elapsed_ms": 28,
      "tokens_emitted": 412
    }
  ]
}
```

Rolling 7-day window, surfaced via existing `prism_dev:token_economy_report`.

## 9. Agent parity (Phase-0 spike)

### 9.1 Risk

Claude Code's PreToolUse hook firing model on subagent tool calls is harness-version-dependent. If the parent's hook does not fire on a subagent's internal `mcp__prism__*` call, the parity ask is unmet.

### 9.2 Spike (1 day, before implementation phase)

1. Create `H:/prism/.claude/hooks/tribal-spike.mjs` — minimal logger that appends `{ts, tool_name, is_subagent, session_id}` to `tribal-spike.log`.
2. Register in PreToolUse.
3. Run a session that calls `Agent({subagent_type:"Explore", prompt:"...some prompt that forces internal Grep + Read"})`.
4. Inspect `tribal-spike.log`:
   - **Pass criterion**: subagent's internal `mcp__prism__*` calls appear with `is_subagent: true`.
   - **Fail**: only the parent's `Agent(...)` invocation logged.

### 9.3 Fallback if spike fails

Bridge agent wrapper:
- Each agent definition in `.claude/agents/` gets a wrapper helper.
- At spawn time, the wrapper calls `prism_knowledge:tribal_bindings_for_node` for each likely node mentioned in the agent's brief (extracted by keyword scan).
- Wrapper prepends a Tribal Knowledge Pack section to the agent's prompt before the model sees it.
- Less surgical (one-shot at spawn, no per-call refresh) but covers the parity ask end-to-end.

The implementation-plan agent uses spike result to choose between the two paths. Spec records both.

## 10. Format direction (for follow-on sub-project D)

This spec keeps markdown as the canonical wiki format. Research basis (2026-05-09):

- Markdown reduces LLM token cost vs HTML by 20–80% and boosts RAG accuracy ~35% (searchcans.com, mo.agency).
- Karpathy's LLM-Wiki pattern, which PRISM's `WIKI_SCHEMA.md` adopts, is markdown-native (Karpathy gist).
- Obsidian community position: "the only format that actually belongs inside an Obsidian vault is clean markdown" (Obsidian forum, obsidian-html project).
- Industry shift is the *opposite* direction: HTML sites add `.md` for AI agents via `llms.txt` (+1,835% adoption in a year — llmstxt.org).

Sub-project D will define a build step that **emits `.html` from `.md` source** for richer in-browser display (interactive tip cards, embedded system-viz subgraphs). The `.md` files remain the source of truth, Obsidian sync stays intact, Ollama wiki maintenance still works.

## 11. Error handling

| Failure | Detection | Action | User Visible? |
|---|---|---|---|
| Sqlite missing | `cardStore.get` throws `SQLITE_CANTOPEN` | Emit "tribal index not built; run `/tribal-rebuild`" hint, allow tool call | yes, once per session |
| Card stale (>24h) | `bakedAt` check | Live-fallback; if cron last-success >7d, emit warning | yes, once per session |
| Ollama embedding service down | nomic-embed-text returns 5xx / timeout | Build pipeline retries 3× exponential backoff; if all fail, write `bakedBy: degraded` card with cosine-only rank, no NN re-rank | build-time only |
| NN rerank throws | `PRISMCreativeReasoningEngine.rankRelevance` rejects | Log warning, fall through to cosine ranking | build-time only |
| nodeId resolves to null | `NodeIdResolver.resolve` returns null | Hook is no-op; tool call proceeds normally | no |
| Hook itself throws | uncaught exception | Outer try/catch → emit `[tribal-inject error: <msg>]`, allow tool call. **NEVER block on hook failure** | yes, error visible |
| Live-fallback exceeds 80ms | Promise.race timeout | Return null, emit hint, allow tool call | no (silent) |
| Card schema version mismatch | `payload.schemaVersion !== SCHEMA_VERSION` | Treat as cache miss, run live-fallback, log migration needed | yes, once per session |
| Concurrent rebuild | Two cron triggers race | `.tribal-rebuild.lock` file; second waits up to 5min, then exits with no-op | no |
| Embeddings cache corrupt | sqlite_corrupt | Move to `.bak`, rebuild from scratch (re-embeds everything) | yes (cron log) |

**Critical invariant**: hook is advisory. A failure in this hook MUST NEVER block a tool call. Tested explicitly in §12.

## 12. Testing matrix

### 12.1 Unit tests (vitest)

`TipNodeBinderEngine.test.ts`:
- Cosine match returns top-K above τ
- Frontmatter override replaces cosine candidates (additive)
- Frontmatter excludes filter cosine candidates (subtractive)
- NN rerank reorders without dropping tips
- NN failure → cosine ranking preserved (no throw)
- Empty tip set → empty bindings (no throw)
- Duplicate tipId in frontmatter → dedup, log warning
- Adversarial: tip with NaN/Infinity confidence → filtered
- Boundary: K=0 → reject; K>20 → cap at 20
- Boundary: τ=0 → all matches; τ=1 → no matches

`NodeIdResolver.test.ts`:
- Resolves dispatcher action → `action:disp:act`
- Resolves engine file path → `engine:Name`
- Resolves Agent call → null (no-op)
- Resolves Bash call → null
- Unknown tool name → null
- Malformed action enum → null + log

`EnrichedNodeContextStore.test.ts`:
- Upsert + read round-trip
- Schema version mismatch → cache miss
- bakedAt staleness check
- Atomic rename on JSON mirror (no torn writes)
- Concurrent write (two builders racing) → last-write-wins, no corruption
- card_hash skip: no-op write when hash unchanged

### 12.2 Integration tests

`tribal-context-inject.integration.test.ts`:
- Hot path: pre-baked card → injection in <100ms ✓
- Cold path: missing card → live fallback succeeds <80ms ✓
- Cold path: live fallback also fails → hint emitted, tool call proceeds ✓
- Sqlite file missing entirely → hook emits "tribal index not built" hint once, tool call still proceeds, no throw ✓
- Schema version mismatch on read → treated as miss, live-fallback runs ✓
- Hook throws → caught, tool call still proceeds (assert tool ran) ✓
- Subagent tool call → injection fires (gated by Phase-0 spike outcome)
- Cooldown: same nodeId fired twice in 5min → second is suppressed (in-memory Map per §15 Q3)
- Cooldown reset across hook invocations (different processes) → both fire (verifies in-memory scope)
- Token budget cap: 1,500-token raw payload → trimmed to 800 with "[truncated]" marker
- `PRISM_TRIBAL_INJECT=0` → hook is no-op

### 12.3 E2E tests (round-trip through dispatcher)

`tribal-bind-rebuild.e2e.test.ts`:
- Add new tip via `prism_knowledge:tribal_capture`
- Run `prism_knowledge:tribal_rebuild_index`
- Verify new tip appears in card for matching node (sqlite + JSON mirror)
- Verify dispatcher round-trip: `prism_knowledge:tribal_bindings_for_node` returns the binding
- Verify `prism_memory:context_card_get` returns the same card
- Modify tip, rebuild incrementally, verify card_hash changes

### 12.4 Variability matrix (per CLAUDE.md comprehensive-build floor: ≥3 spanning configs)

- Domains: Lathe ✓ + Mill ✓ + WEDM ✓
- Node kinds: engine ✓ + dispatcher ✓ + action ✓
- Frontmatter: with `binds_to` ✓ + without ✓ + with `binds_excludes` ✓
- Path: cold ✓ + hot ✓ + stale ✓ + miss ✓
- Caller: main thread ✓ + subagent ✓ (gated by spike)
- Total: 3 × 3 = 9 domain × kind combos × 4 paths = 36 spanning scenarios.

### 12.5 Coverage floor (per CLAUDE.md)

- Happy path ✓
- ≥3 failure modes: bad input ✓, sqlite missing ✓, NN failure ✓, Ollama down ✓ (4)
- ≥2 adversarial inputs: NaN/Infinity confidence ✓, duplicate tipId ✓, oversize tip content ✓ (3)

## 13. Rollout plan

### Phase 0 — Spike (1 day)
- Deploy `tribal-spike.mjs` logger, run mixed session, decide agent parity strategy.
- Deliverable: decision memo appended to this spec as §14.

### Phase 1 — Schema + Store (2 days)
- `enrichedNodeContext.ts` schema + tests.
- `EnrichedNodeContextStore.ts` engine + tests.
- Sqlite migrations + smoke test.
- Wire to `prism_memory:context_card_*` actions.

### Phase 2 — Binder pipeline (3 days)
- `TipNodeBinderEngine.ts` with all 8 stages + tests.
- `node-context-rebuild.mjs` script + cron registration.
- `embeddings-cache.sqlite` warm-up logic.
- First full build of 771 cards.
- Wire to `prism_knowledge:tribal_*` actions.

### Phase 3 — Hook (2 days)
- `NodeIdResolver.ts` + tests.
- `tribal-context-inject.mjs` hook + integration tests.
- Telemetry to `tribal-injection-stats.json`.
- Register in `settings.json` (allowlisted).
- Subagent path chosen per Phase-0 spike outcome.

### Phase 4 — Validation (1 day)
- Run E2E suite.
- 24h soak: confirm cron rebuild works, cards stay fresh, no orphan processes.
- Produce a one-shot tribal-injection-stats summary for Mark.

### Phase 5 — Follow-on enablement
- Sub-project A spec (mine extracted/) — picks up where this leaves off, feeds new tips into the now-live binder.
- Sub-project B spec (cam-tips backlog) — bulk-ingest the 3,400 tips through the same pipeline.
- Sub-project D spec (HTML render layer) — renders enriched cards to HTML wiki views.
- Sub-project E spec (NN auto-utilization trigger) — adds runtime NN re-rank as optional layer.

Total Phase 0–4: **~9 working days** (1 + 2 + 3 + 2 + 1).

## 14. Phase-0 spike result

*To be filled in after spike runs. Decision tree:*

- *If subagent tool calls fire PreToolUse:* implement runtime injection (Phase 3, primary path).
- *If subagent tool calls do NOT fire PreToolUse:* implement bridge agent wrapper (Phase 3, fallback path) AND keep runtime injection for main-thread.
- *Either way:* §8.4 cooldown logic remains identical.

## 15. Open questions

- **Q1**: Does `system-viz-obsidian-bridge.mjs` fully resolve every node kind to a wiki path, or does it currently only handle engines? If only engines: extend it in Phase 2 to handle dispatchers + actions. (Spec assumes extension is needed; ~2h work.)
- **Q2**: Should the live-fallback path also write to a stub card (with `bakedBy: "live_fallback"`) so that the next cron sees the access pattern and prioritizes that node? Yes per §5.1; tracked as a Phase 2 task.
- **Q3**: Cooldown storage. Decision: in-memory only for Phase 1–4 (single hook-process scope; the file `tribal-cooldown.json` mentioned in §8.4 is removed from the design — replaced by an in-memory `Map<sessionId, Map<nodeId, lastFiredAt>>` initialized fresh per hook invocation). Cross-session cooldown is a Phase 5 follow-up if telemetry shows re-firing on the same nodeId across rapid session restarts is wasteful.
- **Q4**: Should `binds_excludes` glob support also accept regex? Default no; YAGNI. Plain glob with `*` and `?` only.

## 16. References

- CLAUDE.md (project root + global) — wiring discipline, comprehensive-build, no-physics-inlining
- WIKI_SCHEMA.md — Karpathy LLM-Wiki pattern
- state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md — viz authority
- state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md — domain classification
- state/shared/specs/2026-05-09-prism-stabilization-design.md — companion in-flight spec (peer chat claude-7b9d1810)
- mcp-server/data/state/TRIBAL_TIP_INDEX.json — input
- state/shared/system-viz/system-graph.json — input
- mcp-server/src/engines/TribalKnowledgeEngine.ts — reused
- mcp-server/src/engines/PRISMCreativeReasoningEngine.ts — reused (NN re-rank)
- mcp-server/src/engines/PRISMSelfAwarenessEngine.ts — reused (safety class)
- mcp-server/src/engines/OllamaHookBridgeEngine.ts — reused (nomic-embed-text routing)
- scripts/system-viz-query.mjs — reused (1-hop neighbors)
- scripts/system-viz-obsidian-bridge.mjs — reused, first-consumer in this spec

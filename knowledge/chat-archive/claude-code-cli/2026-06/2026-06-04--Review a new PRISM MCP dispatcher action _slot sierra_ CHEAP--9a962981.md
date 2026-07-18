---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a962981-7a23-49ca-a503-804671284925"
title: "Review a new PRISM MCP dispatcher action (slot sierra, CHEAP-NODE-ACCESS-MS0 · U"
date: "2026-06-04"
first_ts: "2026-06-04T19:19:54.099Z"
last_ts: "2026-06-04T19:23:16.818Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/agent-ae1f86ea5e47eae2a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review a new PRISM MCP dispatcher action (slot sierra, CHEAP-NODE-ACCESS-MS0 · U

> **claude-code-cli** | 2026-06-04 | 37 msgs (14 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/agent-ae1f86ea5e47eae2a.jsonl`

## Transcript

### User | 2026-06-04T19:19:54.099Z

Review a new PRISM MCP dispatcher action (slot sierra, CHEAP-NODE-ACCESS-MS0 · U-NODECARD-DISPATCHER): `prism_session:node_card` — a token-cheap node-card read-by-id that shells out to the single-source CLI (system-viz-query.mjs node-card --json), which seeks an offset index (no 644MB graph load, no fork of the reader). Read END TO END, grade PASS/FAIL with P0/P1 only:

1. H:/prism/mcp-server/src/tools/dispatchers/sessionNodeCardAction.ts  (the extracted, dep-injected action: normalizeIds, runNodeCardAction)
2. H:/prism/mcp-server/src/tools/dispatchers/sessionDispatcher.ts  — the `node_card` case (search for "U-NODECARD-DISPATCHER", ~line 1865) that supplies the real execFileSync runner, and the "node_card" entry in the ACTIONS enum (~line 172)

Focus CORRECTNESS:
- The CLI emits a BARE object for a single id and an ARRAY for multiple — runNodeCardAction normalizes `Array.isArray(parsed) ? parsed : [parsed]`. Correct for both? Any shape the CLI emits that breaks card extraction (`"card" in r`) or miss computation?
- normalizeIds: dedup + trim + non-string drop + MAX_NODE_CARD_IDS cap. Any input (params.id number, params.ids with nested arrays, huge batch) that misbehaves?
- FAIL-SOFT: runNodeCardAction must never throw — runner throw, non-JSON output, empty ids all return {success:false,error}. Trace every path. Confirmed?
- The dispatcher case: execFileSync(process.execPath, [scriptPath, "node-card", ...ids, "--json"], {timeout:12000, maxBuffer:16MB}). Is the argv form injection-safe (ids are positional args, no shell)? Is timeout 12000 adequate (live measured 478ms for 4 ids; cold offsets parse ~619ms)? Could a 50-id batch exceed maxBuffer 16MB or argv length limits on Windows?
- Miss computation: `ids.filter(id => !found.has(id))` where found = set of returned card ids. Sound given dedup happened in normalizeIds?

Report VERDICT (PASS/FAIL) + P0/P1 with file:line + one-line fix. Concise.

### Assistant | 2026-06-04T19:20:07.813Z

I'll review the `prism_session:node_card` dispatcher action end to end. Let me read both files.

### Assistant | 2026-06-04T19:20:08.353Z

[tool_use: Read]

### Assistant | 2026-06-04T19:20:09.083Z

[tool_use: Read]

### User | 2026-06-04T19:20:13.402Z

[tool_result] 1	/**
2	 * sessionNodeCardAction.ts — the `prism_session:node_card` action body, extracted
3	 * for dep-injected testing (mirrors sessionHybridSearchAction.ts).
4	 *
5	 * Native MCP surface for the token-cheap node-card read-by-id
6	 * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-DISPATCHER, slot:sierra). It delegates to
7	 * the single-source CLI (`scripts/system-viz-query.mjs node-card <ids> --json`)
8	 
... [+3380 chars truncated]

### User | 2026-06-04T19:20:16.803Z

[tool_result] 150	  "self_awareness_context_summary",
151	  "self_awareness_health",
152	  "self_awareness_quick_stats",
153	  "self_awareness_recommended_actions",
154	  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH4: Awareness
155	  "awareness_unified_query",
156	  "awareness_command_detect",
157	  "awareness_command_suggest_string",
158	  "awareness_filter",
159	  "awareness_lifecycle_get_current",
160	  "awarene
... [+3421 chars truncated]

### Assistant | 2026-06-04T19:20:20.066Z

Now let me read the dispatcher `node_card` case around line 1865.

### Assistant | 2026-06-04T19:20:21.066Z

[tool_use: Read]

### User | 2026-06-04T19:20:24.621Z

[tool_result] 1820	            const { rankedHybridGraphSearchEngine } = await import("../../engines/RankedHybridGraphSearchEngine.js");
1821	            const query = String(params.query ?? params.q ?? "");
1822	            const opts: Record<string, unknown> = {};
1823	            if (params.limit != null) opts.limit = Number(params.limit);
1824	            if (Array.isArray(params.layers)) opts.layers = para
... [+5558 chars truncated]

### Assistant | 2026-06-04T19:20:27.998Z

Now let me verify the imports at the top of the dispatcher (`execFileSync`, `path`, `PATHS`) and check the CLI's actual output shape to confirm the contract assumptions.

### Assistant | 2026-06-04T19:20:29.829Z

[tool_use: Grep]

### Assistant | 2026-06-04T19:20:33.854Z

[tool_use: Grep]

### User | 2026-06-04T19:20:38.738Z

[tool_result] 23:import * as path from "path";
25:import { execFileSync } from "child_process";
29:import { PATHS } from "../../constants.js";
653:const STATE_DIR = PATHS.STATE_DIR;
654:const SCRIPTS_DIR = PATHS.SCRIPTS_CORE;
662:const PYTHON = PATHS.PYTHON;
782:    const result = execFileSync(PYTHON, [scriptPath, ...args], {
1412:              const PYTHON_PATH = PATHS.PYTHON;
1413:              const shutdown
... [+848 chars truncated]

### User | 2026-06-04T19:20:41.507Z

[tool_result] 15: *   node scripts/system-viz-query.mjs node-card <id> [<id>..]  # token-cheap read-by-id (no 644MB load)
18: * Add --json for machine-readable output (default is human-readable).
25:import { readCards } from "./lib/node-card-read.mjs";
32:const params = args.slice(1).filter(a => a !== "--json");
33:const wantJson = args.includes("--json");
36:  console.error("usage: system-viz-query <roadmap-ca
... [+620 chars truncated]

### Assistant | 2026-06-04T19:20:46.284Z

Imports confirmed (`path`, `execFileSync`, `PATHS`). Now let me read the CLI's `node-card` command body and the underlying `readCards` to confirm the exact JSON shape the dispatcher action consumes — this is load-bearing for the contract.

### Assistant | 2026-06-04T19:20:47.296Z

[tool_use: Read]

### Assistant | 2026-06-04T19:20:47.330Z

[tool_use: Read]

### User | 2026-06-04T19:20:53.485Z

[tool_result] 1	/**
2	 * node-card-read.mjs — token-cheap read-by-id over the system-viz node substrate
3	 * (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * `readCard(id)` returns a compact NodeCard (~200 tokens) for ANY of the ~302K
6	 * graph nodes WITHOUT loading the 644MB system-graph.json. It reads the freshest
7	 * compact projection sidecar (no new heavy build):
8	 *   - system-graph-index.json (~193MB, 
... [+14916 chars truncated]

### User | 2026-06-04T19:20:54.928Z

[tool_result] 100	// a card read that loaded the 644MB graph would defeat its own purpose. Sources
101	// the freshest compact sidecar (system-graph-index -> find-cache) via
102	// scripts/lib/node-card-read.mjs and returns ~300 tokens/node vs ~186K for a
103	// full-graph Read. Accepts one or many ids: `node-card <id> [<id>...]`.
104	if (cmd === "node" || cmd === "card" || cmd === "node-card") {
105	  const id
... [+2449 chars truncated]

### Assistant | 2026-06-04T19:21:02.752Z

Now I have the full contract. Let me trace the exact CLI output shapes against `runNodeCardAction`'s extraction. The key shapes from `readCards` → CLI JSON emission:

- **Hit:** `{ card: {...}, stale, staleReason, source, schemaVersion }`
- **Miss:** `{ id, notFound: true }` (no `card` key)
- **Per-id error:** `{ id, error }` (no `card` key)
- Single id → bare object (`rows[0]`); multiple → array.

Let me verify one critical detail: whether the miss/error rows carry a `source` key (they don't — only hit rows do), and confirm the schema's `card.id` field. Let me check the card schema.

### Assistant | 2026-06-04T19:21:02.753Z

[tool_use: Read]

### User | 2026-06-04T19:21:13.745Z

[tool_result] 1	/**
2	 * node-card-schema.mjs — the compact "node card" record shape for token-cheap
3	 * node reads (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * THE PROBLEM: status-quo "find + read a node" loads the 644MB system-graph.json
6	 * to extract one node — ~186K tokens per access. A NodeCard is the minimal record
7	 * that lets an agent IDENTIFY + LOCATE a node (and route to its source doc) WITHOU
... [+5691 chars truncated]

### Assistant | 2026-06-04T19:21:29.210Z

I now have the complete contract. The card always carries a non-empty string `id` (enforced by `assertCard`). Let me trace every shape and edge case carefully.

**CLI output shapes (from `readCards` → CLI line 118):**
| Case | Row shape | Has `card`? | `card.id` |
|------|-----------|-------------|-----------|
| Hit (seek) | `{ card, stale:false, staleReason:null, source:"node-card-offsets", schemaVersion }` | yes | == requested id (seek integrity-checks `parsed.id === id`) |
| Hit (sidecar) | `{ card, stale, staleReason, source, schemaVersion }` | yes | == requested id (`ix.byId.get(id)`, makeCard preserves `rawNode.id`) |
| Miss | `{ id, notFound: true }` | no | n/a |
| Per-id error | `{ id, error }` | no | n/a |

Single id → bare object; ≥2 ids → array. Confirmed `runNodeCardAction` handles both via `Array.isArray(parsed) ? parsed : [parsed]`.

Now let me verify the critical correctness points the review asks about.

**1. Card extraction `"card" in r`** — `rows.filter(r => !!r && typeof r === "object" && "card" in r && !!r.card)`. Miss/error rows have no `card` key → filtered out correctly. Hit rows have `card` truthy → kept. Sound.

**2. Miss computation** — `found = new Set(cards.map(c => c.id))`; `misses = ids.filter(id => !found.has(id))`. Since every returned card's `id` equals the requested id (seek enforces `parsed.id === id`; sidecar uses `byId.get(id)` so `raw.id === id`), `found` contains exactly the ids that produced a card. `ids` is already deduped by `normalizeIds`. So misses = ids whose row was `notFound`/`error`/absent. **Sound.**

Let me double-check one subtle ordering concern and the `id` number coercion path in `normalizeIds`, plus confirm there's no `node_card` schema gap. Let me look at the test file and check the ACTIONS enum / schema registration.

### Assistant | 2026-06-04T19:21:29.211Z

[tool_use: Glob]

### Assistant | 2026-06-04T19:21:29.219Z

[tool_use: Grep]

### User | 2026-06-04T19:21:52.189Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T19:21:55.669Z

[tool_result] Found 2 files
mcp-server\src\tools\dispatchers\sessionNodeCardAction.test.ts
mcp-server\src\tools\dispatchers\sessionNodeCardAction.ts

### Assistant | 2026-06-04T19:21:59.661Z

`node_card` only appears in the dispatcher + action + its own test (no separate schema file — consistent with the other lightweight session actions like `master_index_node_status` which also have no dedicated Zod schema). Let me read the test file to see what the author validated, and confirm the `params.id` number-coercion edge.

### Assistant | 2026-06-04T19:22:00.101Z

[tool_use: Read]

### User | 2026-06-04T19:22:02.856Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\sessionNodeCardAction.test.ts' was already read 2m ago in this session and is unchanged (mtime 1780597694768). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: 
... [+19 chars truncated]

### Assistant | 2026-06-04T19:22:06.303Z

The guard says it's already in context, but I don't see its content. Let me read it with an explicit offset to bypass the guard, since I genuinely need the test coverage.

### Assistant | 2026-06-04T19:22:07.827Z

[tool_use: Read]

### User | 2026-06-04T19:22:17.331Z

[tool_result] 1	/**
2	 * sessionNodeCardAction.test.ts — dispatcher-boundary verification for the
3	 * `prism_session:node_card` action (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-DISPATCHER).
4	 *
5	 * Injects a mock CLI runner so we exercise the action's normalization + the
6	 * bare-object/array CLI-shape handling + miss computation + fail-soft paths
7	 * WITHOUT spawning the real CLI or touching the offset index. T
... [+4028 chars truncated]

### Assistant | 2026-06-04T19:22:39.618Z

I now have full coverage to grade. Let me trace the remaining edge cases the review explicitly asks about.

**`normalizeIds` edge cases:**
- `params.id` as a number (e.g. `{ id: 42 }`): `raw = [42]` → loop hits `typeof x !== "string"` → dropped → `out = []` → fail-soft "requires params.id". Number id is dropped, not coerced. Safe (no crash), though a numeric id silently yields the empty-error. Acceptable — ids are namespace strings like `eng.mill`.
- `params.ids` with nested arrays `{ ids: [["a"]] }`: inner `["a"]` is not a string → dropped. Safe.
- `params.ids` not an array but `params.id` present: `Array.isArray(params.ids)` false → falls to `params.id != null` branch. If both `ids` (non-array) and `id` given, `ids` non-array is ignored and `id` used. Reasonable.
- Huge batch: capped at 50 via `out.length >= MAX_NODE_CARD_IDS` break. Bounded.

**Fail-soft paths in `runNodeCardAction`** — traced all four:
1. empty ids → returns error, no CLI call ✓
2. `runCli` throws → caught, returns error ✓
3. non-JSON → `JSON.parse` throws → caught, returns error ✓
4. valid JSON but unexpected shape (e.g. `parsed` is a number/string/null) → `Array.isArray` false → `[parsed]`; `.filter` drops non-card rows → `cards=[]`, `success:true`, all ids in misses. No throw. ✓

The `.map((r) => r.card)` after the type-guard filter is safe.

**Dispatcher case — injection safety & limits:**
- `execFileSync(process.execPath, [scriptPath, "node-card", ...ids, "--json"], {...})` — argv array form, **no shell** → ids are positional args, no shell metacharacter injection. An id like `"; rm -rf"` is just a literal argv passed to the script (which treats it as a node id → miss). **Injection-safe.** ✓
- `timeout: 12000` ms vs measured 478ms (4 ids) / 619ms cold → ~19× headroom. Adequate. ✓
- `maxBuffer: 16MB` for 50 ids: each card ~200 tokens ≈ <2KB JSON; 50 cards ≈ <100KB. Nowhere near 16MB. ✓
- Windows argv length: 50 ids × ~typical 60-char id ≈ 3KB, well under the ~32K `CreateProcess` command-line
... [+1430 chars truncated]

### Assistant | 2026-06-04T19:22:40.978Z

[tool_use: Grep]

### User | 2026-06-04T19:22:48.059Z

[tool_result] 589:function ok(data: any) {
590-  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
591-}
592-
593-/**
594- * Wire-layer mapper for SessionReplayEngine results.
595- * Detects the engine's synthetic-error sentinel (lastCommit.hash === "error" OR

### Assistant | 2026-06-04T19:23:16.818Z

`ok(data)` JSON-stringifies the result into MCP content. The action's `{success, cards, count, misses, source}` rides inside that text payload — no double-wrap conflict (the action's own `success:false` is data, not a transport error). Consistent with the dispatcher's other actions returning `ok(result)`.

I have everything needed to grade.

## Code Quality Analysis Report — `prism_session:node_card`

### VERDICT: PASS — 0 P0, 0 P1

Both files reviewed end to end against the live CLI contract (`scripts/system-viz-query.mjs` node-card case + `scripts/lib/node-card-read.mjs` `readCards` + `node-card-schema.mjs`). The action is correct, fail-soft, and injection-safe on every traced path.

### Correctness verification (each focus point)

**Bare-object vs array normalization — CORRECT.** CLI emits `rows[0]` for one id, `rows` (array) for ≥2 (`system-viz-query.mjs:118`). `runNodeCardAction` (`sessionNodeCardAction.ts:81`) does `Array.isArray(parsed) ? parsed : [parsed]` — handles both. No CLI-emitted shape breaks extraction: hit rows = `{card,...}`, miss = `{id,notFound}`, per-id error = `{id,error}`. The `"card" in r && !!r.card` guard (line 83) keeps only hit rows; miss/error rows are dropped, not crashed (test line 89 confirms).

**Miss computation — SOUND.** `found = Set(cards.map(c=>c.id))`, `misses = ids.filter(id=>!found.has(id))` (lines 85-86). Every returned card's `id` provably equals the requested id: seek path integrity-checks `parsed.id === id` (`node-card-read.mjs:149`); sidecar path uses `byId.get(id)` so `raw.id === id`; `assertCard` guarantees a non-empty string id. `ids` is pre-deduped by `normalizeIds`, so the filter is exact — no false miss, no double-count.

**`normalizeIds` — ROBUST.** Dedup (Set), trim, non-string drop, `MAX_NODE_CARD_IDS=50` cap all correct. Number `params.id` (`{id:42}`) → dropped → clean empty-error (no coercion, no crash). Nested arrays in `ids` → dropped. Non-array `params.ids` falls through to `params.id`. All bounded.

**FAIL
... [+2600 chars truncated]

---
type: "chat-session"
source: "claude-code-cli"
session_id: "d787b3d4-1343-44fd-98a7-6bd00451187c"
title: "Review the dispatcher wiring in commit HEAD (U-VIZ-NEAR-DISPATCHER) of repo H:/p"
date: "2026-06-25"
first_ts: "2026-06-25T03:27:45.656Z"
last_ts: "2026-06-25T03:29:11.462Z"
cwd: "H:\\prism"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/d787b3d4-1343-44fd-98a7-6bd00451187c/subagents/agent-acf0e9f9ec13d7433.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Review the dispatcher wiring in commit HEAD (U-VIZ-NEAR-DISPATCHER) of repo H:/p

> **claude-code-cli** | 2026-06-25 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d787b3d4-1343-44fd-98a7-6bd00451187c/subagents/agent-acf0e9f9ec13d7433.jsonl`

## Transcript

### User | 2026-06-25T03:27:45.656Z

Review the dispatcher wiring in commit HEAD (U-VIZ-NEAR-DISPATCHER) of repo H:/prism, which adds the `prism_session:node_near` MCP action. Verify it is correctly + completely wired, mirroring the existing `node_card` action.

Files:
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts (added "node_near" to the action z.enum + a `case "node_near":` handler)
- mcp-server/src/tools/dispatchers/sessionNodeNearAction.ts (NEW pure runner: normalizeNearParams + runNodeNearAction)
- mcp-server/src/tools/dispatchers/sessionNodeNearAction.test.ts (8 vitest tests)

Verify (read all three + the sibling node_card for comparison):
1. z.enum ENTRY: is "node_near" present in the action enum, and does it EXACTLY match the case label "node_near" (snake_case, no typo)? (Dispatcher rule: every action in z.enum must match a case.)
2. HANDLER CASE: does `case "node_near"` lazy-import sessionNodeNearAction.js, build scriptPath from PATHS.PRISM_ROOT, and delegate to runNodeNearAction with an execFileSync runner using an ARGV ARRAY (no shell)? Compare to the node_card case -- is the pattern faithfully mirrored (timeout, maxBuffer, --json)?
3. ANTI-REGRESSION: the action count must not decrease -- node_near is ADDED (count +1). Confirm no action was removed.
4. RUNNER CONTRACT: does runNodeNearAction return the dispatcher's expected shape and is it fail-soft (never throws -- returns {success:false,error} on no-id / runner-throw / non-JSON / missing-neighbors)?
5. Is a separate Zod schema file REQUIRED, or does node_card's precedent (normalize params inside the runner, no dedicated schema file) cover this? Flag if node_card has a schema that node_near is missing.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then P0/P1 with file:line, then <=5 notes. If unsure, FAIL.

### Assistant | 2026-06-25T03:27:54.882Z

I'll read all three new files plus the existing node_card case for comparison.

### Assistant | 2026-06-25T03:27:55.260Z

[tool_use: Read]

### Assistant | 2026-06-25T03:27:55.639Z

[tool_use: Read]

### Assistant | 2026-06-25T03:27:55.959Z

[tool_use: Read]

### User | 2026-06-25T03:27:56.970Z

[tool_result] 1	/**
2	 * Session Dispatcher — session lifecycle, state management, and context control.
3	 * (Action count auto-tracked in PRISM-INVENTORY-LATEST.md; the static "48 actions"
4	 * header from the original module has been corrected — refer to ACTIONS.length and
5	 * the inventory file for live counts.)
6	 *
7	 * Manages cross-session persistence (memory_save/recall), context pressure monitoring,
8
... [+4120 chars truncated]

### User | 2026-06-25T03:27:57.088Z

[tool_result] 1	/**
2	 * sessionNodeNearAction.ts -- the `prism_session:node_near` action body, extracted
3	 * for dep-injected testing (mirrors sessionNodeCardAction.ts).
4	 *
5	 * Native MCP surface for semantic nearest-neighbor node search (SYSTEM-VIZ /
6	 * U-VIZ-NEAR, slot:sierra). It delegates to the single-source CLI
7	 * (`scripts/system-viz-query.mjs near <id> --k <k> --json`) which streams the 768d
8	
... [+3247 chars truncated]

### User | 2026-06-25T03:27:57.316Z

[tool_result] 1	/**
2	 * Tests for sessionNodeNearAction.ts -- the prism_session:node_near runner.
3	 * Pure given an injected runCli spy; asserts param normalization, the happy
4	 * path, and every fail-soft branch (R9 -- real assertions, no stubs).
5	 */
6	import { describe, it, expect } from "vitest";
7	import {
8	  normalizeNearParams, runNodeNearAction, DEFAULT_NEAR_K, MAX_NEAR_K,
9	} from "./sessionNodeNe
... [+3308 chars truncated]

### Assistant | 2026-06-25T03:28:01.556Z

Now I need to read the specific node_near section of the dispatcher and find the node_card case for comparison.

### Assistant | 2026-06-25T03:28:02.431Z

[tool_use: Grep]

### User | 2026-06-25T03:28:04.123Z

[tool_result] 198-  "master_index_node_status",
199-  \ SIERRA-LEVERAGE\U-N1-RANKED-HYBRID (sierra 2026-05-29): re-rank master-index hits by RRF-fusing the confidence (lexical) ranking against the utilization (structural-importance) ranking — distinct axis from `hybrid_search` (which fuses across the 4 PSN SOURCES); this blends relevance × importance WITHIN the master hits.
200-  "master_index_ranked_hybrid",
2
... [+5128 chars truncated]

### Assistant | 2026-06-25T03:28:10.150Z

I now have all the information needed. Let me also check the schema question — whether node_card has a dedicated schema file that node_near would need to mirror.

### Assistant | 2026-06-25T03:28:11.292Z

[tool_use: Glob]

### Assistant | 2026-06-25T03:28:12.035Z

[tool_use: Grep]

### User | 2026-06-25T03:28:13.858Z

[tool_result] mcp-server\src\tools\dispatchers\sessionNodeCardAction.ts

### User | 2026-06-25T03:28:14.642Z

[tool_result] H:\prism\mcp-server\src\schemas\sessionActionSchemas.ts-771-
H:\prism\mcp-server\src\schemas\sessionActionSchemas.ts-772-  /**
mcp-server\src\schemas\sessionActionSchemas.ts:773:   * doc_nodes — REVERSE of node_card (CHEAP-NODE-ACCESS-MS0 · U-VBL-DISPATCHER).
H:\prism\mcp-server\src\schemas\sessionActionSchemas.ts-774-   * Given a vault doc, list the live graph node(s) that document it (then
mcp-s
... [+408 chars truncated]

### Assistant | 2026-06-25T03:28:18.071Z

Now let me read the sessionActionSchemas.ts around the node_card and node_near entries to check schema coverage.

### Assistant | 2026-06-25T03:28:18.732Z

[tool_use: Grep]

### User | 2026-06-25T03:28:20.446Z

[tool_result] 763-   * audit punch list (built but not wired / dead-code candidates).
764-   */
765-  master_index_utilization_dashboard: z.object({
766-    layers: z.array(z.string()).optional()
767-      .describe("Restrict to graph layers (e.g., ['L4','L5'])"),
768-    exclude_layers: z.array(z.string()).optional()
769-      .describe("Exclude layers (default ['L9','L11'] — fs noise)"),
770-  }).passthrough(
... [+855 chars truncated]

### Assistant | 2026-06-25T03:28:22.601Z

I need to see whether node_card and node_near both have schema entries in sessionActionSchemas.ts.

### Assistant | 2026-06-25T03:28:23.151Z

[tool_use: Grep]

### User | 2026-06-25T03:28:24.671Z

[tool_result] 773:   * doc_nodes — REVERSE of node_card (CHEAP-NODE-ACCESS-MS0 · U-VBL-DISPATCHER).
775:   * node_card <id> for the node's state). Reads the inverted vault-backlinks.json

### Assistant | 2026-06-25T03:28:28.002Z

The schema search confirms `node_card` and `node_near` are both absent as top-level keys in `sessionActionSchemas.ts` — only mentioned in a comment. Let me verify by reading the area around where node_card's schema entry would be expected.

### Assistant | 2026-06-25T03:28:28.390Z

[tool_use: Grep]

### User | 2026-06-25T03:28:30.203Z

[tool_result] No matches found

### Assistant | 2026-06-25T03:28:33.702Z

Good — `node_card` has no schema entry in `sessionActionSchemas.ts` (only referenced in a comment). This confirms node_card normalizes params inside its runner with no dedicated Zod schema key. Now verify the same is true for `node_near` and check the test count.

### Assistant | 2026-06-25T03:28:34.150Z

[tool_use: Grep]

### User | 2026-06-25T03:28:39.031Z

[tool_result] No matches found

### User | 2026-06-25T03:28:40.581Z

[Your previous response had no visible output. Please continue and produce a user-visible response.]

### Assistant | 2026-06-25T03:29:11.462Z

I have all the information needed. Here is the complete verdict.

---

VERDICT: PASS

All five verification points clear. Details below.

---

**1. z.enum Entry — PASS**

`"node_near"` appears at `sessionDispatcher.ts:208` inside the action z.enum array, positioned immediately after `"node_card"` (line 206). The string is exactly `"node_near"` in snake_case, matching the case label at line 2234 character-for-character. No typo.

**2. Handler Case — PASS, faithfully mirrors node_card**

Side-by-side comparison of the two cases:

- `node_card` (line 2216): lazy-imports `./sessionNodeCardAction.js`, builds `scriptPath` from `path.join(PATHS.PRISM_ROOT, "scripts", "system-viz-query.mjs")`, calls `execFileSync(process.execPath, [scriptPath, "node-card", ...ids, "--json"], { encoding: "utf8", timeout: 12000, maxBuffer: 16 * 1024 * 1024 })`.
- `node_near` (line 2234): lazy-imports `./sessionNodeNearAction.js`, same `scriptPath` construction from `PATHS.PRISM_ROOT`, calls `execFileSync(process.execPath, [scriptPath, "near", id, "--k", String(k), "--json"], { encoding: "utf8", timeout: 15000, maxBuffer: 16 * 1024 * 1024 })`.

Pattern is faithfully mirrored: lazy import, `PATHS.PRISM_ROOT`-anchored scriptPath, `process.execPath` as the binary (no shell), argv array with `--json` flag, same `maxBuffer`. The timeout is 15000ms vs node_card's 12000ms — this is intentional and correct, since the `near` CLI streams an embedding pool (768d cosine scan) which is heavier than a seek-based offset index read.

**3. Anti-Regression — PASS**

`"node_near"` is an addition to the enum. No existing action string was removed. The action at line 208 is purely additive (+1). The surrounding actions (`node_card` at 206, `doc_nodes` at 210) are both still present.

**4. Runner Contract — PASS**

`runNodeNearAction` in `sessionNodeNearAction.ts` is fully fail-soft across all four failure paths:

- No id supplied → `{ success: false, error: "node_near requires params.id (string)" }` (line 61)
- `r
... [+2516 chars truncated]

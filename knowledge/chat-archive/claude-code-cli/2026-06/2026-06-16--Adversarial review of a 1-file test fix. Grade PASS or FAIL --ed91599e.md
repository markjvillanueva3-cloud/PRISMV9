---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Adversarial review of a 1-file test fix. Grade PASS or FAIL with file:line. Read"
date: "2026-06-16"
first_ts: "2026-06-16T20:13:40.644Z"
last_ts: "2026-06-16T20:14:56.466Z"
cwd: "H:\\prism-slot-sierra"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-ac3db1ac7451f936e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Adversarial review of a 1-file test fix. Grade PASS or FAIL with file:line. Read

> **claude-code-cli** | 2026-06-16 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-ac3db1ac7451f936e.jsonl`

## Transcript

### User | 2026-06-16T20:13:40.644Z

Adversarial review of a 1-file test fix. Grade PASS or FAIL with file:line. Read the file END TO END. ABSOLUTE path: H:/prism/scripts/lib/viz-domain-coverage.test.mjs (shared tree H:/prism, NOT a slot worktree).

BUG FIXED: the test "generated system-graph.json: meta.coverage matches BUILD_STATE + L5 nodes" did `JSON.parse(fs.readFileSync(SYSTEM_GRAPH_PATH, "utf8"))` with no size guard. The live system-graph.json is now 765MB (the merged regen-viz product) > Node's UTF-8 string cap (0x1fffffe8 ~512MB) -> `ERR_STRING_TOO_LONG` thrown at readFileSync, BEFORE the existing `schemaVersion !== "2.1.0"` skip (which was designed to skip exactly the merged-product case). Confirmed crash: error 'Cannot create a string longer than 0x1fffffe8 characters' at line 297.

FIX APPLIED: added `import { exceedsStringParseCap } from "./graph-io.mjs";` + a size-gate before the readFileSync: `const graphBytes = fs.statSync(SYSTEM_GRAPH_PATH).size; if (exceedsStringParseCap(graphBytes)) { t.skip(...); return; }`. Result: the test now SKIPS loudly (verified: 17 pass / 0 fail / 1 skip) when the over-cap merged product is on disk; the full-read + assertions still run when the small generate-system-viz 2.1.0 product (< cap) is present.

VERIFY:
- Is `exceedsStringParseCap` correctly imported + a real export of graph-io.mjs (it is at graph-io.mjs:55; it returns byteLength > V8_MAX_STRING_BYTES 0x1fffffe8)? Confirm the gate semantics: skip iff size exceeds the cap.
- Does the gate sit BEFORE the crashing readFileSync (line ~297) so the crash can no longer occur? Confirm nothing between the existsSync skip and the readFileSync still reads the big file unguarded.
- Does the fix preserve the assertion path for the small product (size <= cap -> full read + the meta.coverage/L5-sum/L4-L5-edge assertions still execute unchanged)? Confirm the fix is a GUARD, not a permanent disable of the assertions.
- Is this a weakening of the test (R9)? Assess: the test was ALREADY designed to skip on the non-2.1.0
... [+424 chars truncated]

### Assistant | 2026-06-16T20:13:47.067Z

I will read the test file end to end, then verify the import source.

### Assistant | 2026-06-16T20:13:47.504Z

[tool_use: Read]

### Assistant | 2026-06-16T20:13:47.692Z

[tool_use: Read]

### User | 2026-06-16T20:13:49.934Z

[tool_result] 1	/**
2	 * viz-domain-coverage.test.mjs — VIZ-COVERAGE-MS0 / U-VIZ-COVERAGE-FIX
3	 *
4	 * Enforces the single-source-of-truth contract between BUILD_STATE and the
5	 * system-viz L5 layer: every L5 domain node (top-N + the aggregated "rest"
6	 * bucket) must sum back to the canonical BUILD_STATE coverage figure — no
7	 * domain dropped, none double-counted.
8	 *
9	 * Run: node --test scripts/lib/v
... [+15538 chars truncated]

### User | 2026-06-16T20:13:50.057Z

[tool_result] 1	/**
2	 * scripts/lib/graph-io.mjs — streaming read+write for `system-graph.json`
3	 *
4	 * Bypasses V8's ~512MB max-string-length ceiling that crashes legacy
5	 * `JSON.parse(fs.readFileSync(p, "utf8"))` (read) and `JSON.stringify(G)`
6	 * (write) calls once the graph passes ~512MB serialized.
7	 *
8	 * Discovered: papa /loop 2026-05-23, U-PSN-VIZ-REGEN, on the 541MB graph.
9	 * Memory: `referen
... [+15898 chars truncated]

### Assistant | 2026-06-16T20:13:54.754Z

I have read both files end to end. Let me now verify the import path resolves correctly and check whether any other reads of the system-graph path in this test file are unguarded.

### Assistant | 2026-06-16T20:13:56.272Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:13:56.818Z

[tool_use: Grep]

### User | 2026-06-16T20:13:58.918Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 61172 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 16s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-m
... [+520 chars truncated]

### User | 2026-06-16T20:14:03.923Z

[tool_result] 313:  const graph = JSON.parse(fs.readFileSync(SYSTEM_GRAPH_PATH, "utf8"));

### Assistant | 2026-06-16T20:14:08.697Z

There is exactly one `readFileSync` of `SYSTEM_GRAPH_PATH` in the test file (line 313), and I have already confirmed from the full read that the size gate precedes it. Let me now check the full logical block at lines 290-313 once more with tight focus, and verify `exceedsStringParseCap` export presence at line 55 of graph-io.mjs.

### Assistant | 2026-06-16T20:14:09.474Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:14:10.380Z

[tool_use: Grep]

### User | 2026-06-16T20:14:24.149Z

[tool_result] 55:export function exceedsStringParseCap(byteLength) {

### User | 2026-06-16T20:14:24.224Z

[tool_result] 21:import { exceedsStringParseCap } from "./graph-io.mjs";
264:  const bs = JSON.parse(fs.readFileSync(BUILD_STATE_PATH, "utf8"));
301:  // readFileSync(...,"utf8") THROWS ERR_STRING_TOO_LONG *before* the schemaVersion
304:  // (R12) rather than crash. Reuses the canonical cap via exceedsStringParseCap().
305:  const graphBytes = fs.statSync(SYSTEM_GRAPH_PATH).size;
306:  if (exceedsStringParseCap
... [+163 chars truncated]

### Assistant | 2026-06-16T20:14:56.466Z

I have all the data I need. Here is my full analysis.

---

**Checklist trace:**

**1. Import + export existence**

`graph-io.mjs:55` — `export function exceedsStringParseCap(byteLength)` is a real named export. The import at `viz-domain-coverage.test.mjs:21` uses the identical name from the same relative path (`"./graph-io.mjs"`). No alias drift, no barrel re-export indirection. Confirmed real.

**2. Gate semantics**

`graph-io.mjs:44` — `V8_MAX_STRING_BYTES = 0x1fffffe8` (536,870,888 bytes, the documented V8 ceiling).
`graph-io.mjs:55-57` — `exceedsStringParseCap(byteLength)` returns `byteLength > V8_MAX_STRING_BYTES`. The `typeof` guard on line 56 means a non-number (e.g., if `statSync` somehow returned a non-numeric `.size`) returns `false`, which is the safe/conservative direction (does not skip when it shouldn't). Semantics: skip if and only if the file exceeds the cap. Correct.

**3. Gate position relative to the crashing readFileSync**

Execution order inside the test at line 290:
- Line 294: `existsSync` double-guard (SYSTEM_GRAPH_PATH + BUILD_STATE_PATH) → early return if either absent.
- Line 305: `fs.statSync(SYSTEM_GRAPH_PATH).size` — reads only the inode metadata, not the file content. Zero crash risk.
- Line 306: `if (exceedsStringParseCap(graphBytes))` → `t.skip(...)` + `return`.
- Line 313: `JSON.parse(fs.readFileSync(SYSTEM_GRAPH_PATH, "utf8"))` — only reached when the file is confirmed ≤ cap.

The gate sits squarely between the `existsSync` check and the `readFileSync`. There is no other read of `SYSTEM_GRAPH_PATH` in the file (confirmed by grep: exactly one hit at line 313). The crash cannot recur.

**4. statSync on a missing file**

The `existsSync` check at line 294 covers both `SYSTEM_GRAPH_PATH` and `BUILD_STATE_PATH` and returns early if either is absent. `statSync` at line 305 therefore only executes when `existsSync` already confirmed the file exists. No ENOENT risk.

**5. Assertion path preservation (R9 — is this a weakening?)**

The test
... [+2799 chars truncated]

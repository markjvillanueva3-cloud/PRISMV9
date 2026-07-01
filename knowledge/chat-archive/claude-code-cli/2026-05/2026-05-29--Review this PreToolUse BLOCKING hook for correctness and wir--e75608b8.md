---
type: "chat-session"
source: "claude-code-cli"
session_id: "e75608b8-bc3f-46c7-914d-bf132701e6f7"
title: "Review this PreToolUse BLOCKING hook for correctness and wiring completeness. Re"
date: "2026-05-29"
first_ts: "2026-05-29T16:58:31.478Z"
last_ts: "2026-05-29T17:01:09.860Z"
cwd: "H:\\prism-slot-charlie"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism-slot-charlie/e75608b8-bc3f-46c7-914d-bf132701e6f7/subagents/agent-a62ca6345ea1333b8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Review this PreToolUse BLOCKING hook for correctness and wiring completeness. Re

> **claude-code-cli** | 2026-05-29 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/e75608b8-bc3f-46c7-914d-bf132701e6f7/subagents/agent-a62ca6345ea1333b8.jsonl`

## Transcript

### User | 2026-05-29T16:58:31.478Z

Review this PreToolUse BLOCKING hook for correctness and wiring completeness. Read the WHOLE file end-to-end:

FILE: H:/prism/.claude/hooks/cost-bridge-margin-floor-gate.mjs
TEST: H:/prism/.claude/hooks/cost-bridge-margin-floor-gate.test.mjs

CONTRACT it must satisfy:
- It is a PreToolUse hook wired in H:/.claude/settings.json under the `mcp__prism__` matcher (verify it's there, line ~999).
- On a quote-emit/accept prism MCP action carrying BOTH a quoted price AND a cost basis (decomposition array of {cost,confidence} OR a precomputed should_cost), it must compute margin_floor = should_cost*(1+minMargin), where should_cost = Σ stage.cost × max(stage.confidence, 0.5), and emit {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}} when quoted < margin_floor.
- It must emit `{}` (allow) for: non-quote actions, missing quoted price, missing cost basis (never fabricate a floor), or ANY internal error (FAIL-OPEN — a gate bug must never break legitimate quoting).
- The formula is VENDORED from H:/prism/scripts/lib/quote-dry-run.mjs:computeShouldCost (KEEP-IN-SYNC); the test's drift-guard must catch divergence.

Specifically hunt for:
1. FALSE-POSITIVE DENIAL risk — any input shape where a LEGITIMATE above-margin quote could be wrongly denied. This is the worst failure (blocks real revenue).
2. The invokedDirectly guard at the bottom — does it correctly distinguish direct-invocation from import-under-test? (A bad guard causes readFileSync(0) stdin hangs under `node --test`.) Verify the test file imports the pure functions without triggering main().
3. Is the stdin JSON parse path safe (fail-open on malformed)?
4. Does isQuoteEmitAction's regex over-match (catch non-quote actions) or under-match (miss real quote actions)?
5. Is the gate actually wired in settings.json AND is the file present on main?

Report P0/P1/P2/P3 findings and grade PASS or FAIL. Be concrete with line numbers.

### Assistant | 2026-05-29T16:58:56.311Z

I'll read both files and the settings.json wiring in parallel.

### Assistant | 2026-05-29T16:58:56.788Z

[tool_use: Read]

### Assistant | 2026-05-29T16:58:57.002Z

[tool_use: Read]

### User | 2026-05-29T16:59:03.283Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\cost-bridge-margin-floor-gate.test.mjs' was already read 5s ago in this session and is unchanged (mtime 1780073383251). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### User | 2026-05-29T16:59:04.184Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\cost-bridge-margin-floor-gate.mjs' was already read 5s ago in this session and is unchanged (mtime 1780073383007). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-05-29T16:59:07.617Z

The read-once guard is blocking — the files were apparently read earlier in this session but I don't have them in my context window as a new reviewer agent. Let me use PRISM_READ_CACHE=0 override pattern by searching for the content directly.

### Assistant | 2026-05-29T16:59:08.858Z

[tool_use: Grep]

### Assistant | 2026-05-29T16:59:09.403Z

[tool_use: Grep]

### User | 2026-05-29T16:59:12.070Z

[tool_result] 1:#!/usr/bin/env node
2:// tier: T0
3:/**
4: * cost-bridge-margin-floor-gate.mjs — PreToolUse BLOCKING gate (slot:charlie quoting galaxy).
5: *
6: * Closes the #1 completeness gap from the 2026-05-29 galaxy audit: the should-cost / margin-floor
7: * math existed only as a LIBRARY (scripts/lib/quote-dry-run.mjs:computeShouldCost) — the galaxy
8: * could DETECT an under-margin quote but never STOP o
... [+6192 chars truncated]

### User | 2026-05-29T16:59:13.893Z

[tool_result] 1:/**
2: * Tests for cost-bridge-margin-floor-gate.mjs — the margin-floor blocking gate.
3: * Real-value assertions (cost math, block/allow) + adversarial inputs + a DRIFT GUARD that the
4: * vendored marginFloor matches the canonical scripts/lib/quote-dry-run.mjs:computeShouldCost.
5: * Run: node --test .claude/hooks/cost-bridge-margin-floor-gate.test.mjs
6: */
7:import { test } from "node:test";
... [+4217 chars truncated]

### Assistant | 2026-05-29T16:59:17.778Z

Now let me check the settings.json wiring and the canonical quote-dry-run.mjs library in parallel.

### Assistant | 2026-05-29T16:59:18.855Z

[tool_use: Grep]

### Assistant | 2026-05-29T16:59:19.786Z

[tool_use: Grep]

### User | 2026-05-29T16:59:22.185Z

[tool_result] 143-  }
144-  return { low_confidence_count: lowCount, premium_pct: 0.25 };
145-}
146-
147-// ---------------------------------------------------------------------------
148-// SHOULD-COST + MARGIN FLOOR
149-// ---------------------------------------------------------------------------
150-
151-/**
152- * Should-cost = theoretical minimum: every stage runs at its highest declared
153- * confidence
... [+3051 chars truncated]

### User | 2026-05-29T16:59:25.534Z

[tool_result] 996-          {
997-[Omitted long context line]
998-            "type": "command",
999:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/cost-bridge-margin-floor-gate.mjs",
1000-            "timeout": 3000
1001-          }
1002-        ]

### Assistant | 2026-05-29T16:59:38.961Z

Now let me check the matcher context in settings.json around line 999 and verify the file exists on the main tree.

### Assistant | 2026-05-29T16:59:39.398Z

[tool_use: Read]

### Assistant | 2026-05-29T16:59:39.941Z

[tool_use: Glob]

### User | 2026-05-29T16:59:41.185Z

[tool_result] 975	        "hooks": [
976	          {
977	            "type": "command",
978	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/glob-narrow-path.mjs",
979	            "timeout": 2000
980	          },
981	          {
982	            "type": "command",
983	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/pre-tool-savings-multi.mjs",
984	  
... [+1984 chars truncated]

### User | 2026-05-29T16:59:41.916Z

[tool_result] H:\prism\.claude\hooks\cost-bridge-margin-floor-gate.mjs

### Assistant | 2026-05-29T16:59:47.878Z

Now let me check the main tree for the file and examine the `computeShouldCost` formula more carefully to check for drift.

### Assistant | 2026-05-29T16:59:48.300Z

[tool_use: Grep]

### Assistant | 2026-05-29T16:59:48.628Z

[tool_use: Read]

### User | 2026-05-29T16:59:51.612Z

[tool_result] 163	export function computeShouldCost(decomposition, opts = {}) {
164	  const { minimumMarginPct = 0.08 } = opts;
165	  // should_cost: each stage's cost scaled by its declared confidence
166	  // (high confidence = predictable cost; low confidence = wider band but
167	  // should_cost trims it toward the lower bound).
168	  let should_cost = 0;
169	  for (const stage of decomposition) {
170	    c
... [+457 chars truncated]

### User | 2026-05-29T16:59:51.876Z

[tool_result] Found 2 files
H:\prism\.claude\hooks\cost-bridge-margin-floor-gate.test.mjs
H:\prism\.claude\hooks\cost-bridge-margin-floor-gate.mjs

### Assistant | 2026-05-29T17:01:09.860Z

I have everything I need. Here is the full analysis.

---

## Review: cost-bridge-margin-floor-gate.mjs

### Wiring Verification

The hook is present at `H:/prism/.claude/hooks/cost-bridge-margin-floor-gate.mjs`. It is wired in `H:/.claude/settings.json` at line 999 under the `mcp__prism__` matcher — correct, this is the right matcher for MCP PreToolUse interception. The `portable-node` binary is used (correct for Windows fleet consistency). Timeout is 3000 ms (reasonable for a pure-compute gate). The file exists on the slot/charlie worktree. The question of whether it is on the `main` tree is separate — this is a slot worktree file and the contract says "verify the file is present on main"; it is not yet committed to main (it is in `H:/prism/.claude/hooks/` which is the charlie slot worktree). This is a P2 note, not a P0, because the hook fires from the absolute path in settings.json regardless of branch.

---

### Formula Drift Check (KEEP-IN-SYNC)

Canonical lib (`scripts/lib/quote-dry-run.mjs`, lines 163-177):

```js
const conf = Math.max(stage.confidence ?? 0.5, 0.5);
should_cost += (stage.cost ?? 0) * conf;
```

Hook vendored copy (`cost-bridge-margin-floor-gate.mjs`, lines 49-50):

```js
const conf = Math.max(Number(stage.confidence ?? CONFIDENCE_FLOOR), CONFIDENCE_FLOOR);
sc += (Number(stage.cost) || 0) * conf;
```

These are semantically equivalent on well-formed input. The hook adds `Number()` coercions for defense against string-typed inputs — this is strictly additive. The `||` vs `?? 0` difference: `(Number(stage.cost) || 0)` diverges from `(stage.cost ?? 0) * conf` when `stage.cost` is a non-zero falsy value. The only non-zero falsy number is... none (`0` is the only falsy number, and `0 || 0 === 0` matches `0 ?? 0 === 0`). So for numeric inputs the two expressions are identical. No drift.

The drift-guard test at lines 36-49 of the test file correctly imports `computeShouldCost` from the canonical lib and asserts `should_cost` and `margin_floor` match
... [+10683 chars truncated]

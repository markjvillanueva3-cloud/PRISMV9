---
type: "chat-session"
source: "claude-code-cli"
session_id: "14b038a1-b568-490a-8f31-fb7e113a621b"
title: "Read-only review (arm A, regression + over-credit risk) of commit 481c7a32e0 in "
date: "2026-06-18"
first_ts: "2026-06-18T18:22:29.472Z"
last_ts: "2026-06-18T18:24:27.672Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/14b038a1-b568-490a-8f31-fb7e113a621b/subagents/agent-afeaff47dcc33eb6e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Read-only review (arm A, regression + over-credit risk) of commit 481c7a32e0 in 

> **claude-code-cli** | 2026-06-18 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/14b038a1-b568-490a-8f31-fb7e113a621b/subagents/agent-afeaff47dcc33eb6e.jsonl`

## Transcript

### User | 2026-06-18T18:22:29.472Z

Read-only review (arm A, regression + over-credit risk) of commit 481c7a32e0 in H:/prism. Grade PASS or FAIL with P0/P1/P2 + file:line.

Run `git -C H:/prism show 481c7a32e0`. It modifies `.claude/hooks/mcp-route-takeup.mjs` (a PostToolUse hook that measures route-nudge take-rate) + its test. Read the changed hook regions END TO END.

CONTEXT: The take-rate audit read totalFires=644 totalTakes=0 ("takeup-wiring-broken"). Root cause: takes were credited ONLY for `mcp__...__prism_*` dispatcher calls, but the fleet routes search-first via the native script `node scripts/system-viz-query.mjs` (the MCP-down equivalent) which is a Bash tool call -> never credited. Fix: new `_SCRIPT_ROUTE_TO_CLASSIFIERS` map + `extractScriptRoute()` + `eligibleClassifiersFor()` (resolves both maps); `classifiersTakenBy` + `main()` credit either path.

VERIFY RIGOROUSLY:
- OVER-CREDIT risk: does `extractScriptRoute` match ONLY the documented routing scripts (system-viz-query.mjs / master-index-search-lib.mjs / ask-ollama.mjs / ask-hermes.mjs)? Could a plain/unrelated Bash command falsely credit a take? Could `rtk node scripts/system-viz-query.mjs` or a PowerShell variant be missed (false-negative) or a substring like "my-system-viz-query.mjs" false-match? Is the word-boundary regex sound?
- BACK-COMPAT: `_ACTION_TO_CLASSIFIERS` unchanged? `classifiersTakenBy`/`extractMcpAction` signatures unchanged? `eligibleClassifiersFor` resolves MCP actions identically to the old `_ACTION_TO_CLASSIFIERS[mcpAction]` lookup (so existing MCP-path credit is byte-identical)?
- `main()` precedence: `extractMcpAction(...) || extractScriptRoute(...)` — correct (MCP wins, script fallback)? Any case where a real MCP call now gets mis-classified as a script route?
- Does the new path change the write path (`_recordTakeup`) at all, or just feed it more route keys? Fail-soft preserved?
- The classifier sets in `_SCRIPT_ROUTE_TO_CLASSIFIERS` — are they a defensible subset (script:master-index mirrors master_index_que
... [+303 chars truncated]

### Assistant | 2026-06-18T18:22:34.066Z

I'll analyze commit 481c7a32e0 rigorously, focusing on over-credit risk and back-compat.

### Assistant | 2026-06-18T18:22:35.013Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:22:35.582Z

[tool_use: Bash]

### User | 2026-06-18T18:22:42.096Z

[tool_result] commit 481c7a32e0264bec11e48683dfb45f60be23aeb0
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 13:21:53 2026 -0500

    [MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TAKEUP-SCRIPT-CREDIT (slot:alpha): credit native-script route-takes -- fixes the take-rate 0/99 measurement artifact
    
    The audit dashboard read totalFires=644 totalTakes=0 health=takeup-wiring-b
... [+1936 chars truncated]

### User | 2026-06-18T18:22:42.958Z

[tool_result] commit 481c7a32e0264bec11e48683dfb45f60be23aeb0
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 13:21:53 2026 -0500

    [MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TAKEUP-SCRIPT-CREDIT (slot:alpha): credit native-script route-takes -- fixes the take-rate 0/99 measurement artifact
    
    The audit dashboard read totalFires=644 totalTakes=0 health=takeup-wiring-b
... [+5771 chars truncated]

### Assistant | 2026-06-18T18:22:46.574Z

Now let me read the full hook end-to-end to verify the surrounding context, the `_ACTION_TO_CLASSIFIERS` map, and the write path.

### Assistant | 2026-06-18T18:22:47.425Z

[tool_use: Read]

### User | 2026-06-18T18:22:50.345Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * mcp-route-takeup.mjs
5	 * --------------------
6	 * PostToolUse companion to mcp-route-suggest.mjs (TOKEN-SAVINGS-PIVOT iter8).
7	 *
8	 * Closes the take-rate measurement gap. The route-suggest hook fires TOKEN-SAVE
9	 * nudges and records each fire to state/shared/mcp-route-suggest-stats.json,
10	 * but until now we had NO data on how often the model
... [+11191 chars truncated]

### Assistant | 2026-06-18T18:22:53.489Z

Now let me read the test file diff and the full test to verify the assertions are real and the suite passes.

### Assistant | 2026-06-18T18:22:54.922Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:22:55.955Z

[tool_use: Bash]

### User | 2026-06-18T18:23:01.979Z

[tool_result] commit 481c7a32e0264bec11e48683dfb45f60be23aeb0
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 13:21:53 2026 -0500

    [MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TAKEUP-SCRIPT-CREDIT (slot:alpha): credit native-script route-takes -- fixes the take-rate 0/99 measurement artifact
    
    The audit dashboard read totalFires=644 totalTakes=0 health=takeup-wiring-b
... [+8626 chars truncated]

### User | 2026-06-18T18:23:09.810Z

[tool_result] 0
---tail---
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 18.7014

### Assistant | 2026-06-18T18:23:14.442Z

Suite is green (0 `not ok`, fail 0). Now let me verify the over-credit / false-match edge concerns the prompt flagged: the word-boundary regex behavior against adversarial command strings, and that `PowerShell` is actually a real Claude Code tool name (or dead code).

### Assistant | 2026-06-18T18:23:22.099Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:23:22.854Z

[tool_use: Grep]

### User | 2026-06-18T18:23:27.777Z

[tool_result] "script:master-index" <- my- prefix | node scripts/my-system-viz-query.mjs find x
null <- suffix .mjsx | node scripts/system-viz-query.mjsx find x
"script:master-index" <- plain echo mention | echo system-viz-query.mjs
"script:master-index" <- doc mention | cat docs/system-viz-query.mjs.md
null <- hyphen suffix | node scripts/system-viz-query-helper.mjs
"script:master-index" <- rtk prefix | rtk no
... [+356 chars truncated]

### User | 2026-06-18T18:23:30.976Z

[tool_result] Found 4 files
.claude\hooks\__tests__\mcp-route-takeup.test.mjs
.claude\hooks\mcp-route-takeup.mjs
.claude\hooks\intake-quarantine-guard.test.mjs
.claude\hooks\intake-quarantine-guard.mjs

### Assistant | 2026-06-18T18:23:35.188Z

The probes confirm specific false-match cases. Let me verify two things: (1) whether `PowerShell` is actually a Claude Code tool name that ever reaches PostToolUse (otherwise it's harmless dead code, not a bug), and (2) the exact false-positive surface — `\b` before `system-viz-query` matches `my-system-viz-query.mjs` because `-` is a non-word char, so `\b` sits between `-` and `s`.

### Assistant | 2026-06-18T18:23:37.965Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:23:38.905Z

[tool_use: Grep]

### User | 2026-06-18T18:23:44.400Z

[tool_result] my-system-viz-query.mjs -> true
xsystem-viz-query.mjs   -> false
/system-viz-query.mjs   -> true

### User | 2026-06-18T18:23:46.989Z

[tool_result] .claude\helpers\process-slot-map.test.mjs:58:  assert.equal(isPermanentlyProtected("PowerShell"), true);
.claude\hooks\intake-quarantine-guard.test.mjs:40:  assert.equal(isHighPrivilege("PowerShell", { command: "Invoke-WebRequest http://x" }).hp, true);
.claude\hooks\intake-quarantine-guard.test.mjs:64:  assert.equal(isHighPrivilege("PowerShell", { command: "iex (irm http://evil/payload)" }).hp, t
... [+401 chars truncated]

### Assistant | 2026-06-18T18:24:27.672Z

I have enough to assess. The `PowerShell` tool-name branch is mirrored from a sibling security hook (`intake-quarantine-guard.mjs:113`), so it's an established convention in this codebase, not invented — harmless either way. Now let me assess the materiality of the false-positive surface I found. The key question for over-credit: a false match only credits a take IF the same session also fired a matching classifier nudge within the 600s window. Let me confirm the gating in `classifiersTakenBy` makes these benign.

The analysis is complete. Let me synthesize.

## Assessment

I traced the full hook end-to-end, the test diff, ran the suite (0 `not ok`, fail 0), and probed `extractScriptRoute` against 10 adversarial command strings.

**Over-credit (the core risk you flagged) — confirmed present but LOW materiality:**
The `\b` word-boundary regex `/\bsystem-viz-query\.mjs\b/` does NOT cleanly isolate the documented script. Because `-` is a non-word character, `\b` sits between the `-` and the `s`, so `my-system-viz-query.mjs` **false-matches** (`mcp-route-takeup.mjs:130`). I verified this directly: `node my-system-viz-query.mjs -> true`. Additionally, **any mention** of the token in a non-routing command false-matches: `echo system-viz-query.mjs`, `cat docs/system-viz-query.mjs.md`, `ls # see system-viz-query.mjs`, and `node ask-ollama.mjs.bak run` all returned a route key. The regex matches the literal substring anywhere in the command, not "a `node ...` invocation of that script."

Why this is **P2, not P1**: a false route-match alone credits nothing. `classifiersTakenBy` (line 143-157) only credits a classifier that *actually fired a nudge in the same session within 600s* (`eligibleSet.has(c)` over `sidecar.recent`). So an over-credit requires (a) a command containing the token substring AND (b) a live matching nudge in the window. The realistic false-positive — a slot `cat`-ing/`echo`-ing the script name while a `backendAuditChain`/`isBroadGrep` nudge is open — would
... [+5177 chars truncated]

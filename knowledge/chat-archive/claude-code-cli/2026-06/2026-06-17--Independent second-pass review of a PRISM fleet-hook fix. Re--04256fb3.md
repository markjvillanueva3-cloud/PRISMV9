---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Independent second-pass review of a PRISM fleet-hook fix. Read end-to-end: - H:/"
date: "2026-06-17"
first_ts: "2026-06-17T04:09:15.438Z"
last_ts: "2026-06-17T04:11:11.664Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a123d59c53b2dfe6e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Independent second-pass review of a PRISM fleet-hook fix. Read end-to-end: - H:/

> **claude-code-cli** | 2026-06-17 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a123d59c53b2dfe6e.jsonl`

## Transcript

### User | 2026-06-17T04:09:15.438Z

Independent second-pass review of a PRISM fleet-hook fix. Read end-to-end:
- H:/prism/.claude/hooks/mcp-connectivity-check.mjs (the changed hook)
- H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs (the changed tests)

The change (slot golf 2026-06-17, U-MCP-FALSEPOS-SUPPRESS): suppresses a per-turn false-positive "MCP BRIDGE DOWN" banner that fired whenever 0 transient mcp-http-bridge processes were alive WHILE the server was healthy (the normal idle state) — now gated behind off-by-default `PRISM_MCP_FLEET0_BANNER=1`. Also bumped DEFAULT_TIMEOUT_MS 1000->3000.

Weight your review toward what a correctness reviewer might MISS:
1. CONVENTION conformance — does the new code match the file's existing style (comment density, the `(opts.xFn || x)` injection pattern, fail-soft try/catch idiom)?
2. The large explanatory comment block I added — is it justified doctrine/evidence or bloat? Is there genuinely-dead code left behind (vs the preserved-via-knob path which is intentional)?
3. INLINED constants / magic numbers — is 3000 a reasonable, documented choice? Any constant that should be named/imported?
4. Test quality — do the 3 changed/added tests use real assertions (deepEqual/match on real values), happy + the knob-restore (failure-mode) path? Is `assert.deepEqual(r, { continue: true })` a strong enough silence assertion, or could it pass falsely?
5. Any hidden coupling — does another hook/script import `buildDegradedBanner` or `countBridges` from this file and depend on the old call-site behavior? (Grep the repo for importers.)
6. Did the change accidentally break the `getConfig` timeout default contract for any caller passing PRISM_MCP_CONNECTIVITY_TIMEOUT_MS?

Grade PASS or FAIL with P0/P1/P2 findings + file:line. Flag any place the fix is more (or less) than it claims.

### Assistant | 2026-06-17T04:09:19.422Z

I'll review this PRISM fleet-hook fix end-to-end. Let me start by reading both changed files and the git diff.

### Assistant | 2026-06-17T04:09:20.313Z

[tool_use: Read]

### Assistant | 2026-06-17T04:09:20.361Z

[tool_use: Read]

### Assistant | 2026-06-17T04:09:21.391Z

[tool_use: Bash]

### User | 2026-06-17T04:09:21.479Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-connectivity-check.mjs' was already read 12s ago in this session and is unchanged (mtime 1781669262371). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T04:09:22.507Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-connectivity-check.test.mjs' was already read 12s ago in this session and is unchanged (mtime 1781669193767). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-17T04:09:28.350Z

[tool_result] diff --git a/.claude/hooks/mcp-connectivity-check.mjs b/.claude/hooks/mcp-connectivity-check.mjs
index 5d9898c389..ae0a436522 100644
--- a/.claude/hooks/mcp-connectivity-check.mjs
+++ b/.claude/hooks/mcp-connectivity-check.mjs
@@ -55,7 +55,12 @@ import {
 } from "../../scripts/lib/mcp-bridge-liveness.mjs";
 
 const DEFAULT_URL = "http://127.0.0.1:3100";
-const DEFAULT_TIMEOUT_MS = 1000;
+// 3000ms
... [+6003 chars truncated]

### Assistant | 2026-06-17T04:09:32.518Z

The files are already in my context from earlier this session. Let me re-read both files fully to review them end-to-end, plus check for hidden coupling and the timeout contract.

### Assistant | 2026-06-17T04:09:33.056Z

[tool_use: Read]

### Assistant | 2026-06-17T04:09:33.341Z

[tool_use: Read]

### User | 2026-06-17T04:09:33.533Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-connectivity-check.mjs' was already read 25s ago in this session and is unchanged (mtime 1781669262371). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T04:09:33.845Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-connectivity-check.test.mjs' was already read 25s ago in this session and is unchanged (mtime 1781669193767). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-17T04:09:38.639Z

The read-once guard says the files are already in my context, but I need to actually see them. Let me disable the cache to read them fresh, since they're essential for an end-to-end review.

### Assistant | 2026-06-17T04:09:40.028Z

[tool_use: Bash]

### User | 2026-06-17T04:09:45.875Z

[tool_result]      1	#!/usr/bin/env node
     2	// tier: T2
     3	/**
     4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
     5	 *
     6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
     7	 * every turn. On disconnect, injects an `additionalContext` banner naming
     8	 * exactly what's down + the exact restart command — so the chat doesn't
     9	 * silently degr
... [+20241 chars truncated]

### Assistant | 2026-06-17T04:09:49.861Z

Now I have the full hook source. Let me read the test file and check for importers of the exported functions.

### Assistant | 2026-06-17T04:09:51.242Z

[tool_use: Bash]

### Assistant | 2026-06-17T04:09:51.543Z

[tool_use: Grep]

### User | 2026-06-17T04:09:56.533Z

[tool_result]      1	// mcp-connectivity-check.test.mjs — pure-core tests with injected http + fs.
     2	// Run: node --test H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs
     3	
     4	import { test } from "node:test";
     5	import assert from "node:assert/strict";
     6	import {
     7	  getConfig,
     8	  loadState,
     9	  saveState,
    10	  shouldProbe,
    11	  buildBanner,
    12	  runChec
... [+19997 chars truncated]

### User | 2026-06-17T04:10:01.884Z

[tool_result] Found 15 files
.claude\hooks\mcp-connectivity-check.mjs
.claude\hooks\mcp-connectivity-check.test.mjs
state\HANDOFF.md
knowledge\memories\reference\reference_synergy_roi_verified_2026_06_14.md
knowledge\memories\reference\reference_mcp_enforce_gate_staging_harm_2026_06_16.md
knowledge\memories\reference\reference_mcp_client_enforce_ms0_2026_06_13.md
knowledge\memories\reference\reference_golf_mcp_
... [+524 chars truncated]

### Assistant | 2026-06-17T04:10:04.561Z

Now I have both files fully. Let me check the two non-test files that reference `countBridges`/`buildDegradedBanner` to see if there's hidden coupling — specifically whether they import from this hook file or have their own definitions.

### Assistant | 2026-06-17T04:10:07.769Z

[tool_use: Bash]

### Assistant | 2026-06-17T04:10:08.568Z

[tool_use: Grep]

### User | 2026-06-17T04:10:15.918Z

[tool_result] state\shared\memory-index-sidecar.json:1:[Omitted long matching line]
.claude\hooks\mcp-connectivity-check.test.mjs:16:} from "./mcp-connectivity-check.mjs";
.claude\hooks\mcp-bridge-enforce-pretool.mjs:40:import { countBridges } from "./mcp-connectivity-check.mjs";

### User | 2026-06-17T04:10:17.071Z

[tool_result] === mcp-bridge-enforce-pretool.mjs (imports?) ===
32:import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
33:import { dirname, join } from "node:path";
34:import {
40:import { countBridges } from "./mcp-connectivity-check.mjs";
41:import {
141:    try { fleet = countBridges(env); } catch { fleet = null; }
161:    return import.meta.url === `file://${argv1}` || import.meta.
... [+257 chars truncated]

### Assistant | 2026-06-17T04:10:21.419Z

Confirmed: `mcp-bridge-enforce-pretool.mjs` imports `countBridges` from this file (line 40) and calls it (line 141). This is the "enforce pretool's fleet count" the comment block references. Let me verify that importer relies only on `countBridges` (not `buildDegradedBanner`) and that its call-site behavior is unchanged — `countBridges` itself was not modified, only the call site in `runCheck` was gated. Let me read the relevant portion of the importer to confirm no dependence on the old `runCheck` banner behavior.

### Assistant | 2026-06-17T04:10:22.167Z

[tool_use: Read]

### User | 2026-06-17T04:10:24.960Z

[tool_result] 120	  // gating below fully covers). So they are exempt; enforcement still fires on
121	  // Bash/Read/Edit/Write/Glob/Grep/mcp__prism__* etc. Knob: PRISM_MCP_ENFORCE_EXEMPT_TOOLS.
122	  const toolName = input.tool_name || input.toolName || "";
123	  if (EXEMPT_TOOLS.test(toolName)) return allow();
124	
125	  // NEVER block git/staging operations. A denied `git add`/`git commit` mid-sequence
126	 
... [+2012 chars truncated]

### Assistant | 2026-06-17T04:10:30.041Z

I have everything I need. The importer `mcp-bridge-enforce-pretool.mjs` imports only `countBridges` (not `buildDegradedBanner`), calls `countBridges(env)` directly — independent of `runCheck`'s call-site — and that function was not modified. No hidden coupling broke. Let me verify one thing: whether the doc comment block at line 32 still says the timeout default is 1000 (a doc-rot the change introduced), and run the tests to confirm green.

### Assistant | 2026-06-17T04:10:31.203Z

[tool_use: Bash]

### User | 2026-06-17T04:10:37.220Z

[tool_result]   ...
# Subtest: buildClientDisconnectBanner: content + honest harness limit
ok 37 - buildClientDisconnectBanner: content + honest harness limit
  ---
  duration_ms: 0.0869
  ...
1..37
# tests 37
# suites 0
# pass 37
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 149.2656

### Assistant | 2026-06-17T04:11:11.664Z

All 37 tests pass. Now I have everything verified. Let me compile my findings.

Key observations from reading both files end-to-end and the importer:

1. **Doc-rot at line 32**: The header docblock still documents `PRISM_MCP_CONNECTIVITY_TIMEOUT_MS   probe timeout (default 1000)` — but the constant is now 3000. The change bumped the constant and added a 5-line evidence comment at the constant, but left the header's `(default 1000)` stale. Same header line 20 says `1s timeout`.

2. **New knob `PRISM_MCP_FLEET0_BANNER` is undocumented in the header `Env knobs` block** — every other knob (DISABLE, TIMEOUT_MS, THROTTLE_SEC, VERBOSE) is listed there; this new one is only in the inline comment.

3. **Test #4 assertion strength** — `assert.deepEqual(r, { continue: true })` is actually a *strong* silence assertion (stronger than `r.hookSpecificOutput === undefined`), good.

Let me finalize.

---

VERDICT: PASS

summary: The fix does exactly what it claims and no more — it gates the fleet-wide `bridges===0` degraded banner behind off-by-default `PRISM_MCP_FLEET0_BANNER=1` (preserving the legacy path, not deleting it), bumps `DEFAULT_TIMEOUT_MS` 1000→3000 to match an assertion that was already live since 2026-06-12, and leaves the precise per-chat sentinel + server-DOWN paths untouched. The lone importer (`mcp-bridge-enforce-pretool.mjs:40,141`) depends only on the unchanged `countBridges` export, called directly — not on `runCheck`'s gated call-site — so there is no hidden coupling regression. All 37 tests pass. Findings are P2 doc-hygiene only; no P0/P1.

findings:
- [P2] `.claude/hooks/mcp-connectivity-check.mjs:32` — the header `Env knobs` block still documents `PRISM_MCP_CONNECTIVITY_TIMEOUT_MS   probe timeout (default 1000)`, and line 20 still says `1s timeout`, but the constant is now 3000 (line 63). The constant comment (58-62) explains the bump well, but the header is now stale doc-rot — a reader of the contract block gets the wrong default. — Update line 32 to `(def
... [+4094 chars truncated]

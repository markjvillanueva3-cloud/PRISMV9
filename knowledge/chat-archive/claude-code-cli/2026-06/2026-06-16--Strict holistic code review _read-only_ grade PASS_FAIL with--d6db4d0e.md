---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Strict holistic code review (read-only; grade PASS/FAIL with P0/P1 findings + fi"
date: "2026-06-16"
first_ts: "2026-06-16T20:43:14.207Z"
last_ts: "2026-06-16T20:47:13.072Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 15
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a3abc992ebf3cb410.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Strict holistic code review (read-only; grade PASS/FAIL with P0/P1 findings + fi

> **claude-code-cli** | 2026-06-16 | 36 msgs (15 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a3abc992ebf3cb410.jsonl`

## Transcript

### User | 2026-06-16T20:43:14.207Z

Strict holistic code review (read-only; grade PASS/FAIL with P0/P1 findings + file:line). This is the PRISM 3-of-3 scrutiny arm A.

Context: a PreToolUse MCP-bridge ENFORCEMENT gate. The operator wanted disconnected chats forced to notice + reconnect. This shipped a BUG the operator caught mid-session ("mcp blocks keep eating stagings for other chats") which was then fixed; verify the FIX is correct + complete and no regressions remain.

Review these committed files end-to-end:
- H:/prism/scripts/lib/mcp-bridge-enforce.mjs  (pure decision: decideEnforcement, buildEnforceReason, buildBroadcastSignal, shouldWriteBroadcast)
- H:/prism/.claude/hooks/mcp-bridge-enforce-pretool.mjs  (thin PreToolUse wrapper)
- H:/prism/scripts/lib/mcp-bridge-enforce.test.mjs  (22 unit tests)
- H:/prism/.claude/hooks/__tests__/mcp-bridge-enforce-pretool.test.mjs  (8 round-trip tests)

Verify specifically:
1. NO-FALSE-POSITIVE: it hard-blocks ONLY on a per-chat confident sentinel (pid-dead/stale-heartbeat), NEVER on the shared fleet enum-cache count, NEVER on no-signal/stale-cache. Confirm by reading decideEnforcement.
2. STAGING-SAFE: git commands and orchestration tools (Agent/Task/Workflow) are exempted in the hook BEFORE the block path. Confirm the regex + EXEMPT_TOOLS sanitization can't be evaded or false-exempt everything.
3. NO-DEADLOCK: block-once-per-throttle; subsequent calls allowed. Confirm the lastEnforcedMs state read/write.
4. FAIL-OPEN: any error -> allow (an enforcement hook must never block on its own bug). Confirm the try/catch + the readBridgeLiveness/countBridges error handling.
5. Broadcast fires whether or not we block (moved before the allow-return); shouldWriteBroadcast dedups by signal TTL (no 26-chat write storm).
6. Tests: real assertions (not toBeDefined stubs)? Do they actually cover the staging-safety fix (fleet-advisory no-block, git-exempt, orchestration-exempt, per-chat-still-blocks)?

Also confirm the wiring is sound: PreToolUse matcher .* in global settin
... [+120 chars truncated]

### Assistant | 2026-06-16T20:43:18.714Z

I'll review these files end-to-end, starting by reading all four target files in parallel.

### Assistant | 2026-06-16T20:43:19.186Z

[tool_use: Read]

### Assistant | 2026-06-16T20:43:19.673Z

[tool_use: Read]

### Assistant | 2026-06-16T20:43:20.144Z

[tool_use: Read]

### Assistant | 2026-06-16T20:43:20.674Z

[tool_use: Read]

### User | 2026-06-16T20:43:24.395Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: lib
3	/**
4	 * mcp-bridge-enforce.mjs -- pure decision logic for the PreToolUse MCP-bridge
5	 * ENFORCEMENT gate (MCP-CLIENT-ENFORCE-MS1, 2026-06-16, slot bravo).
6	 *
7	 * THE GAP THIS CLOSES (operator pain 2026-06-16: "chats still losing connection
8	 * and enforcements in place for chats to check to see if they're connected don't
9	 * work"):
10	 *   `mcp-connec
... [+8718 chars truncated]

### User | 2026-06-16T20:43:25.832Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * mcp-bridge-enforce-pretool.mjs -- PreToolUse ENFORCEMENT gate for a dead prism
5	 * MCP bridge (MCP-CLIENT-ENFORCE-MS1, 2026-06-16, slot bravo).
6	 *
7	 * WHY (operator 2026-06-16): "chats still losing connection and enforcements in
8	 * place for chats to check to see if they're connected don't work -- find a way to
9	 * automate and enforce it." MS0
... [+7343 chars truncated]

### User | 2026-06-16T20:43:26.181Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: test
3	// Tests for mcp-bridge-enforce.mjs -- the PreToolUse MCP-bridge ENFORCEMENT decision.
4	// Intent (R9): a CONFIDENT disconnect blocks ONCE per episode (no deadlock), a fleet
5	// outage also broadcasts, and NO no-signal verdict ever false-blocks.
6	
7	import test from "node:test";
8	import assert from "node:assert/strict";
9	import {
10	  decideEnforcement,
... [+9237 chars truncated]

### User | 2026-06-16T20:43:26.243Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: test
3	// Round-trip test for mcp-bridge-enforce-pretool.mjs: spawns the hook as a
4	// subprocess (as the harness does) with a controlled sentinel + enum-cache, and
5	// asserts the deny/allow decision end-to-end. Intent (R9/R15): prove the GATE
6	// actually blocks a dead bridge, never deadlocks, never false-positives, and
7	// auto-broadcasts on a fleet-wide out
... [+7452 chars truncated]

### Assistant | 2026-06-16T20:43:32.092Z

I've read all four target files. Now let me verify the dependencies the hook reuses — the liveness verdict logic and the fleet bridge count — plus confirm the settings.json wiring.

### Assistant | 2026-06-16T20:43:32.093Z

[tool_use: Read]

### Assistant | 2026-06-16T20:43:33.761Z

[tool_use: Read]

### User | 2026-06-16T20:43:47.414Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+17128 chars truncated]

### User | 2026-06-16T20:43:47.476Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: lib
3	/**
4	 * mcp-bridge-liveness.mjs -- per-chat MCP bridge liveness sentinel + reader.
5	 *
6	 * THE GAP THIS CLOSES (MCP-CLIENT-ENFORCE-MS0, 2026-06-13, slot tango):
7	 *   The fleet already keeps the SHARED daemon (:3100) alive (supervisor +
8	 *   watchdog + connectivity-monitor scheduled tasks) and mcp-connectivity-
9	 *   check.mjs probes that daemon every 
... [+17047 chars truncated]

### Assistant | 2026-06-16T20:43:54.488Z

Now let me verify the settings.json wiring (the PreToolUse `.*` matcher claim) and check the broadcast consumer schema parity. Let me also confirm the `slotFromCwd` import works and check git command edge cases.

### Assistant | 2026-06-16T20:43:54.507Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:43:56.262Z

[tool_use: Bash]

### User | 2026-06-16T20:44:17.059Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-16T20:45:19.550Z

[tool_result] === .claude/settings.json ===
(no ref)
=== ../.claude/settings.json ===
1273:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-bridge-enforce-pretool.mjs",
=== /c/Users/wompu/.claude/settings.json ===
1273:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-bridge-enforce-pretool.mjs",

### Assistant | 2026-06-16T20:45:22.435Z

The hook is wired in the global settings.json (both C: and the H: mirror). Let me confirm the PreToolUse matcher for this entry and verify the broadcast consumer schema parity.

### Assistant | 2026-06-16T20:45:23.428Z

[tool_use: Read]

### Assistant | 2026-06-16T20:45:23.944Z

[tool_use: Read]

### User | 2026-06-16T20:45:32.742Z

[tool_result] 1255	          }
1256	        ]
1257	      },
1258	      {
1259	        "matcher": "",
1260	        "hooks": [
1261	          {
1262	            "type": "command",
1263	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/pre-tool-router-table-advise.mjs",
1264	            "timeout": 3000
1265	          }
1266	        ]
1267	      },
1268	      {
1269	        "matcher": 
... [+855 chars truncated]

### User | 2026-06-16T20:45:33.008Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-broadcast-reconnect-inject.mjs — UserPromptSubmit hook.
4	 * Surfaces a "/mcp reconnect" nudge when a fleet-wide MCP reconnect signal
5	 * is newer than this chat's last-seen timestamp. Tracks per-chat "seen"
6	 * state in .claude/cache/mcp-broadcast-seen-<chatId>.ts.
7	 *
8	 * Knobs:
9	 *   PRISM_MCP_BROADCAST_INJECT_DISABLE=1   disable
10	 *   PRISM_MCP_BROAD
... [+3940 chars truncated]

### Assistant | 2026-06-16T20:45:38.521Z

Now I have full confirmation of the broadcast schema parity. The consumer (`mcp-broadcast-reconnect-inject.mjs`) reads `signal.signaledAtMs` (number, line 51), `signal.expiresAtMs` (line 54), and `signal.reason` (line 87) — all of which `buildBroadcastSignal` produces (lines 136-143 of the lib). Schema parity confirmed.

Let me verify two remaining edge cases: the `slotFromCwd` dependency and a careful look at the git regex evasion question (does the git exemption open a hole, and conversely can the EXEMPT_TOOLS regex sanitization false-exempt everything).

### Assistant | 2026-06-16T20:45:39.461Z

[tool_use: Read]

### Assistant | 2026-06-16T20:45:40.537Z

[tool_use: Grep]

### User | 2026-06-16T20:45:53.707Z

[tool_result] 1	/**
2	 * mcp-tool-domains.mjs — Tier-1 MCP tool-domain filter map
3	 * (MCP-CONSOLIDATION-MS0 / U-MCP-TOOL-DOMAINS, slot:alpha 2026-05-28)
4	 *
5	 * The operator's "4-5 MCP servers split between the primary chats" idea, realized as a
6	 * FILTER on the one shared :3100 backend instead of N separate server processes. The
7	 * mcp-http-bridge narrows its tools/list to the chat's galaxy domains via
... [+3071 chars truncated]

### User | 2026-06-16T20:45:54.456Z

[tool_result] 175:export function slotFromCwd(cwd) {
176-  if (!cwd) return null;
177-  const m = String(cwd).match(/prism-slot-([a-z]+)/i);
178-  return m ? m[1].toLowerCase() : null;
179-}
180-
181-/**
182- * Map a slot name -> its galaxy's domains CSV, or "" if the slot/galaxy is unknown
183- * (the fail-open signal). Shared by the PRISM_BOOT_SLOT and cwd resolution tiers.
184- */
185-function domainsForSlot
... [+226 chars truncated]

### Assistant | 2026-06-16T20:45:57.094Z

All dependencies confirmed. Let me run the test suites to verify they actually pass (not just that the assertions are real), and do a final analysis of the git-regex edge cases.

### Assistant | 2026-06-16T20:45:58.515Z

[tool_use: Bash]

### Assistant | 2026-06-16T20:45:59.288Z

[tool_use: Bash]

### User | 2026-06-16T20:46:17.288Z

[tool_result]   ...
# Subtest: shouldWriteBroadcast: expired signal -> write
ok 21 - shouldWriteBroadcast: expired signal -> write
  ---
  duration_ms: 0.095
  ...
# Subtest: shouldWriteBroadcast: malformed expiresAtMs -> write (fail-open to re-signal)
ok 22 - shouldWriteBroadcast: malformed expiresAtMs -> write (fail-open to re-signal)
  ---
  duration_ms: 0.0391
  ...
1..22
# tests 22
# suites 0
# pass 22
# f
... [+63 chars truncated]

### User | 2026-06-16T20:46:25.295Z

[tool_result]   ...
# Subtest: fleet enum-cache shows 0 bridges (no per-chat sentinel) -> ALLOWS (no fleet hard-block) but auto-writes broadcast signal
ok 7 - fleet enum-cache shows 0 bridges (no per-chat sentinel) -> ALLOWS (no fleet hard-block) but auto-writes broadcast signal
  ---
  duration_ms: 146.8169
  ...
# Subtest: git command on a dead per-chat bridge -> ALLOWS (never interrupt shared-tree staging)
o
... [+230 chars truncated]

### Assistant | 2026-06-16T20:47:13.072Z

Both suites pass: 22/22 (pure lib) and 8/8 (round-trip). Now I have everything needed for a complete verdict. Let me do the final edge-case analysis on the two regex constructs.

**EXEMPT_TOOLS regex (line 53-55):** `process.env.PRISM_MCP_ENFORCE_EXEMPT_TOOLS || "Agent|Task|Workflow"` then `.replace(/[^A-Za-z0-9_|]/g, "")` then wrapped `^(...)$`. The sanitization strips everything except alphanumerics, underscore, and pipe. This cannot inject regex metacharacters (no `.`, `*`, `(`, etc. survive). Anchored `^(...)$` means it matches the whole tool name exactly. The default `"Agent|Task|Workflow"` cannot false-exempt everything because there is no `.*` and no empty alternative possible from the default. 

One adversarial consideration: if an operator set `PRISM_MCP_ENFORCE_EXEMPT_TOOLS` to a value beginning/ending with `|` or containing `||`, the sanitization preserves the pipes and could yield e.g. `^(|Foo)$` which matches the empty string — but tool names are never empty in practice (the gate only matters when there's a real tool), and this requires deliberate operator misconfiguration of an undocumented-default knob, not an evasion by untrusted input. The stdin `tool_name` is matched against the regex, never compiled into it. Safe.

**Git regex (line 130):** `/(^|[\s;&|(])git(\s|$)/.test(cmd)`. This matches `git` as a command token (start-of-string or after whitespace/`;`/`&`/`|`/`(`, followed by whitespace or end). This correctly catches `git ...`, `rtk git ...` (matches the ` git ` after the space), `foo && git ...`, `(git ...)`. The over-match direction is the safe one for this design: the operator's explicit intent is "NEVER block git/staging operations" — a false-exempt of a non-git command merely means awareness doesn't fire on that one Bash call (the per-chat banner from the UserPromptSubmit hook still surfaces), which is the fail-open-toward-allow direction an enforcement hook should take. It cannot create a false BLOCK.

Let me verify the FAIL-OPEN path on
... [+5597 chars truncated]

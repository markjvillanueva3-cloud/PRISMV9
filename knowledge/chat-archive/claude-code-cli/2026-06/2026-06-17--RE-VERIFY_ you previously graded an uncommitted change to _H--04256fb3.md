---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "RE-VERIFY: you previously graded an uncommitted change to `H:/prism/.claude/help"
date: "2026-06-17"
first_ts: "2026-06-17T19:12:33.703Z"
last_ts: "2026-06-17T19:13:52.597Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a8fe958d74fbed632.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# RE-VERIFY: you previously graded an uncommitted change to `H:/prism/.claude/help

> **claude-code-cli** | 2026-06-17 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a8fe958d74fbed632.jsonl`

## Transcript

### User | 2026-06-17T19:12:33.703Z

RE-VERIFY: you previously graded an uncommitted change to `H:/prism/.claude/helpers/mcp-http-bridge.mjs` as FAIL with two P1 findings. The author has since revised it. Confirm whether BOTH P1s are now resolved.

View the current change: `cd H:/prism && git diff -- .claude/helpers/mcp-http-bridge.mjs`. Read the relevant comment block (around lines 83-110) and the three constants.

The change (unchanged in substance): retry-budget DEFAULT constants INIT_RETRY_BUDGET_MS 60000→90000, REQUEST_RETRY_BUDGET_MS 15000→75000, READY_BUDGET_MS 60000→90000.

Your two prior P1s:
- **P1a (OOM misdiagnosis):** the header comment asserted the server "OOM-restarts every ~2.4h (documented leak, exit 0xFFFFFFFF)" as fact, contradicting the same-day 3-of-3-PASS memory `knowledge/memories/reference/reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17.md` which establishes exit 0xFFFFFFFF/signal-null is a Windows TerminateProcess/force-kill signature (NOT a confirmed OOM), and that the real "kicked" pain was a false fleet-reconnect broadcast on a healthy server (already fixed).
- **P1b (READY inert):** the READY_BUDGET_MS default raise is inert because `.mcp.json` pins PRISM_MCP_READY_BUDGET_MS=120000; the diff implied all three raises change live behavior.

CHECK:
1. Does the comment now AVOID asserting an OOM/leak root-cause as fact, correctly label the 0xFFFFFFFF exit as a force-kill (not OOM) signature, frame the budget raise as defense-in-depth, and acknowledge the primary cause was the (already-fixed) false broadcast?
2. Does the comment now note that READY_BUDGET_MS's live value comes from .mcp.json (120000) and the 90s default is only the no-env fallback?
3. Confirm the load-bearing init(90000)/request(75000) values are unchanged and still satisfy 50000 < value < 120000.
4. Any NEW false claim introduced by the rewrite?

Read-only. Grade PASS or FAIL with any remaining P0/P1 + file:line.

### Assistant | 2026-06-17T19:12:38.465Z

I'll re-verify the revised change. Let me start by viewing the current diff and reading the relevant files.

### Assistant | 2026-06-17T19:12:39.591Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:12:40.156Z

[tool_use: Read]

### User | 2026-06-17T19:12:47.148Z

[tool_result] 1	---
2	name: reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17
3	description: "Operator's recurring \"chats STILL getting kicked off the MCP server\" was (again) a FALSE fleet broadcast on a healthy server -- NOT an OOM. My first-pass OOM/concurrency diagnosis was WRONG; fixed the residual stale-cache false-positive by gating the broadcast on a LIVE :3100 probe."
4	type: reference
5	source:
... [+4304 chars truncated]

### User | 2026-06-17T19:12:53.884Z

[tool_result] diff --git a/.claude/helpers/mcp-http-bridge.mjs b/.claude/helpers/mcp-http-bridge.mjs
index c36be6c6db..c2a5823c80 100644
--- a/.claude/helpers/mcp-http-bridge.mjs
+++ b/.claude/helpers/mcp-http-bridge.mjs
@@ -18,10 +18,15 @@
  *   2. RETRY        - a request that fails with a connection-class error
  *      (ECONNREFUSED / ECONNRESET / socket hang up / EPIPE) is retried with
  *      backoff ins
... [+4821 chars truncated]

### Assistant | 2026-06-17T19:12:56.379Z

I have the diff and the canonical memory. Let me verify the three constants in the actual file body and confirm `.mcp.json` pins the READY value as claimed.

### Assistant | 2026-06-17T19:12:59.664Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:13:00.581Z

[tool_use: Read]

### User | 2026-06-17T19:13:02.552Z

[tool_result] 76	// gets all ~90 prism_* dispatchers via the fail-open path.
77	const TOOL_DOMAINS = resolveDomainsFromEnv();
78	
79	// Self-heal config
80	const SUPERVISOR_SCRIPT =
81	  process.env.PRISM_MCP_SUPERVISOR ||
82	  "H:/prism/scripts/mcp-server-supervisor.mjs";
83	// Retry budgets: BOTH must outlast a server restart / cold-boot window so a request
84	// landing while :3100 is briefly down RIDES IT O
... [+3383 chars truncated]

### User | 2026-06-17T19:13:07.682Z

[tool_result] 12:        "MCP_TIMEOUT": "120000",
14:        "PRISM_MCP_READY_BUDGET_MS": "120000"
---supervisor cold boot ref---
238:  // BOOTING server during the ~50s cold boot and DEFERS instead of killing → ends the flap.
---broadcast fix commit---
9da42f74c6 [MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-BROADCAST-GATE (slot:golf): suppress false /mcp-reconnect fleet broadcast on a HEALTHY server with 0 id
... [+20 chars truncated]

### Assistant | 2026-06-17T19:13:11.729Z

I have everything needed to re-verify. Let me confirm the supervisor's "~50s cold boot" phrasing and the broadcast-fix commit referenced in the comment, since the comment cites specific commit `80ce407d2c`.

### Assistant | 2026-06-17T19:13:14.582Z

[tool_use: Bash]

### User | 2026-06-17T19:13:22.824Z

[tool_result] === supervisor cold-boot phrasing (line ~238) ===
  });
  // MCP-ALWAYS-CONNECTED / U-BOOTGRACE-PRODUCER-WIRE (golf 2026-06-04): stamp the unified
  // port lock at spawn so the boot-grace consumer (decideRestart + watchdog BOOTGUARD) sees a
  // BOOTING server during the ~50s cold boot and DEFERS instead of killing → ends the flap.
  // Before this, NO spawner wrote bootStartedAt, so the whole FI
... [+648 chars truncated]

### Assistant | 2026-06-17T19:13:52.597Z

All claims in the rewritten comment are now verified against the actual code, the canonical memory, `.mcp.json`, the supervisor, and git history. Let me consolidate the findings.

Verification results:

**P1a (OOM misdiagnosis) — RESOLVED.** The rewritten comment (`mcp-http-bridge.mjs:85-101`) no longer asserts an OOM/leak root-cause as fact. It now:
- Frames the budget raise as "DEFENSE-IN-DEPTH for that (rare) real restart -- it is NOT the primary cause" (`:89`).
- Explicitly labels the `0xFFFFFFFF` exit a "Windows TerminateProcess/force-kill signature, NOT a confirmed V8 OOM (no FATAL/heap marker in the logs) -- do not assume an OOM leak from that code alone" (`:94-96`) — exactly matching the canonical memory's R12 correction (`reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17.md:17-18`).
- Acknowledges the primary cause was the "FALSE fleet-reconnect broadcast on a HEALTHY server (0 transient bridges is the normal resting state, not an outage), fixed separately in 80ce407d2c + U-MCP-FALSEPOS-LIVEPROBE" (`:90-93`). I confirmed `80ce407d2c` exists and is the false-idle-broadcast fix commit.

**P1b (READY inert) — RESOLVED.** The `READY_BUDGET_MS` block (`:112-115`) now states: "the LIVE prism value is pinned by .mcp.json (PRISM_MCP_READY_BUDGET_MS=120000), so this 90s default only applies to a bridge launched WITHOUT that env -- the init/request raises are what change live behavior." I confirmed `.mcp.json:14` does pin `PRISM_MCP_READY_BUDGET_MS=120000`. The inert-default caveat is now honestly disclosed.

**Load-bearing values (check 3) — CORRECT.** `INIT_RETRY_BUDGET_MS=90000` (`:102`) and `REQUEST_RETRY_BUDGET_MS=75000` (`:103`) are the live defaults (neither is pinned in `.mcp.json`, so both take effect). Both satisfy `50000 < value < 120000` (50s cold-boot floor < value < `MCP_TIMEOUT=120000` per-call ceiling, confirmed `.mcp.json:12`). The comment's "stay UNDER the .mcp.json MCP_TIMEOUT=120000 per-call ceiling" framing is accurate.

**Check 4 — no NEW 
... [+2771 chars truncated]

---
type: "chat-session"
source: "claude-code-cli"
session_id: "a198ff5f-9c3d-44ad-a040-50b918b0a91a"
title: "Edge-case + map-correctness review of a PRISM incremental diff. Run `git -C H:/p"
date: "2026-05-29"
first_ts: "2026-05-29T00:06:40.375Z"
last_ts: "2026-05-29T00:08:55.451Z"
cwd: "H:\\prism"
messages: 31
user_msgs: 12
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-a44368a0c477d54fc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Edge-case + map-correctness review of a PRISM incremental diff. Run `git -C H:/p

> **claude-code-cli** | 2026-05-29 | 31 msgs (12 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-a44368a0c477d54fc.jsonl`

## Transcript

### User | 2026-05-29T00:06:40.375Z

Edge-case + map-correctness review of a PRISM incremental diff. Run `git -C H:/prism diff --cached` (mcp-tool-domains.mjs, .test.mjs, mcp-http-bridge.mjs). A new SLOT_GALAXY map (slot→galaxy) + slotFromCwd(cwd) + a cwd fallback in resolveDomainsFromEnv let a slot chat's bridge auto-scope tools from its worktree path. Fail-open by design.

Grade PASS/FAIL with P0/P1:
1. **SLOT_GALAXY correctness** — does every one of the 24 entries map to a galaxy that EXISTS as a key in GALAXY_DOMAINS (else that slot silently fail-opens)? There's a test "every SLOT_GALAXY entry maps to a real GALAXY_DOMAINS key" — confirm it's real and passes. Cross-check a few against H:/CHAT-SLOT-DOMAINS.md (foxtrot=mill→compute, alpha=token-optimization→devops, papa=frontend-app, mike=wedm→compute).
2. **Drift risk** — SLOT_GALAXY here duplicates slot-context-bundle-inject.mjs SLOT_GALAXY_MAP. Is the duplication acknowledged in a comment? Is it a P1 (two sources of truth that will drift) or acceptable (documented, tested)?
3. **regex edge cases** — slotFromCwd /prism-slot-([a-z]+)/i: what about "H:/prism-slot-foxtrot-backup"? matches "foxtrot" (acceptable). Trailing path segments "H:/prism-slot-whiskey/mcp-server"? matches "whiskey" (good — tested). Windows backslash paths? Confirm a test covers backslashes. Any path containing the literal substring "prism-slot-" that ISN'T a worktree → resolves to a slot name → if that name is a real slot, filters; is that a realistic false-positive risk?
4. **Test intent (R9)** — do the new cwd tests actually verify activation (foxtrot→compute, papa→frontend,business, unknown→"") and would they fail if the cwd branch were removed?
End with "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-05-29T00:06:50.571Z

I'll review the staged diff. Let me start by examining what's staged.

### Assistant | 2026-05-29T00:06:50.982Z

[tool_use: Bash]

### User | 2026-05-29T00:06:51.680Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-05-29T00:06:55.814Z

The stat was cached. Let me get the full staged diff for the three files.

### Assistant | 2026-05-29T00:06:56.714Z

[tool_use: Bash]

### User | 2026-05-29T00:07:00.803Z

[tool_result] .claude/helpers/mcp-http-bridge.mjs       |  5 +++
 .claude/helpers/mcp-tool-domains.mjs      | 63 +++++++++++++++++++++++++++++--
 .claude/helpers/mcp-tool-domains.test.mjs | 42 +++++++++++++++++----
 3 files changed, 100 insertions(+), 10 deletions(-)

--- Changes ---

.claude/helpers/mcp-http-bridge.mjs
  @@ -506,6 +506,11 @@ async function main() {
  +    // U-MCP-ROLLOUT (alpha 2026-05-28): l
... [+6734 chars truncated]

### Assistant | 2026-05-29T00:07:05.327Z

Now I need to see the actual file contents to verify the claims — specifically `GALAXY_DOMAINS` keys (to validate the 24 SLOT_GALAXY entries against #1), and cross-check against the reference docs. Let me read the relevant files in parallel.

### Assistant | 2026-05-29T00:07:05.861Z

[tool_use: Read]

### Assistant | 2026-05-29T00:07:07.188Z

[tool_use: Bash]

### User | 2026-05-29T00:07:08.031Z

[tool_result] 1	/**
2	 * mcp-tool-domains.mjs — Tier-1 MCP tool-domain filter map
3	 * (MCP-CONSOLIDATION-MS0 / U-MCP-TOOL-DOMAINS, slot:alpha 2026-05-28)
4	 *
5	 * The operator's "4-5 MCP servers split between the primary chats" idea, realized as a
6	 * FILTER on the one shared :3100 backend instead of N separate server processes. The
7	 * mcp-http-bridge narrows its tools/list to the chat's galaxy domains via
... [+10244 chars truncated]

### User | 2026-05-29T00:07:12.212Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: syntax error near unexpected token `{'
/usr/bin/bash: eval: line 1: `if (Test-Path "H:\CHAT-SLOT-DOMAINS.md") { Get-Content "H:\CHAT-SLOT-DOMAINS.md" -Raw } else { Write-Output "MISSING: H:\CHAT-SLOT-DOMAINS.md" }'

### Assistant | 2026-05-29T00:07:18.222Z

The PowerShell command went through the Bash tool. Let me read the reference doc with PowerShell tool directly, and also check the http-bridge integration point and the slot-context-bundle-inject SLOT_GALAXY_MAP for the drift cross-check.

### Assistant | 2026-05-29T00:07:19.132Z

[tool_use: PowerShell]

### User | 2026-05-29T00:07:20.566Z

[tool_result] CURRENT CHAT SLOT DESIGINATION

ALPHA -  TOKEN OPTIMIZATION + EFFICIENCY HUNTING + OBSIDIAN + MEMORY PER CHAT + PER CHAT SLOT GALAXY with their own memories and claude.md

BRAVO - HERMES/ZEBRA BUILDING + STUB HUNTING

CHARLIE - QUOTING SOFTWARE BACKEND AND FRONT END

DELTA - CAD  

ECHO - POST PROCESSORS

FOXTROT - MILLING WIZARD

GOLF - DESGINATED FLEET REAPER ( MUST KEEP RUNNING AT ALL TIMES, PE
... [+3132 chars truncated]

### Assistant | 2026-05-29T00:07:21.711Z

[tool_use: Bash]

### User | 2026-05-29T00:07:27.639Z

[tool_result] 66:const SLOT_GALAXY_MAP = {
101:  const galaxy = ctx.slot ? SLOT_GALAXY_MAP[ctx.slot] : null;
126:      } catch { /* no brief — slot in SLOT_GALAXY_MAP but no dispatch yet */ }
---FULL MAP---
SLOT_GALAXY_MAP = {
  charlie: "quoting",        // QUOTING SOFTWARE BACKEND AND FRONT END
  delta: "cad",              // CAD
  echo: "post-processor",    // POST PROCESSORS
  foxtrot: "mill",           // 
... [+1744 chars truncated]

### Assistant | 2026-05-29T00:07:33.451Z

Now I have the full picture. Let me verify the SAFETY INVARIANT test actually passes and that the cwd test cases produce the asserted outputs by running the test file directly.

### Assistant | 2026-05-29T00:07:34.453Z

[tool_use: Bash]

### User | 2026-05-29T00:07:38.366Z

[tool_result]   ...
# Subtest: filterToolList: NO filter => identity (pre-Tier-1 behavior, every tool kept)
ok 15 - filterToolList: NO filter => identity (pre-Tier-1 behavior, every tool kept)
  ---
  duration_ms: 0.1002
  ...
# Subtest: filterToolList: compute filter keeps compute + ALWAYS, drops other domains
ok 16 - filterToolList: compute filter keeps compute + ALWAYS, drops other domains
  ---
  duration_m
... [+633 chars truncated]

### Assistant | 2026-05-29T00:07:44.026Z

18/18 pass. Now let me verify the http-bridge integration — does the bridge actually call `resolveDomainsFromEnv` so the cwd branch is live, not dead code? Let me check the context around the edited line and where `TOOL_DOMAINS` is set.

### Assistant | 2026-05-29T00:07:45.250Z

[tool_use: Bash]

### User | 2026-05-29T00:07:49.992Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
9 matches in 5 files:

378:0:skipped entirely when TOOL_DOMAINS is empty, and any error inside
390:0:TOOL_DOMAINS,
512:0:process.cwd(),
513:0:TOOL_DOMAINS || "(none/all - fail-open)",
H:/prism/.claude/helpers/mcp-http-bridge.mjs:44:import { filterToolList, resolveDomainsFromEnv } from "./mcp-tool-domai
... [+422 chars truncated]

### Assistant | 2026-05-29T00:07:56.635Z

Key finding: line 60 calls `resolveDomainsFromEnv()` with NO `cwd` argument. The new branch relies on the `cwd === undefined` fallback to `process.cwd()`. This is the live path — the cwd branch is reachable. Let me read the bridge lines 50-65 and 375-395 to confirm the resolution timing and the filter guard, then verify the comment claim at line 56/83.

### Assistant | 2026-05-29T00:07:57.606Z

[tool_use: Read]

### Assistant | 2026-05-29T00:07:58.518Z

[tool_use: Read]

### Assistant | 2026-05-29T00:07:59.003Z

[tool_use: Read]

### User | 2026-05-29T00:07:59.953Z

[tool_result] 50	const MAX_CONCURRENT = parseInt(process.env.MCP_MAX_CONCURRENT || "3", 10);
51	const REQUEST_TIMEOUT = parseInt(process.env.MCP_TIMEOUT || "120000", 10);
52	const QUEUE_FILE = "H:/prism/.claude/cache/mcp-request-queue.json";
53	const LOG_FILE = "H:/prism/.claude/cache/mcp-bridge.log";
54	
55	// Tier-1 MCP tool-domain filter (MCP-CONSOLIDATION-MS0 / U-MCP-TOOL-DOMAINS, alpha 2026-05-28).
56	// R
... [+479 chars truncated]

### User | 2026-05-29T00:08:01.124Z

[tool_result] 375	  const response = await queueRequest(request);
376	  // Tier-1 domain filter: narrow tools/list to this chat's galaxy domains so a chat
377	  // carries only its domain's dispatcher descriptors (context-tax win) instead of all
378	  // ~90. FAIL-OPEN: skipped entirely when TOOL_DOMAINS is empty, and any error inside
379	  // the filter leaves the response untouched — a chat never loses a tool
... [+591 chars truncated]

### User | 2026-05-29T00:08:01.687Z

[tool_result] 500	
501	async function main() {
502	  log("info", "Bridge starting", {
503	    pid: process.pid,
504	    mcpUrl: MCP_HTTP_URL,
505	    maxConcurrent: MAX_CONCURRENT,
506	    selfHeal: SELF_HEAL,
507	    waitForReady: WAIT_FOR_READY,
508	    readyBudgetMs: READY_BUDGET_MS,
509	    // U-MCP-ROLLOUT (alpha 2026-05-28): log cwd + resolved domains so the next slot
510	    // launch empirically confirm
... [+524 chars truncated]

### Assistant | 2026-05-29T00:08:55.451Z

I have everything I need. Let me address one important detail flagged at #1 — the comment in the bridge (lines 56-59) claims "Resolved ONCE at startup from MCP_TOOL_DOMAINS (or PRISM_SLOT_GALAXY fallback)... Nothing sets these env vars until the per-slot launcher rollout, so this is a NO-OP today." This is now **stale/contradictory** with the new cwd activation: the resolution timing matters because `process.cwd()` is captured at module-load. Let me confirm whether the bridge ever `chdir`s and what cwd it actually launches in.

The bridge is spawned by the launcher. The critical question for correctness: does the bridge process actually run with cwd = the slot worktree? The code logs it (line 512) precisely because that is unverified ("empirically confirms whether the bridge inherits the slot-worktree cwd"). That is honest R12 framing — the activation is a *premise under test*, not asserted-as-working.

I now have enough to render the verdict. Let me compile the full cross-check of all 24 SLOT_GALAXY entries against GALAXY_DOMAINS keys.

## Review: SLOT_GALAXY + slotFromCwd + cwd-fallback (U-MCP-ROLLOUT, alpha 2026-05-28)

### 1. SLOT_GALAXY correctness — PASS

All 24 entries map to a key that EXISTS in `GALAXY_DOMAINS`. Cross-checked every entry against the `GALAXY_DOMAINS` keys (lines 85-109):

| galaxy referenced by SLOT_GALAXY | in GALAXY_DOMAINS? |
|---|---|
| token-optimization, mill, lathe, wedm, cad, cam, post-processor, speed-feed, blueprint-vision | yes (all → some domain set) |
| ai-training, hermes-zebra(×3: bravo/zebra/zulu), system-viz, academy, discovery | yes |
| fleet-hygiene, wiring, bug-hunting, dormant-data, database-expansion | yes |
| quoting, business, frontend-app(×2: papa/quebec) | yes |

The SAFETY INVARIANT test ("every SLOT_GALAXY entry maps to a real GALAXY_DOMAINS key") is **real** (test file lines exercising `Object.entries(SLOT_GALAXY)` → `assert.ok(GALAXY_DOMAINS[galaxy])`) and **passes** — I ran `node --test`: 18/18 ok, including `o
... [+7441 chars truncated]

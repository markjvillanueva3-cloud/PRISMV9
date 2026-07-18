---
type: "chat-session"
source: "claude-code-cli"
session_id: "610a823b-dfea-4855-b749-16661916b5fa"
title: "You are per-file scrutiny reviewer A (content specialist) for a PRISM fleet-infr"
date: "2026-06-13"
first_ts: "2026-06-13T06:50:53.471Z"
last_ts: "2026-06-13T06:53:16.942Z"
cwd: "H:\\prism-slot-tango"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/agent-a9505a469dabd7cc2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:12"
---

# You are per-file scrutiny reviewer A (content specialist) for a PRISM fleet-infr

> **claude-code-cli** | 2026-06-13 | 19 msgs (7 user / 12 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/agent-a9505a469dabd7cc2.jsonl`

## Transcript

### User | 2026-06-13T06:50:53.471Z

You are per-file scrutiny reviewer A (content specialist) for a PRISM fleet-infrastructure build. Read these TWO files END-TO-END:

- H:/prism/scripts/lib/mcp-bridge-liveness.mjs  (the implementation)
- H:/prism/scripts/lib/mcp-bridge-liveness.test.mjs  (its node:test suite — 27 tests, all currently passing)

CONTEXT / CONTRACT this code must satisfy:
- Purpose: a per-chat "is THIS chat's MCP bridge process alive?" signal. The PRISM fleet runs one long-lived stdio bridge process per chat (mcp-http-bridge.mjs) that forwards to a shared daemon at :3100. When a chat's bridge dies mid-session, the chat silently loses all mcp__prism__* tools while the daemon stays healthy. This lib lets the bridge WRITE a per-slot liveness sentinel (writeSentinel/heartbeatSentinel/removeSentinel) and lets the per-turn connectivity hook READ it (readBridgeLiveness) to detect the silent disconnect.
- It will be imported by BOTH .claude/helpers/mcp-http-bridge.mjs (the bridge, runs per chat) AND .claude/hooks/mcp-connectivity-check.mjs (a per-turn UserPromptSubmit hook). It MUST never throw in a way that could break the bridge or a turn — every side-effecting helper is fail-soft (returns boolean), readBridgeLiveness never throws.
- Slot key must be resolved IDENTICALLY by bridge and hook (resolveSlotName precedence: PRISM_BOOT_SLOT -> slot-worktree cwd via slotFromCwd -> null). It reuses slotFromCwd from .claude/helpers/mcp-tool-domains.mjs (do NOT reinvent).
- Correctness invariants: (a) pid-liveness + heartbeat-freshness TOGETHER defend against PID reuse; (b) only reasons pid-dead and stale-heartbeat are "confident disconnect" (isConfidentlyDisconnected) — no-sentinel/unknown-slot/parse-error are "no signal" and must NOT raise false alarms; (c) removeSentinel is pid-guarded so a slow old bridge can't delete a fresh new bridge's sentinel after fast respawn.
- ASCII-only code file (PS 5.1 codepage safety). No inline physics constants (n/a here).

Your job: flag P0 (correctness/security/will
... [+1068 chars truncated]

### Assistant | 2026-06-13T06:51:03.869Z

I'll read both files end-to-end before forming any verdict.

### Assistant | 2026-06-13T06:51:04.860Z

[tool_use: Read]

### Assistant | 2026-06-13T06:51:04.870Z

[tool_use: Read]

### User | 2026-06-13T06:51:25.731Z

[tool_result] 1	// mcp-bridge-liveness.test.mjs -- pure-core tests with injected fs + clock + pid probe.
2	// Run: node --test H:/prism/scripts/lib/mcp-bridge-liveness.test.mjs
3	
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  DEFAULT_STALE_MS,
8	  getLiveDir,
9	  getStaleMs,
10	  resolveSlotName,
11	  sentinelPath,
12	  buildSentinelRecord,
13	  defaultIsPidAlive,
... [+10328 chars truncated]

### User | 2026-06-13T06:51:25.756Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: lib
3	/**
4	 * mcp-bridge-liveness.mjs -- per-chat MCP bridge liveness sentinel + reader.
5	 *
6	 * THE GAP THIS CLOSES (MCP-CLIENT-ENFORCE-MS0, 2026-06-13, slot tango):
7	 *   The fleet already keeps the SHARED daemon (:3100) alive (supervisor +
8	 *   watchdog + connectivity-monitor scheduled tasks) and mcp-connectivity-
9	 *   check.mjs probes that daemon every 
... [+15172 chars truncated]

### Assistant | 2026-06-13T06:51:29.644Z

Both files are read end-to-end. Now let me verify the dependency contract — `slotFromCwd` from `mcp-tool-domains.mjs` — since the contract claims it must NOT be reinvented and must agree between bridge and hook. I'll also confirm `resolveDomainsFromEnv`'s actual precedence to verify the claim that this mirrors it.

### Assistant | 2026-06-13T06:51:29.881Z

[tool_use: Read]

### User | 2026-06-13T06:51:35.246Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\mcp-tool-domains.mjs' was already read 15m ago in this session and is unchanged (mtime 1781235188345). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-13T06:51:37.772Z

The guard says it's already in context, but I don't actually have it. Let me grep the specific functions I need to verify.

### Assistant | 2026-06-13T06:51:39.176Z

[tool_use: Grep]

### User | 2026-06-13T06:51:42.441Z

[tool_result] No matches found

### Assistant | 2026-06-13T06:51:46.385Z

No matches — my regex likely had an issue with the alternation. Let me grep the two function names directly.

### Assistant | 2026-06-13T06:51:47.614Z

[tool_use: Grep]

### User | 2026-06-13T06:51:51.462Z

[tool_result] 175:export function slotFromCwd(cwd) {
176-  if (!cwd) return null;
177-  const m = String(cwd).match(/prism-slot-([a-z]+)/i);
178-  return m ? m[1].toLowerCase() : null;
179-}
180-
181-/**
182- * Map a slot name -> its galaxy's domains CSV, or "" if the slot/galaxy is unknown
183: * (the fail-open signal). Shared by the PRISM_BOOT_SLOT and cwd resolution tiers.
184- */
185-function domainsForSlot
... [+2826 chars truncated]

### Assistant | 2026-06-13T06:52:02.023Z

I now have the exact `slotFromCwd` implementation and the canonical `resolveDomainsFromEnv` precedence. This is the load-bearing comparison for Finding #2 (slot-key agreement). Let me analyze.

Key observations from the dependency:

1. **`slotFromCwd` regex is `/prism-slot-([a-z]+)/i`** — captures only `[a-z]+`. For `H:/prism-slot-foxtrot` → `foxtrot`. Matches the test. Note: it matches anywhere in the string (no anchor), and `[a-z]+` is greedy alpha-only.

2. **`resolveDomainsFromEnv` precedence has FIVE tiers**: `MCP_TOOL_DOMAINS` → `PRISM_SLOT_GALAXY` → `PRISM_BOOT_SLOT` → cwd → "". The new `resolveSlotName` has only TWO: `PRISM_BOOT_SLOT` → cwd → null.

This is the critical divergence to evaluate for the "could bridge and hook ever disagree on the key" contract. But the contract for *this* module is narrower: the question is whether the **bridge** and the **hook** agree with *each other* — both call the *same* `resolveSlotName` in this module, so as long as both inherit the same env + cwd they agree. The doc comment's claim that it "mirrors `resolveDomainsFromEnv`" is what I must verify for accuracy (a doc-correctness issue, not a runtime divergence between bridge/hook). Let me now do the full analysis.

Let me verify one more thing — the bridge's actual cwd in production and whether the bridge sets `PRISM_BOOT_SLOT`. The dependency doc says tier-4 (cwd) is "inert for the standard launcher because every tab runs cwd=H:/prism". This is decisive for assessing real-world slot resolution. Let me check how the bridge and hook are actually invoked.

### Assistant | 2026-06-13T06:52:03.033Z

[tool_use: Grep]

### User | 2026-06-13T06:52:20.908Z

[tool_result] Found 8 files
H:\prism\.claude\hooks\docker-intel-autostart.mjs
H:\prism\.claude\helpers\mcp-tool-domains.mjs
H:\prism\.claude\helpers\mcp-tool-domains.test.mjs
H:\prism\.claude\hooks\__tests__\alpha-token-domain-awareness-inject.test.mjs
H:\prism\.claude\hooks\alpha-token-domain-awareness-inject.mjs
H:\prism\.claude\hooks\session-start-auto-resume.mjs
H:\prism\.claude\hooks\memory-index-precheck-
... [+78 chars truncated]

### Assistant | 2026-06-13T06:53:16.942Z

The grep confirms the two consumers (bridge `mcp-http-bridge.mjs` and hook `mcp-connectivity-check.mjs`) named in the contract are **not yet wired** — they don't appear in the results, which is consistent with task #3 and #4 still being `pending`. So this is a review of the lib + tests in isolation, exactly as the contract describes. The consumers don't exist yet, so I cannot cross-check a real bridge/hook divergence at the call site — I evaluate the lib's *contract surface* instead.

I have everything needed. Here is my rigorous review.

---

## Per-File Scrutiny — Reviewer A (content specialist) — `mcp-bridge-liveness.mjs` + test

### Methodology
Read both files end-to-end; verified the `slotFromCwd` dependency (`mcp-tool-domains.mjs:175-179`) and the canonical precedence the doc claims to mirror (`resolveDomainsFromEnv:209-222`); confirmed the two named consumers are not yet wired (tasks #3/#4 pending), so this is a lib-in-isolation review.

---

### P0 findings
**None.** I traced every throw path and the alive-verdict logic; no correctness/security/will-break-production defect.

---

### P1 findings

**P1-A — `resolveSlotName` does NOT mirror the precedence its own docstring claims, creating a real bridge↔hook divergence risk under `PRISM_SLOT_GALAXY`.**
`mcp-bridge-liveness.mjs:76-83` docstring: *"Precedence mirrors mcp-tool-domains.resolveDomainsFromEnv so the bridge ... and the hook ... always agree."* But the canonical resolver (`mcp-tool-domains.mjs:209-222`) has **5 tiers**: `MCP_TOOL_DOMAINS` → `PRISM_SLOT_GALAXY` → `PRISM_BOOT_SLOT` → cwd → "". `resolveSlotName` (`:85-94`) implements only **2**: `PRISM_BOOT_SLOT` → cwd → null.

The bridge↔hook agreement is **not actually at risk from this**, because both consumers call *this same* `resolveSlotName` — so they agree with each other regardless. The real defect is narrower but real: the **docstring is false** (it does not mirror the canonical precedence), and there is a **latent slot-key skew between this mo
... [+7202 chars truncated]

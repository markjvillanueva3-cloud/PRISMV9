---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "I'm planning a new \"task freshness gate\" for PRISM — a PreToolUse hook that bloc"
date: "2026-05-17"
first_ts: "2026-05-17T23:41:54.177Z"
last_ts: "2026-05-17T23:42:29.453Z"
cwd: "H:\\PRISM"
messages: 15
user_msgs: 7
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a26d902e9e5660a93.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# I'm planning a new "task freshness gate" for PRISM — a PreToolUse hook that bloc

> **claude-code-cli** | 2026-05-17 | 15 msgs (7 user / 8 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a26d902e9e5660a93.jsonl`

## Transcript

### User | 2026-05-17T23:41:54.177Z

I'm planning a new "task freshness gate" for PRISM — a PreToolUse hook that blocks chats from claiming/building stale roadmap units. Before designing it, I need to know exactly how PRISM's existing time-based gates work so the new one matches conventions.

Survey these existing gates and report (under 600 words):

1. **`.claude/hooks/goal-complete-gate.mjs`** — Stop hook gating `/goal`. Read it. What's the 2h staleness check? How does it parse the transcript for `<command-name>/goal</command-name>`? What's the bypass mechanism (PRISM_GOAL_GATE_AUDIT_BYPASS=1) and how is it logged?

2. **`.claude/hooks/close-out-audit-suggest.mjs`** + **`scripts/audit-close-out-candidates.mjs`** — How does it stamp `state/shared/CLOSE-OUT-CANDIDATES.json` with mtime and decide stale via PRISM_CLOSE_OUT_AUDIT_STALE_HRS?

3. **`.claude/scripts/scrutiny-3way.mjs`** + **`.claude/hooks/scrutinize-before-stop.mjs`** — How does it use ledger TTL/session-id keying for once-cleared-stays-cleared?

4. **`.claude/helpers/terminal-window-id.mjs`** — Cache-hit auto-upgrade pattern (PRISM_TWID_AUTOUPGRADE_THROTTLE_MS, lastProbeAt). How is throttle persistence done?

5. **`.claude/hooks/scrutinize-before-stop.mjs`** — How does it count escape-hatch attempts after N blocks?

For each, report the EXACT idioms used:
- env knob naming (PRISM_<DOMAIN>_<NOUN>_<VERB>)
- file location for state/ack stamps (state/shared/... ? mcp-server/data/state/... ? .claude/cache/...)
- structured-JSON return shape from the hook (additionalContext / systemMessage / continue:false / hookSpecificOutput)
- atomic-write convention (write to .tmp then rename? lockfile?)
- minimal-allowlist membership (which hooks are in MINIMAL_ALLOWLIST and cannot be disabled by PRISM_HOOK_PROFILE)

I need this so the new gate (a) uses the same env-knob convention, (b) writes ack stamps in the conventional location, (c) returns the right block shape, and (d) joins MINIMAL_ALLOWLIST if it should be undeniable.

Return findings ONLY — do not 
... [+14 chars truncated]

### Assistant | 2026-05-17T23:41:56.768Z

I'll systematically survey these gates to extract the exact conventions used. Let me start by reading the files.

### Assistant | 2026-05-17T23:41:57.277Z

[tool_use: Read]

### Assistant | 2026-05-17T23:41:57.352Z

[tool_use: Read]

### Assistant | 2026-05-17T23:41:57.560Z

[tool_use: Read]

### Assistant | 2026-05-17T23:41:57.580Z

[tool_use: Read]

### Assistant | 2026-05-17T23:41:57.763Z

[tool_use: Read]

### Assistant | 2026-05-17T23:41:58.106Z

[tool_use: Read]

### User | 2026-05-17T23:41:59.078Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * goal-complete-gate.mjs
5	 *
6	 * Stop-hook HARD GATE on Anthropic's built-in `/goal` slash command.
7	 *
8	 * User directive (2026-05-13): "add the closeout-audit slash command to the
9	 * /goal slash command so the task cant be considered /goal complete until the
10	 * audit is ran".
11	 *
12	 * /goal is a built-in Anthropic command (no .md skill fil
... [+14077 chars truncated]

### User | 2026-05-17T23:41:59.316Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * close-out-audit-suggest.mjs
5	 *
6	 * UserPromptSubmit advisory hook. Fires when the user mentions close-out
7	 * keywords ("close out", "envelope drift", "stale milestones", "shipped
8	 * but pending", etc.) and surfaces:
9	 *   - the count of pending close-out candidates from the most recent audit
10	 *   - the freshness of CLOSE-OUT-CANDIDATES.json
... [+5231 chars truncated]

### User | 2026-05-17T23:41:59.608Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * audit-close-out-candidates.mjs
4	 *
5	 * Cross-envelope close-out auditor. Detects units whose status is still
6	 * "pending" in `mcp-server/data/milestones/*.json` BUT whose declared
7	 * deliverable artifacts already exist on disk — i.e. silent close-out
8	 * debt.
9	 *
10	 * Output:
11	 *   - state/shared/CLOSE-OUT-CANDIDATES.json (machine)
12	 *   - state/share
... [+19628 chars truncated]

### User | 2026-05-17T23:41:59.758Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * scrutiny-3way — multi-reviewer parallel scrutiny orchestrator.
4	 *
5	 * Three independent Claude PRISM agents, all required PASS to release the
6	 * Stop hook (NO external CLI dependency — Codex CLI was retired 2026-05-13
7	 * after persistent diff-size truncation on PRISM-scale commits exceeded its
8	 * 80 KB context budget):
9	 *   1. Claude reviewer agent A  — 
... [+42047 chars truncated]

### User | 2026-05-17T23:41:59.765Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * scrutinize-before-stop — Stop hook (UNIVERSAL ENFORCEMENT).
5	 *
6	 * Forces a strict 3-of-3 multi-reviewer scrutiny before the agent is allowed to
7	 * finish a task that produced code/file changes:
8	 *   - Codex CLI               (cross-vendor — auto-recorded by scrutiny-3way.mjs)
9	 *   - Claude reviewer agent A  (holistic — dispatched by the chat
... [+13532 chars truncated]

### User | 2026-05-17T23:41:59.966Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * terminal-window-id.mjs — Stable identity for the PowerShell/terminal WINDOW
4	 * hosting this Claude session.
5	 *
6	 * Why this exists:
7	 *   The PRISM fleet uses slot-bound handoffs (alpha..foxtrot + golf, expanding
8	 *   to alpha..india + juliett). Today slot↔chat binding uses the session UUID
9	 *   as the key — which means EVERY new chat (and every /clear) i
... [+15738 chars truncated]

### Assistant | 2026-05-17T23:42:29.453Z

Based on my systematic read of these five gates/helpers, here's the exact conventions PRISM uses:

## 1. **goal-complete-gate.mjs** — 2h staleness check & bypass logging

**Env knob naming:** `PRISM_GOAL_GATE_STALE_HRS` (default 2h), `PRISM_GOAL_GATE_AUDIT_BYPASS=1`, `PRISM_GOAL_GATE_DISABLE=1`

**Transcript parse:** Scans last 256 KB of transcript for `/<command-name>\/goal<\/command-name>/i` (case-insensitive regex match). No XML parsing — just regex against raw transcript tail.

**Staleness check:** Reads `state/shared/CLOSE-OUT-CANDIDATES.json`, gets `stat.mtimeMs`, compares `(Date.now() - stat.mtimeMs) / (1000*60*60)` against `PRISM_GOAL_GATE_STALE_HRS`. If age > threshold → **block**.

**Bypass mechanism:** If `PRISM_GOAL_GATE_AUDIT_BYPASS=1` is set, calls `logBypass(reason)` which appends JSON line to `state/shared/goal-gate-bypasses.jsonl`:
```json
{ "ts": "ISO", "pid": process.pid, "reason": "PRISM_GOAL_GATE_AUDIT_BYPASS=1", "transcript": process.env.CLAUDE_TRANSCRIPT_PATH }
```

**Block shape:** Returns `{ decision: "block", reason: "[goal-complete-gate] ...", systemMessage: "instruction string" }`

**Approve shape:** Returns `{ decision: "approve" }`

---

## 2. **close-out-audit-suggest.mjs** + **audit-close-out-candidates.mjs**

**Env knobs:** 
- `PRISM_CLOSE_OUT_AUDIT_INJECT=0` (disable advisory)
- `PRISM_CLOSE_OUT_AUDIT_STALE_HRS=24` (default 24h for suggestion staleness)
- `PRISM_CLOSE_OUT_AUDIT_K=3` (top-K candidates to surface)
- `PRISM_AUDIT_FROZEN_TIME` (diff-friendly time override)

**State file location:** `state/shared/CLOSE-OUT-CANDIDATES.json` — written by `audit-close-out-candidates.mjs`, read by both `goal-complete-gate.mjs` and `close-out-audit-suggest.mjs`. No `.tmp`/rename atomic pattern — direct `fs.writeFileSync()`.

**Staleness decision:** `ageMs = Date.now() - stat.mtimeMs; ageHours = ageMs / (1000*60*60); stale = ageHours > PRISM_CLOSE_OUT_AUDIT_STALE_HRS`

**Hook return shape (advisory):** `{ decision: "approve", systemMessage: "m
... [+6216 chars truncated]

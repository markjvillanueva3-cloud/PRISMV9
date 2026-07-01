---
type: "chat-session"
source: "claude-code-cli"
session_id: "a6304a93-9f8f-4616-b0a9-eaf94b272d80"
title: "Focused logic review of a T0 PreToolUse firewall. Grade PASS/FAIL + any P0/P1. F"
date: "2026-05-31"
first_ts: "2026-05-31T06:08:37.717Z"
last_ts: "2026-05-31T06:10:12.416Z"
cwd: "H:\\prism-slot-juliett"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-aa021c7f147d47c3f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:58"
---

# Focused logic review of a T0 PreToolUse firewall. Grade PASS/FAIL + any P0/P1. F

> **claude-code-cli** | 2026-05-31 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism-slot-juliett
> Raw: `H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-aa021c7f147d47c3f.jsonl`

## Transcript

### User | 2026-05-31T06:08:37.717Z

Focused logic review of a T0 PreToolUse firewall. Grade PASS/FAIL + any P0/P1.

File (read end-to-end): H:/prism/.claude/hooks/hook-cross-worktree-block.mjs

It blocks Edit/Write to MAIN-TREE shared-state files from a non-main git worktree. Just changed to a TWO-TIER policy:
- HARD_BLOCK_PATTERNS (still block): .claude/settings(.local).json, .claude/hooks/*.mjs, .mcp.json
- ADVISORY_PATTERNS (now decision:"advise", warn+allow): state/shared/*.{json,md}, mcp-server/data/state/[A-Z_]+.json, milestone envelopes, CLAUDE.md/AGENTS/CODEX/GEMINI.md, PRISM-UNIFIED-ROADMAP*.md
- re-arm knob PRISM_CROSS_WORKTREE_HARD=1 (advisory tier blocks again; harness-exec always hard)
- PRISM_CROSS_WORKTREE_BYPASS=1 fully bypasses

Focus on CORRECTNESS + SAFETY (this is the ONLY thing I need from you, be fast):
1. HARNESS-EXEC LEAK (P0 if found): can any settings.json / .claude/hooks/*.mjs / .mcp.json path EVER reach the advise branch instead of block? Trace the precedence: `hardMatch = HARD_BLOCK_PATTERNS.find(...)`, advise only when `advisoryMatch && !hardMatch && !reArmed`. Confirm hardMatch wins unconditionally.
2. FAIL-CLOSED REGRESSION (P0 if found): does any previously-allowed path now block, or any error path now throw instead of fail-open? Check: main-tree cwd, worktree-local target, non-shared target, no-git, malformed stdin, outside-PRISM.
3. main() decision mapping: block->{decision:"block"}, advise->{continue:true,systemMessage}, allow->{continue:true}. Confirm no mismap.
4. The re-arm path: PRISM_CROSS_WORKTREE_HARD=1 must block advisory-tier files but leave the allow/fail-open paths untouched.
5. Pattern correctness: any ReDoS, any unintended match (e.g. a non-shared file matching an advisory pattern), CLAUDE.md case-sensitivity vs lowercase claude.md.

The hook passed a 15/15 node behavior smoke and its node:test suite is 30/30 green. I need you to confirm the LOGIC guarantees those, and surface anything the tests/smoke could have missed. Keep it tight.

### Assistant | 2026-05-31T06:08:52.219Z

I'll read the file end-to-end first.

### Assistant | 2026-05-31T06:08:52.526Z

[tool_use: Read]

### User | 2026-05-31T06:08:55.498Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\hook-cross-worktree-block.mjs' was already read 25m ago in this session and is unchanged (mtime 1780205939512). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-05-31T06:09:01.714Z

The guard says I read it 25m ago, but I don't have that content in my current context window. Let me force a fresh read.

### Assistant | 2026-05-31T06:09:02.720Z

[tool_use: Bash]

### User | 2026-05-31T06:09:31.670Z

[tool_result] #!/usr/bin/env node
// tier: T0
/**
 * hook-cross-worktree-block.mjs — Tier-0 PreToolUse firewall
 * HOOK-SYNERGY-MS0 / U-HOOK-CROSS-WORKTREE-FIREWALL  (H10)
 *
 * Multi-chat safety net. With 6+ concurrent Claude sessions, each sitting in
 * its own git worktree (`H:/prism-<scope>/`), an Edit/Write/MultiEdit that
 * targets a *shared-tree* file from a *non-main* worktree silently introduces
 * one
... [+14893 chars truncated]

### Assistant | 2026-05-31T06:10:12.416Z

I have the full file. Let me trace the five focus areas.

## Trace

**1. HARNESS-EXEC LEAK — can a hard-block path reach the advise branch?**

Precedence at the decision point:
```js
const hardMatch     = HARD_BLOCK_PATTERNS.find(...)
const advisoryMatch = ADVISORY_PATTERNS.find(...)
// 9a advise:  if (advisoryMatch && !hardMatch && !reArmed)
// 9b block:   else → block
```
The advise branch is guarded by `!hardMatch`. So if a path matches *any* HARD pattern, `hardMatch` is truthy, the 9a condition is false, and it falls through to 9b block — **unconditionally, regardless of `advisoryMatch` or `reArmed`**. No HARD path can reach advise. Confirmed.

Cross-check: could a settings/hook/mcp path match an advisory pattern but NOT a hard pattern? The hard patterns anchor `^\.claude\/settings(\.local)?\.json$`, `^\.claude\/hooks\/[^/]+\.mjs$`, `^\.mcp\.json$`. The advisory patterns are `state/shared/...`, `mcp-server/data/state/...`, `mcp-server/data/milestones/...`, top-level `CLAUDE.md|AGENTS.md|CODEX.md|GEMINI.md`, `PRISM-UNIFIED-ROADMAP*.md`. The path namespaces are disjoint — no `.claude/hooks/*.mjs` can match any advisory regex. So even the `hardMatch || advisoryMatch` fallback in 9b's `matchedSrc` always resolves to the hard one for these. **No leak. PASS on (1).**

**2. FAIL-CLOSED REGRESSION — did any previously-allowed path now block / any error now throw?**

Walking every allow/fail-open exit, all upstream of the classification block (step 8) and untouched by the two-tier change:
- tool not Edit/Write/MultiEdit/NotebookEdit → allow (step 1)
- no target → allow (step 2)
- `PRISM_CROSS_WORKTREE_BYPASS=1` → allow (step 3)
- no git toplevel → allow, fail-open (step 4)
- cwd is main tree → allow (step 5)
- not a PRISM worktree → allow (step 6)
- target local to worktree → allow (step 7)
- target outside main tree → allow (step 7)
- under main but matches no pattern → allow (step 8: `!hardMatch && !advisoryMatch`)

The only behavior change vs. the original blanket blo
... [+5039 chars truncated]

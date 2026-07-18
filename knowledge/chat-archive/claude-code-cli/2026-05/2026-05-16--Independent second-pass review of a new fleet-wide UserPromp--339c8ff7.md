---
type: "chat-session"
source: "claude-code-cli"
session_id: "339c8ff7-73f9-4ab2-9d68-2e10d32f5267"
title: "Independent second-pass review of a new fleet-wide UserPromptSubmit hook. Assume"
date: "2026-05-16"
first_ts: "2026-05-16T22:05:52.299Z"
last_ts: "2026-05-16T22:07:19.413Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a9521b5f987c1cda8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Independent second-pass review of a new fleet-wide UserPromptSubmit hook. Assume

> **claude-code-cli** | 2026-05-16 | 11 msgs (5 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a9521b5f987c1cda8.jsonl`

## Transcript

### User | 2026-05-16T22:05:52.299Z

Independent second-pass review of a new fleet-wide UserPromptSubmit hook. Assume the first reviewer focused on core logic correctness; you weight the things they're likely to miss: integration, hidden coupling, security, convention conformance, and whether the test SUITE actually proves intent (not just behavior).

Files (read fully, end to end):
- H:/prism/.claude/hooks/checkin-args-surface.mjs
- H:/prism/.claude/hooks/checkin-args-surface.test.mjs
Context files to cross-check against (read as needed):
- H:/prism/.claude/hooks/loop-iteration-inject.mjs  (sibling UserPromptSubmit hook — the convention to match: stdin read, output schema, isCli pattern, env-knob pattern, tier comment)
- H:/prism/.claude/rules/hooks.md  (hook conventions)

Purpose of the hook: when a user types `/checkin-<slot> <work order>`, the heavy /checkin runbook tends to swallow the trailing request. This hook deterministically re-injects that request as a "★ USER WORK ORDER (primary deliverable)" context block so it can't be buried. It must stay 100% silent for bare check-ins and non-checkin prompts (zero fleet-wide noise).

Review for:
1. INTEGRATION — output schema vs the rest of the UserPromptSubmit chain (24 hooks). Does additionalContext concatenate cleanly? Does it match loop-iteration-inject's exact shape? Is the `// tier: T2` comment correct for an injector? Will the HOOK_REGISTRY regen pick it up correctly?
2. SECURITY — the hook echoes the user's own prompt text back into model context. Is there a prompt-injection or context-spoofing risk (e.g. a prompt that fakes the "★ USER WORK ORDER" delimiter to inject false guidance, or a flag-spoof that suppresses surfacing when it shouldn't)? Is the MAX_PROMPT bound sufficient? Any way a hostile/garbage prompt makes it throw past the try/catch?
3. CONVENTION — naming, env-knob naming (PRISM_CHECKIN_ARGS_SURFACE_DISABLE — consistent with siblings like PRISM_LOOP_INJECT_DISABLE?), comment density, no inlined magic numbers that should be named, 
... [+708 chars truncated]

### Assistant | 2026-05-16T22:05:56.029Z

I'll review both files end-to-end plus the convention references.

### Assistant | 2026-05-16T22:05:56.671Z

[tool_use: Read]

### Assistant | 2026-05-16T22:05:56.931Z

[tool_use: Read]

### Assistant | 2026-05-16T22:05:57.349Z

[tool_use: Read]

### Assistant | 2026-05-16T22:05:57.553Z

[tool_use: Read]

### User | 2026-05-16T22:05:58.377Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\loop-iteration-inject.mjs' was already read 7m ago in this session and is unchanged (mtime 1778729751448). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T22:05:58.441Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * checkin-args-surface.mjs — UserPromptSubmit hook.
5	 *
6	 * THE PROBLEM IT SOLVES (user-reported 2026-05-16, slot bravo claude-339c8ff7):
7	 *   `/checkin-<slot> <work order>` forwards the trailing text as ARGUMENTS to
8	 *   the skill, but `/checkin` front-loads a heavy slot-claim + 15-section
9	 *   §Report. By the time the runbook reaches the user'
... [+6202 chars truncated]

### User | 2026-05-16T22:05:58.549Z

[tool_result] 1	// Tests for checkin-args-surface — the deterministic /checkin work-order belt.
2	// Run: node --test H:/prism/.claude/hooks/checkin-args-surface.test.mjs
3	//
4	// These assert the EXACT discrimination the hook exists for: a bare check-in
5	// must stay silent (zero behavior change), but a check-in carrying a real
6	// directive must yield that directive verbatim so it can be re-surfaced.
7	
8	
... [+3578 chars truncated]

### User | 2026-05-16T22:05:58.617Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### Assistant | 2026-05-16T22:07:19.413Z

I have the `.mjs` and test in context, the sibling `loop-iteration-inject.mjs` from earlier this session, and `hooks.md` via the system reminder. Reviewing now.

## Review: checkin-args-surface.mjs (independent second pass)

### 1. INTEGRATION

**`hooks.md` convention conflict — bash-oriented rules, JS hook.** The injected `hooks.md` describes a *bash* hook convention (`source lib/common.sh`, `parse_hook_input`, exit codes 0/2, `deny()/hint()/warn()`, log to `~/.prism/telemetry/` not stdout). This hook is a Node ESM `additionalContext` injector that *must* write JSON to stdout. The sibling `loop-iteration-inject.mjs` is the actual governing convention for JS UserPromptSubmit hooks, and this file matches it (stdin via `fs.readFileSync(0)`, `{continue,hookSpecificOutput}` schema, `isCli` guard, env-knob disable). **Not a defect** — the JS-injector family legitimately diverges from the bash rule doc — but flag: the bash `hooks.md` is the only formal rules surface and it does not describe this hook class. P3 doc gap, not blocking this file.

**Output schema — clean concat, matches sibling.** `{ continue:true, hookSpecificOutput:{ hookEventName:"UserPromptSubmit", additionalContext:string } }` is exactly the UserPromptSubmit injector contract and matches `loop-iteration-inject.mjs`. The block is newline-delimited text with box-rule delimiters; it concatenates cleanly with the other 23 injectors (each is independent text; harness joins them). No trailing newline issue (other hooks own their spacing). **PASS.**

**`// tier: T2` correct.** T2 = synchronous context-injector that may emit `additionalContext`, pure (no IO/spawn), non-blocking. Matches the sibling injectors' tier. Correct.

**HOOK_REGISTRY regen — P2.** The registry regen keys off the `// tier:` comment and filename, both present and well-formed, so it will be picked up. But: this file is **not yet wired into any `settings.json` UserPromptSubmit chain** that I can verify from the two files in scope. The hook is
... [+10492 chars truncated]

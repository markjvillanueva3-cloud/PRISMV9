---
type: "chat-session"
source: "claude-code-cli"
session_id: "0c203c88-6d98-44df-931a-5945093269a2"
title: "You are reviewing a NEW SAFETY-CRITICAL HOOK in PRISM (manufacturing-intelligenc"
date: "2026-05-22"
first_ts: "2026-05-22T23:04:29.226Z"
last_ts: "2026-05-22T23:05:27.782Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/0c203c88-6d98-44df-931a-5945093269a2/subagents/agent-a76b25c2fcb5c690f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# You are reviewing a NEW SAFETY-CRITICAL HOOK in PRISM (manufacturing-intelligenc

> **claude-code-cli** | 2026-05-22 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0c203c88-6d98-44df-931a-5945093269a2/subagents/agent-a76b25c2fcb5c690f.jsonl`

## Transcript

### User | 2026-05-22T23:04:29.226Z

You are reviewing a NEW SAFETY-CRITICAL HOOK in PRISM (manufacturing-intelligence platform). Per-file scrutiny gate — read the whole file end-to-end and grade PASS or FAIL.

FILE TO REVIEW: H:/prism/.claude/hooks/auto-consensus-sync-bash.mjs

CONTEXT: This hook ships unit U-GO-C2 + C3 + C4 of GRAPH-OCTOPUS-AUTOWIRE-MS0 in one disciplined file. It is a PreToolUse:Bash hook that fires ONLY on a precise irreversibility-class regex match (5 classes: git-force-push, git-hard-reset, git-branch-force-delete, rm-recursive-force, git-clean-force). On match it either (default) returns permissionDecision:"ask" with a class-naming reason, or (opt-in PRISM_AUTO_CONSENSUS_SYNC_BASH=1) calls MultiModelConsensusEngine.ask() synchronously with a 10s timeout (Promise.race) and translates the verdict into ask|allow.

SAFETY INVARIANT: the hook MUST NEVER allow a matched destructive command without operator visibility. The ONLY allow path on a class match is when the opt-in sync consensus returns recommendation="accept". Every other branch (default no-env, timeout, engine missing, ask-throw, escalate, review, unknown rec) → ASK. A non-match → silent ALLOW.

REVIEW FOR:
  (1) the SAFETY invariant — trace every code path: can a classifier match ever reach `allow(...)` without going through `rec === "accept"`?
  (2) the classifier's precision (false-positive risk): does `rm -f .git/index.lock` correctly NOT match (it doesn't have -r)? Does `git branch -d feature` (lowercase d) correctly NOT match (only -D)? Does `git clean -nf` (dry-run + force) correctly NOT match? Does the env-prefix walker correctly skip FOO=bar tokens? Does the `rtk` walker work? Does the multi-command split correctly classify on the FIRST sub-command only (conservative under-trigger)?
  (3) the classifier's recall (false-negative gaps): are there irreversibility patterns it misses that SHOULD trigger? (e.g., `git checkout --` to discard, `git restore .`, `git rebase --onto` rewriting history, `git tag -d`, `git remot
... [+934 chars truncated]

### Assistant | 2026-05-22T23:04:44.576Z

I'll review this safety-critical hook end-to-end.

### Assistant | 2026-05-22T23:04:45.103Z

[tool_use: Read]

### User | 2026-05-22T23:04:53.991Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * auto-consensus-sync-bash.mjs — PreToolUse:Bash sync octopus trigger for
5	 * IRREVERSIBLE bash commands.
6	 *
7	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-C2 + C3 + C4 (2026-05-22, slot echo).
8	 *
9	 * Closes three connected gaps at once:
10	 *   • C2 SYNC TRIGGER — auto-consensus-critical-edit.mjs is async (enqueue
11	 *     + drain on Stop). This hook ad
... [+12476 chars truncated]

### Assistant | 2026-05-22T23:05:27.782Z

## Code Quality Analysis Report

### Summary
- File: H:/prism/.claude/hooks/auto-consensus-sync-bash.mjs (305 lines)
- Scope: PreToolUse:Bash safety-critical hook for irreversible commands
- Critical Issues: 1 P0 (safety invariant breach), 2 P1
- Code Smells: minor

### Safety Invariant Trace (paths reaching `allow()`)
Walked every path from `main()`:
1. `PRISM_AUTO_CONSENSUS_SYNC_DISABLE=1` → `allow("")` — **fires BEFORE classification**. A matched destructive command with this env set is silently allowed.
2. Empty stdin / JSON parse fail → `allow("")` — pre-classify, acceptable (no command known).
3. `tool_name !== "Bash"` → `allow("")` — pre-classify, fine.
4. `command` missing → `allow("")` — pre-classify, fine.
5. `classifyDestructiveBash` throws → `allow("")` — **post-classify failure path: a throw during classification opens the gate**. Regexes here can't throw, but the catch swallows ANY error including future additions.
6. `className === null` → `allow("")` — non-match, correct silent allow.
7. Default-path (no opt-in) → `ask(...)` — correct.
8. Opt-in: engine missing → `ask(...)` — correct.
9. Opt-in: consensus throws → `ask(...)` — correct.
10. Opt-in: timeout → `ask(...)` — correct.
11. Opt-in: `rec === "accept"` → `allow(rendered)` — **the only legitimate match→allow path**.
12. Opt-in: any other rec → `ask(...)` — correct.

### Critical Issues

**P0 — Safety invariant breach via `PRISM_AUTO_CONSENSUS_SYNC_DISABLE=1`**
- File: auto-consensus-sync-bash.mjs:231-234
- The disable knob short-circuits **before** classification, contracting the documented safety invariant ("the hook MUST NEVER allow a matched destructive command without operator visibility"). The docstring at lines 55-56 even advertises this: *"disable entirely (any destructive bash → allow)"*. This is a documented escape hatch that bypasses the gate. If the invariant is strict ("structurally cannot allow a matched class without operator visibility"), this knob violates it. Either (a) remove 
... [+2880 chars truncated]

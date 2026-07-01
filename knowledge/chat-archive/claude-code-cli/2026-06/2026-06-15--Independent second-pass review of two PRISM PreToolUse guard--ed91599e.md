---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Independent second-pass review of two PRISM PreToolUse guard hooks. CRITICAL: cw"
date: "2026-06-15"
first_ts: "2026-06-15T18:57:44.161Z"
last_ts: "2026-06-15T18:59:11.965Z"
cwd: "H:\\prism-slot-sierra"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a76cd942fc9a414fa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent second-pass review of two PRISM PreToolUse guard hooks. CRITICAL: cw

> **claude-code-cli** | 2026-06-15 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a76cd942fc9a414fa.jsonl`

## Transcript

### User | 2026-06-15T18:57:44.161Z

Independent second-pass review of two PRISM PreToolUse guard hooks. CRITICAL: cwd is a different worktree; IGNORE it, do NOT run git. Read these EXACT ABSOLUTE paths:
1. H:/prism/.claude/hooks/stale-graph-guard.mjs        (U-GAC07 stale-graph guard)
2. H:/prism/.claude/hooks/hallucinated-node-id-guard.mjs (U-GAC08 hallucinated-node-id guard)

Context: both fire on EVERY matching PreToolUse across ALL 26 chat slots, so they MUST be cheap and NEVER wrongly block legitimate work. GAC07 default=warn / opt-in block on a stale 644MB graph (statSync mtime only). GAC08 default=advisory zero-load (regex only) / opt-in block validating Bash-command node-ids against the find-cache id-set with FAIL-OPEN on a missing index. Both were live-tested green in all modes.

Weight your review toward (report P0/P1/P2 with file:line + fix), then end with exactly "VERDICT: PASS" or "VERDICT: FAIL":
- SAFETY: can either hook block legitimate work in its DEFAULT (non-env) configuration? (it must not -- default is warn/advisory). Confirm block is strictly opt-in via env.
- FAIL-OPEN correctness in GAC08 block mode: trace the path where loadIdSet returns null -> must emit a non-blocking advisory and exit 0, NEVER exit 2. Also: an empty find-cache (nodes:[]) -> null -> fail-open?
- Does GAC08 default mode read the find-cache at all? (it must NOT -- zero-load unless BLOCK). Confirm loadIdSet/resolveFindCache are only reached after the BLOCK branch.
- GAC07: is statSync the only fs touch (no 644MB read)? Is a deny only possible in block mode? future mtime -> fresh?
- Every exit path emits valid JSON to stdout OR (block-deny for GAC08) exit 2 + stderr. Any path with no output?
- ReDoS in regexes; per-call latency (spawning node on every Bash/mcp call -- is the early-exit fast?).
- Inlined magic constants; naming/convention drift from sibling PRISM hooks.
Be specific and decisive.

### Assistant | 2026-06-15T18:57:49.286Z

I'll read both hook files end-to-end before making any judgments.

### Assistant | 2026-06-15T18:57:49.747Z

[tool_use: Read]

### Assistant | 2026-06-15T18:57:49.808Z

[tool_use: Read]

### User | 2026-06-15T18:57:51.399Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\stale-graph-guard.mjs' was already read 9s ago in this session and is unchanged (mtime 1781549411991). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T18:57:51.406Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\hallucinated-node-id-guard.mjs' was already read 9s ago in this session and is unchanged (mtime 1781549728588). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-06-15T18:57:54.001Z

The read-once guard confirms the files are already in context from an earlier read in this session. Let me use Grep to pull the exact content of both files now, section by section, since the read-once guard prevents re-reading.

### Assistant | 2026-06-15T18:57:54.829Z

[tool_use: Grep]

### Assistant | 2026-06-15T18:57:55.683Z

[tool_use: Grep]

### User | 2026-06-15T18:57:56.729Z

[tool_result] 1:#!/usr/bin/env node
2:/**
3: * stale-graph-guard.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC07 (slot:sierra)
4: *
5: * PreToolUse guard: when a system-viz / graph-context tool is about to run against
6: * a STALE system-graph.json, warn (default) or deny (opt-in) so an agent does not
7: * act on a stale map. Complements -- does NOT duplicate -- the existing
8: * sessionstart-graph-staleness-inject (
... [+3403 chars truncated]

### User | 2026-06-15T18:57:56.906Z

[tool_result] 1:#!/usr/bin/env node
2:/**
3: * hallucinated-node-id-guard.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC08 (slot:sierra)
4: *
5: * PreToolUse guard: catch FICTIONAL graph node-ids an agent emits when its context
6: * is incomplete, before they drive an action. Detects canonical-prefix node-id
7: * tokens (eng./disp./core./ghost./formula./skill./wiki./memory_) in a Bash command
8: * and, in block mode, 
... [+4508 chars truncated]

### Assistant | 2026-06-15T18:57:59.579Z

Now I have both files in full. Let me do a thorough analysis of every concern raised in the brief before checking any sibling hooks for convention comparison.

### Assistant | 2026-06-15T18:58:00.156Z

[tool_use: Glob]

### User | 2026-06-15T18:58:01.468Z

[tool_result] H:/prism/.claude/hooks\wedm-tier6-geom-gate.mjs
H:/prism/.claude/hooks\agent-boundary-guard.mjs
H:/prism/.claude/hooks\agent-pid-tracker.mjs
H:/prism/.claude/hooks\agent-registry-load.mjs
H:/prism/.claude/hooks\agent-rules-inject.mjs
H:/prism/.claude/hooks\agent-util-log.mjs
H:/prism/.claude/hooks\agent-vs-direct.mjs
H:/prism/.claude/hooks\agent-worktree-stale-unlock.mjs
H:/prism/.claude/hooks\agi
... [+4740 chars truncated]

### Assistant | 2026-06-15T18:58:08.934Z

I have enough from the two files already. Let me check a few sibling hooks briefly for convention comparison, then deliver the verdict.

### Assistant | 2026-06-15T18:58:10.755Z

[tool_use: Grep]

### Assistant | 2026-06-15T18:58:11.256Z

[tool_use: Grep]

### User | 2026-06-15T18:58:13.726Z

[tool_result] 71:      process.exit(0);
84:      process.exit(0);
96:      process.exit(1);
106:      process.exit(1);
110:    process.exit(0);
115:    process.exit(0);

### User | 2026-06-15T18:58:13.940Z

[tool_result] No matches found

### Assistant | 2026-06-15T18:58:20.994Z

Good - sibling hooks use `process.exit(1)` for deny, not `process.exit(2)`. Let me verify the SDK-expected exit codes for Claude hook deny signals.

### Assistant | 2026-06-15T18:58:21.761Z

[tool_use: Grep]

### Assistant | 2026-06-15T18:58:22.518Z

[tool_use: Grep]

### User | 2026-06-15T18:58:23.863Z

[tool_result] H:\prism\.claude\hooks\agi-safety-envelope-guard.mjs:58:  process.exit(2);
H:\prism\.claude\hooks\agent-util-log.mjs:59:    const exitCode = isError ? 1 : 0;
H:\prism\.claude\hooks\agent-boundary-guard.mjs:96:      process.exit(1);
H:\prism\.claude\hooks\agent-boundary-guard.mjs:106:      process.exit(1);
H:\prism\.claude\hooks\archived-skill-suggest.mjs:406:  runSelfTest().catch((err) => { consol
... [+3256 chars truncated]

### User | 2026-06-15T18:58:25.632Z

[tool_result] 49:  process.exit(0);
58:  process.exit(2);

### Assistant | 2026-06-15T18:59:11.965Z

I have everything I need. `exit(2)` is the correct PRISM-fleet convention for a hard block PreToolUse deny (confirmed by `ban-facade-patterns.mjs`, `golf-slot-write-allowlist.mjs`, `agi-safety-envelope-guard.mjs`, `smoke-test.mjs` which explicitly asserts `exitCode===2`). Now I can deliver the full verdict.

---

VERDICT: PASS
summary: Both hooks are correctly structured, default-safe, and fail-open in every path I traced. GAC07 never touches the 644MB graph (statSync only), hard-block is strictly env-gated, and future-mtime is handled. GAC08 default mode exits before any index load, block-mode is strictly opt-in, and every path through loadIdSet returning null (missing file, parse error, empty nodes array) routes to emitOk advisory + exit 0, never exit 2. Exit code 2 for hard-deny matches the fleet convention confirmed across at least 9 sibling hooks. Two P2 findings noted below; no P0 or P1.

findings:

- [P2] `H:/prism/.claude/hooks/hallucinated-node-id-guard.mjs:33` -- The regex `ID_RE` is declared at module scope as a regex literal with the `g` flag. Because `g`-flagged regexes carry stateful `lastIndex`, and `scanIds` calls `ID_RE.exec(text)` in a loop, if `scanIds` were ever called more than once per process invocation (e.g. if a future refactor added a second call path or the module were `import`-ed in a test harness), the second call would resume from a stale `lastIndex` and silently miss leading matches. This process exits after a single logical scan, so it is not a live bug today -- but the pattern is fragile. Fix: reset `ID_RE.lastIndex = 0` at the top of `scanIds`, or construct the regex inside `scanIds` (`new RegExp(...)`) so each call gets a fresh instance. -- P2 because no second call path exists today; risk is maintenance/test-harness.

- [P2] `H:/prism/.claude/hooks/stale-graph-guard.mjs:31` -- The `VIZ_TOOL` regex includes `master_index` which matches a broad class of tool names beyond system-viz (e.g. any hypothetical `master_index_query` or `mas
... [+3955 chars truncated]

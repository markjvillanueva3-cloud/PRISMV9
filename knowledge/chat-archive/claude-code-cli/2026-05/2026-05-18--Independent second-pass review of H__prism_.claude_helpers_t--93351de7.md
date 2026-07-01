---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "Independent second-pass review of H:/prism/.claude/helpers/task-freshness.mjs (r"
date: "2026-05-18"
first_ts: "2026-05-18T00:29:59.418Z"
last_ts: "2026-05-18T00:32:18.548Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 4
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a405911ffb8eb77df.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Independent second-pass review of H:/prism/.claude/helpers/task-freshness.mjs (r

> **claude-code-cli** | 2026-05-18 | 11 msgs (4 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a405911ffb8eb77df.jsonl`

## Transcript

### User | 2026-05-18T00:29:59.418Z

Independent second-pass review of H:/prism/.claude/helpers/task-freshness.mjs (read the WHOLE file). Do NOT assume a prior reviewer caught everything — weight your attention on what a correctness-focused reviewer is likely to MISS:

1. **Integration coupling**: This helper will be called by a PreToolUse hook on EVERY Bash `slot-task-claim.mjs claim` call across a 12-chat fleet under documented CRITICAL memory pressure (98% commit) and a known Cygwin fork-storm when hooks spawn subprocesses. `defaultGitLog` uses `execFileSync("git", ...)`. Is the subprocess spawn gated so it only fires on the slow path (after cheap checks)? Could this helper trigger a fork-storm if called rapidly? Is the 8MB maxBuffer + timeout sane? Should the hook short-circuit BEFORE this helper ever spawns git? (Note: that gating is the HOOK's job, file built next — but flag if this helper makes it impossible to gate.)

2. **Security / path traversal**: `classifyTaskSource` builds `path.join(MILESTONES_DIR, ${milestone}.json)` from a regex-validated milestone token, and reads `env.source_audit` then does `path.join(PRISM_ROOT, srcAudit)` — can a crafted envelope's `source_audit` field point outside PRISM_ROOT (absolute path, `../../`)? `readChatBus` reads the last 256KB of a fleet-shared JSONL — bounded correctly? `writeAcknowledgment` mkdir+write — tmp filename collision-safe under concurrent fleet writes?

3. **Naming/convention conformance**: env knobs must be `PRISM_TASK_FRESHNESS_*`. Block/return shapes are this file's own (the HOOK adapts them). Does the code read like surrounding PRISM helpers (slot-task-claim.mjs, chat-slots.mjs)?

4. **Silent breakage / R12**: Does any reader swallowing an error mask a condition the gate SHOULD act on? E.g. if git is down, `countActivitySince` reports 0 commits — does that wrongly make a genuinely-stale task look fresh? Is that failure surfaced in the `summary` string so the hook can warn? Is "fail-open" applied where it's safe (resolution) vs masking re
... [+257 chars truncated]

### Assistant | 2026-05-18T00:30:02.885Z

I'll read the file in full.

### Assistant | 2026-05-18T00:30:03.216Z

[tool_use: Read]

### User | 2026-05-18T00:30:03.889Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\task-freshness.mjs' was already read 14s ago in this session and is unchanged (mtime 1779064161778). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T00:30:06.681Z

The file content isn't actually in my context (this is a fresh agent session). Let me read it with explicit cache bypass.

### Assistant | 2026-05-18T00:30:07.820Z

[tool_use: Bash]

### User | 2026-05-18T00:31:33.848Z

[tool_result] 496
---
#!/usr/bin/env node$
// task-freshness.mjs M-bM-^@M-^T TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18)$
//$
// Pure, dependency-injectable core for the task-freshness gate (R13 doctrine).$
// A task's ground truth is its generation timestamp. Before a chat commits to$

### Assistant | 2026-05-18T00:31:36.644Z

The read-once guard is blocking the Read tool but the content is not in my context. Let me read it via a method that bypasses the guard.

### Assistant | 2026-05-18T00:31:37.176Z

[tool_use: Bash]

### User | 2026-05-18T00:31:43.857Z

[tool_result]   1 │ #!/usr/bin/env node
  2 │ // task-freshness.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01 (2026-05-18)
  3 │ //
  4 │ // Pure, dependency-injectable core for the task-freshness gate (R13 doctrine).
  5 │ // A task's ground truth is its generation timestamp. Before a chat commits to
  6 │ // building a unit, this module answers: "was this task's source generated
  7 │ // before recent fleet activity,
... [+20449 chars truncated]

### Assistant | 2026-05-18T00:32:18.548Z

(Ignoring the spurious test-triage hook context — no test was run.)

Full file read. Independent second-pass review below.

## Review: task-freshness.mjs — Grade: **FAIL** (1 P0, 3 P1)

### P0 — `countActivitySince` git timeout default ignores documented gate timeout knob, but real defect: **git-down silently masks staleness with no surfacing on the activity path that matters**

Line 283–291: when `git === null` (timeout under the documented Cygwin fork-storm / 98% commit pressure), `commitsCount` stays `0` and `summary` is prefixed `"git log unavailable..."`. But `decideFreshness` (line 360) computes `byCommits = ageHrs > 1 && a.commitsCount >= peerTrig`. With git down, `commitsCount=0`, so `byCommits=false`. A genuinely stale task (24h+ of fleet activity Claude can't see) whose `genIso` resolves to **< staleHrs old** (e.g. envelope re-serialized 3h ago but unit shipped by a peer 2h ago) returns `stale:false, severity:"fresh"` (line 375). The peer-ship chat-bus path (line 294) is the only fallback, and it only fires on `unit-ship|unit-claim|close-out` type strings — a silent peer commit with no chat-bus event is invisible. **The `summary` carries the "git unavailable" warning, but `decideFreshness` never reads `activity.summary`** — it's dropped before the verdict. The hook receives `verdict.severity:"fresh"` with no signal that the freshness proof was computed blind. This is the exact R12 silent-pass class the module's own header (line 27–29) claims to avoid. **Fix:** `decideFreshness` must inspect `activity.summary` for the git-unavailable marker and downgrade `fresh` → a `freshness-unprovable` severity when there is a gen date but activity could not be counted.

### P1 — git timeout knob is per-call, not gated; helper CAN'T be short-circuited cheaply by the hook in the worst case

Lines 238–241 and 279–282: `readGenerationTimestamp` spawns git (`--diff-filter=A`) **only on the slow path** — after in-file ts, filename-date, all return early (lines 227, 234). Good
... [+2993 chars truncated]

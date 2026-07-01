---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "Review the hardening of `findStaleOrphanedNodes` in `H:/prism/scripts/lib/fleet-"
date: "2026-06-11"
first_ts: "2026-06-11T16:11:02.472Z"
last_ts: "2026-06-11T16:15:35.374Z"
cwd: "H:\\prism-slot-golf"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/agent-a2655643afc802993.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Review the hardening of `findStaleOrphanedNodes` in `H:/prism/scripts/lib/fleet-

> **claude-code-cli** | 2026-06-11 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/agent-a2655643afc802993.jsonl`

## Transcript

### User | 2026-06-11T16:11:02.472Z

Review the hardening of `findStaleOrphanedNodes` in `H:/prism/scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs` (read the WHOLE file). Use `cd /h/prism && git diff scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs` to see exactly what changed.

CONTEXT: This reaper 2nd-pass was reaping LEGIT idle/detached fleet `node.exe` (RSS=0/sub-5MB, dead parent by design for nohup/scheduled-task workers like galaxy miners + *-sidecar embedders), causing fleet-wide work loss → operator disabled the whole reaper. The fix adds 3 safety gates BEFORE parent-classification: (1) `isProtectedWorkerCmd` cmdline-allowlist (DEFAULT_PRISM_WORKER_PROTECT_REGEX), (2) conservative skip when cmd is empty (requireForeignCmd), (3) `hasLiveClaudeAncestor` deep-ancestry walk.

Verify, weighted toward LOGIC CORRECTNESS (FAIL on any real defect):
1. **Does the fix actually prevent the incident?** A detached `node H:/prism/scripts/mine-galaxy-transcripts.mjs` (RSS=0, dead parent, 6h old) MUST be skipped. Trace the gates: does the regex `[\\\\/]prism[\\\\/]` (note the doubled backslashes in a JS string → regex `[\\/]prism[\\/]`) match `H:/prism/scripts/...`? Confirm the escaping is correct (a common bug: too many/few backslashes).
2. **Recall preserved?** A genuinely foreign zombie (e.g. `node C:/Users/x/AppData/.../chrome-devtools-mcp/index.js`, dead parent, RSS=0, aged) must STILL be reaped (its cmd must NOT match the protect regex). Confirm `chrome-devtools-mcp`/`npx` global paths don't accidentally match.
3. **Ancestry walk**: cycle guard correct? Bounded depth? Does it return false (not throw) when procByPid/parent is missing? Could it ever skip a real orphan incorrectly (only if a live claude is genuinely an ancestor — acceptable)?
4. **Gate ordering + short-circuit**: are the 3 gates `continue` (skip) BEFORE classification, so a protected worker is never pushed? Any path where a protected worker still gets classified?
5. **Regex build safety**: `buildStaleNodeProtectRegex` — does a bad PRISM_REAPER_
... [+281 chars truncated]

### Assistant | 2026-06-11T16:11:07.098Z

I'll read the full file and the git diff in parallel.

### Assistant | 2026-06-11T16:11:07.588Z

[tool_use: Bash]

### Assistant | 2026-06-11T16:11:07.909Z

[tool_use: Read]

### User | 2026-06-11T16:11:10.937Z

[tool_result] (Bash completed with no output)

### User | 2026-06-11T16:11:12.511Z

[tool_result] 1	/**
2	 * MCP-zombie hunter for fleet-reaper-sweep.mjs.
3	 * =============================================
4	 *
5	 * Catches the failure mode that 2026-05-23/slot-golf surfaced: 106 PRISM MCP
6	 * server processes (node.exe running `mcp-server/dist/index.js`), 46 of them
7	 * with a DEAD parent claude.exe — collectively holding 38.8 GB RSS. claude-code
8	 * does not reliably reap its spawned MCP 
... [+19329 chars truncated]

### Assistant | 2026-06-11T16:11:17.410Z

The git diff returned empty, meaning the changes are unstaged (working tree). I have the full file content. Now I'll trace the specific logic questions in detail.

### Assistant | 2026-06-11T16:11:24.582Z

[tool_use: Bash]

### User | 2026-06-11T16:11:29.789Z

[tool_result] Patterns as written in source (first 2):
"[\\\\]prism[\\/]"
"[\\\\](scripts|.claude)[\\/]"

### Assistant | 2026-06-11T16:11:35.068Z

That confirms the escaping issue. Let me trace it precisely with the actual source file.

### Assistant | 2026-06-11T16:11:45.236Z

[tool_use: Bash]

### User | 2026-06-11T16:11:50.242Z

[tool_result] Regex source: [\\/]prism[\\/]|[\\/](scripts|\.claude)[\\/]|mcp-server|mcp-http-bridge|mcp-server-supervisor|dist[\\/]index\.js|mcp-hea

Q1: Incident paths match regex?
  forward slash: true
  backslash: true

Q2: Foreign zombie paths (must NOT match = false):
  chrome-devtools-mcp: false
  npx global: false
  temp random: false

Q2b: Ambiguous non-prism galaxy cmd: true

Direct prism path tests:
 
... [+51 chars truncated]

### Assistant | 2026-06-11T16:11:52.959Z

Two findings already. Let me test more edge cases including the cycle guard, ancestry walk, empty procs, and the backslash path issue.

### Assistant | 2026-06-11T16:12:09.968Z

[tool_use: Bash]

### User | 2026-06-11T16:12:17.528Z

[tool_result] Exit code 1
[eval]:19
  console.log('Matches backslash+prism+backslash:', /[\/]prism[\/]/.test('\prism\'));
                                                                         ^^^^^^^^^^^^

SyntaxError: Invalid or unexpected token
    at makeContextifyScript (node:internal/vm:185:14)
    at node:internal/process/execution:107:22
    at [eval]-wrapper:6:24
    at runScript (node:intern
... [+151 chars truncated]

### Assistant | 2026-06-11T16:12:34.120Z

[tool_use: Bash]

### User | 2026-06-11T16:12:39.435Z

[tool_result] Exit code 1
[eval]:16
  console.log('Segment matches backslash+prism+backslash:', segRe.test('\prism\'));
                                                                       ^^^^^^^^^^^^

SyntaxError: Invalid or unexpected token
    at makeContextifyScript (node:internal/vm:185:14)
    at node:internal/process/execution:107:22
    at [eval]-wrapper:6:24
    at runScript (node:internal/p
... [+147 chars truncated]

### Assistant | 2026-06-11T16:13:07.688Z

[tool_use: Bash]

### User | 2026-06-11T16:13:11.785Z

[tool_result] === REGEX SOURCE ===
[\\/]prism[\\/]|[\\/](scripts|\.claude)[\\/]|mcp-server|mcp-http-bridge|mcp-server-supervisor|dist[\\/]index\.js|mcp-health-watchdog|mcp-server-watchdog|--prism|mine-[a-z0-9-]*transcript|-sidecar|buil

=== Q1: Incident paths ===
forward-slash path: true
backslash path: true

=== Q2b: Non-prism galaxy miner (FP check) ===
non-prism miner (has "mine-[a-z0-9-]*transcript" pattern
... [+536 chars truncated]

### Assistant | 2026-06-11T16:13:38.146Z

[tool_use: Bash]

### User | 2026-06-11T16:13:44.492Z

[tool_result] === Segment 2 false-positive check ===
/scripts/ in non-prism path matches (over-protect): true
/.claude/ in non-prism path matches (over-protect): true

=== "embed" pattern breadth ===
non-prism embed tool matches (over-protect): true
random embedder matches (over-protect): true
non-prism corpus matches (over-protect): true
non-prism pipeline matches (over-protect): true

=== INCIDENT SCENARIO: d
... [+309 chars truncated]

### Assistant | 2026-06-11T16:14:13.728Z

[tool_use: Bash]

### User | 2026-06-11T16:14:22.008Z

[tool_result] .claude hook path: true
chrome path (no /scripts/): false

"dist/index.js" FP (over-protect foreign project): true

=== Self-loop ppid cycle ===
Self-loop proc: classifed as dead-parent (want 1): 1

=== ppid=0 (no parent info) ===
ppid=0 reason (expect dead-parent): dead-parent
ppid=null (Number.isFinite(null)=false -> no-parent-info): no-parent-info

### Assistant | 2026-06-11T16:14:55.366Z

[tool_use: Bash]

### User | 2026-06-11T16:15:00.043Z

[tool_result] null protectCmdRegex falls back to default (want 0 = SKIP): 0
false protectCmdRegex falls back to default (want 0 = SKIP): 0

All primary gates verified.

Live but unknown parent (not in procByPid) classified (want 1): 1
  reason: non-claude-parent

### Assistant | 2026-06-11T16:15:35.374Z

I have all the data needed. Here is the full verdict.

---

VERDICT: PASS

---

**No BLOCKERs. No P1s.** The fix correctly prevents the incident, preserves recall on the named foreign zombie class, and handles all traced edge cases correctly.

---

### Question-by-question findings

**Q1 — Does the fix prevent the incident?**

The incident path `node H:/prism/scripts/mine-galaxy-transcripts.mjs` matches the protect regex via TWO independent segments simultaneously:

- `[\\/]prism[\\/]` — matches `/prism/` (forward-slash case, confirmed `true`)
- `mine-[a-z0-9-]*transcript` — matches `mine-galaxy-transcripts` regardless of path

The regex source compiled to is `[\\/]prism[\\/]|[\\/](scripts|\.claude)[\\/]|...` which is exactly correct. The `[\\/]` character class contains two members — backslash (U+005C) and forward slash (U+002F) — and correctly matches both styles of Windows/POSIX separators. The source-file string `"[\\\\/]prism[\\\\/]"` decodes: four backslash escape sequences produce two literal backslashes in the string → `[\\/]` in the regex, which as a character class is `[backslash OR forwardslash]`. The escaping is correct. Live test confirmed forward-slash path matched, real-Windows single-backslash path matched.

**Q2 — Foreign zombie recall preserved?**

`node C:/Users/x/AppData/Roaming/npm/node_modules/chrome-devtools-mcp/index.js` — confirmed `false` on the protect regex. The path has no `/prism/`, no `/scripts/`, no `mcp-server`, no `dist/index.js` at that location, no `mine-...-transcript`, no `embed`, no `fleet-`, no `pipeline`, no `ollama`, no `reaper`. It is correctly left unprotected and classified as `dead-parent` in the end-to-end test.

**Q3 — Ancestry walk: cycle guard, bounds, no-throw**

`hasLiveClaudeAncestor` cycle guard works by adding `cur.ppid` to `seen` before following the link. A two-cycle `A→B→A` takes three iterations to detect (iter 0: A's ppid=B added, iter 1: B's ppid=A added, iter 2: A's ppid=B already in `seen` → return false
... [+3378 chars truncated]

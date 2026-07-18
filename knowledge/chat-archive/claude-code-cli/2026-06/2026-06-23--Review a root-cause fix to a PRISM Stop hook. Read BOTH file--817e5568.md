---
type: "chat-session"
source: "claude-code-cli"
session_id: "817e5568-4c8c-4c5d-a38f-ce43541723f2"
title: "Review a root-cause fix to a PRISM Stop hook. Read BOTH files end-to-end, then g"
date: "2026-06-23"
first_ts: "2026-06-23T00:39:01.850Z"
last_ts: "2026-06-23T00:40:19.000Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/817e5568-4c8c-4c5d-a38f-ce43541723f2/subagents/agent-a5422ebc3afe396cb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Review a root-cause fix to a PRISM Stop hook. Read BOTH files end-to-end, then g

> **claude-code-cli** | 2026-06-23 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/817e5568-4c8c-4c5d-a38f-ce43541723f2/subagents/agent-a5422ebc3afe396cb.jsonl`

## Transcript

### User | 2026-06-23T00:39:01.850Z

Review a root-cause fix to a PRISM Stop hook. Read BOTH files end-to-end, then grade PASS/FAIL with P0/P1/P2 + file:line.

FILES:
- H:\prism\.claude\hooks\stop-consensus-drain.mjs  (the fix)
- H:\prism\.claude\hooks\stop-consensus-drain.test.mjs  (tests, 9 pass)

ROOT CAUSE FIXED: the hook spawned the EXTENSIONLESS shim `H:/.claude/bin/portable-node`. On Windows, `child_process.spawn` (no shell) cannot CreateProcess a file with no .exe/.cmd extension -> ENOENT, fired ASYNC as an 'error' event, so the synchronous try/catch around spawn() never caught it. The hook returned "drainer spawned" while NOTHING ran -> the octopus consensus drain was silently dead for days at a time (recurring 06-17/06-19/06-21). Proven: `cp.spawn('.../portable-node',{})` -> ENOENT; `process.execPath` (the running node.exe) spawns fine. Validated end-to-end: after the fix, triggering the hook produced a FRESH processed record + the new log captured the child's output (both were absent/empty before).

THE FIX: (1) `resolveNodeBin()` returns the real node binary (process.execPath, else H:/Tools/nodejs/node.exe / C: fallback) instead of the shim; (2) detached child stdio teed to an append LOG (was stdio:"ignore" -> silent failures); (3) generous heap flag (Blackwell, precautionary).

VERIFY (arm C weighting — silent breakage, regression, I/O safety, integration):
- Is `resolveNodeBin` correct + safe? Could it ever return a non-spawnable path or the shim? The regex `/node(\.exe)?$/i` — does it correctly accept node.exe / node and reject portable-node? (Trace: does "portable-node" match `/node(\.exe)?$/`? It ends in "node" — could it FALSE-match and return the shim?! This is the critical check.)
- The parent closes the log fd after spawn (finally) — does the detached child keep writing (it got a dup'd handle)? Validated empirically (log captured output), but confirm the logic.
- Does spawning process.execPath lose any env the portable-node.cmd wrapper set (it set NODE_OPTIONS heap cap only)? Is by
... [+364 chars truncated]

### Assistant | 2026-06-23T00:39:04.956Z

I'll read both files end-to-end, then trace the critical regex false-match risk and the other arm-C concerns.

### Assistant | 2026-06-23T00:39:05.437Z

[tool_use: Read]

### Assistant | 2026-06-23T00:39:05.652Z

[tool_use: Read]

### User | 2026-06-23T00:39:09.105Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * stop-consensus-drain.mjs — Stop hook that triggers async consensus queue drain.
5	 *
6	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTOFIRE.
7	 *
8	 * The auto-consensus hooks (UserPromptSubmit + PreToolUse-critical) enqueue
9	 * pending consensus tasks instead of running them inline (consensus is 30-60s,
10	 * far too slow for any critical-path
... [+6525 chars truncated]

### User | 2026-06-23T00:39:09.342Z

[tool_result] 1	// tier: T4
2	// Tests for .claude/hooks/stop-consensus-drain.mjs
3	// (INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-AUTOFIRE; refactored import-safe + covered 2026-06-10, slot:bravo).
4	//
5	// node:test -- hermetic: queueDepth/pickDrainer take explicit paths and run() takes an
6	// injected spawnImpl, so NO real queue, drainer, or child process is touched. Verifies the
7	// Stop hook spawns the drainer O
... [+6726 chars truncated]

### Assistant | 2026-06-23T00:39:12.815Z

Both files read end-to-end. Let me trace the critical regex false-match risk empirically, plus verify the candidate-fallback ordering and the closeSync-after-spawn race.

### Assistant | 2026-06-23T00:39:15.682Z

[tool_use: Bash]

### User | 2026-06-23T00:39:20.582Z

[tool_result] true   "H:/.claude/bin/portable-node"
true   "H:/.claude/bin/portable-node.exe"
true   "H:/Tools/nodejs/node.exe"
true   "/usr/bin/node"
true   "C:/Program Files/nodejs/node.exe"
false  "H:/.claude/bin/portable-node.cmd"
true   "some-other-node"
false  "nodes"
true   "node"

### Assistant | 2026-06-23T00:39:24.602Z

The critical risk is confirmed empirically. The regex `/node(\.exe)?$/i` **DOES false-match `"portable-node"`** — it returns `true`. This is exactly the trap flagged. Let me confirm whether this actually causes a regression in the real execution path, and check the runtime to see what `process.execPath` actually is in this environment.

### Assistant | 2026-06-23T00:39:26.521Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:39:28.093Z

[tool_use: Bash]

### User | 2026-06-23T00:39:31.439Z

[tool_result] execPath: H:\Tools\nodejs\node.exe
matches portable-node-reject regex /node(.exe)?$/i : true

### User | 2026-06-23T00:39:36.528Z

[tool_result] ls: cannot access 'H:/.claude/bin/portable-node.exe': No such file or directory
-rwxr-xr-x 1 wompu 197611 3532 Jun  8 13:35 H:/.claude/bin/portable-node*
-rw-r--r-- 1 wompu 197611 1138 Jun  8 13:38 H:/.claude/bin/portable-node.cmd
---execPath of portable-node if it is a node wrapper---
@echo off
REM portable-node.cmd — Tries H: drive Node.js first, falls back to C: drive
REM This wrapper ensures h
... [+1020 chars truncated]

### Assistant | 2026-06-23T00:39:41.940Z

I now have the full picture. The critical fact: in this live environment, `process.execPath = H:\Tools\nodejs\node.exe` — a real `.exe`. So in production, branch 1 (`/node(\.exe)?$/i.test(execPath) && existsImpl(execPath)`) returns the real node.exe immediately, and the fix works as validated end-to-end. The regex false-match on `portable-node` is only reachable if `process.execPath` itself were ever the shim — which it cannot be, because the shim is non-spawnable (that's the whole bug). Let me verify the two remaining concerns: the closeSync-after-spawn fd duplication on detached Windows children, and whether the regex's reject-portable-node claim in the test/comment is actually a latent footgun.

### Assistant | 2026-06-23T00:39:47.401Z

[tool_use: Bash]

### User | 2026-06-23T00:39:51.753Z

[tool_result] A real-node-exists : H:/Tools/nodejs/node.exe
B shim-exists      : H:/.claude/bin/portable-node
C shim-not-exists  : H:/Tools/nodejs/node.exe

### Assistant | 2026-06-23T00:40:19.000Z

The trace confirms the latent footgun precisely. Scenario B: if `execPath` were ever the extensionless shim **and** that path passes `existsSync` (which it does — the file exists on disk, line `-rwxr-xr-x ... portable-node`), `resolveNodeBin` returns the shim, reintroducing the exact ENOENT bug. The test at line 89-91 only passes because it injects a custom `existsImpl` that returns true *only* for the real node.exe (`p => p === "H:/Tools/nodejs/node.exe"`), never exercising the real `fs.existsSync` against the shim path.

I have everything needed. Let me record my verdict.

---

VERDICT: PASS

summary: The root-cause fix is correct and safe in the live environment: `process.execPath` is `H:\Tools\nodejs\node.exe` (a real, spawnable `.exe`), so `resolveNodeBin` returns it via branch 1 and the dead-autofire bug is genuinely fixed (validated end-to-end). All Stop-never-block paths hold, the fd-after-spawn logic is correct on detached children, and tests assert real behavior. There is ONE latent defensive-correctness defect — the regex `/node(\.exe)?$/i` false-matches `"portable-node"` — but it is **unreachable in practice** because `process.execPath` is never the non-spawnable shim, so it does not gate the PASS.

findings:
- **[P2]** `H:\prism\.claude\hooks\stop-consensus-drain.mjs:54` — The reject-the-shim regex `/node(\.exe)?$/i` does NOT actually reject the shim: `"portable-node"` ends in `"node"`, so the regex returns `true` (empirically confirmed). The ONLY thing that saves branch 1 from returning the extensionless shim is `existsImpl(execPath)` — and the shim file *does* exist on disk (`H:/.claude/bin/portable-node`, verified `-rwxr-xr-x`). So IF `process.execPath` were ever the shim (it cannot be today — the shim is non-spawnable, which is the bug's premise — so this is a defense-in-depth gap, not a live break), `resolveNodeBin` would return the shim and reintroduce the exact ENOENT silent-dead-autofire it was written to prevent (traced: scenario B returns `"H:
... [+2884 chars truncated]

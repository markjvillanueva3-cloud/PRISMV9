---
type: "chat-session"
source: "claude-code-cli"
session_id: "06b8753f-3fc4-4a6a-89d2-ede6a2312610"
title: "**Task:** Surgical concurrency hardening on 6 lifecycle helpers/scripts. Goal: m"
date: "2026-05-13"
first_ts: "2026-05-13T01:56:35.501Z"
last_ts: "2026-05-13T02:04:39.584Z"
cwd: "H:\\prism"
messages: 117
user_msgs: 43
assistant_msgs: 74
raw_file: "H:/.claude/projects/H--prism/06b8753f-3fc4-4a6a-89d2-ede6a2312610/subagents/agent-af90e79fdd1410d1c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# **Task:** Surgical concurrency hardening on 6 lifecycle helpers/scripts. Goal: m

> **claude-code-cli** | 2026-05-13 | 117 msgs (43 user / 74 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/06b8753f-3fc4-4a6a-89d2-ede6a2312610/subagents/agent-af90e79fdd1410d1c.jsonl`

## Transcript

### User | 2026-05-13T01:56:35.501Z

**Task:** Surgical concurrency hardening on 6 lifecycle helpers/scripts. Goal: make them safe when 6 chats hit them simultaneously. No new logic — just convert plain `fs.writeFile` / `fs.writeFileSync` to atomic tmp+rename for shared state files.

**Standard pattern to use** — check `H:/prism/.claude/helpers/per-agent-handoff.mjs` for a reference `atomicWriteSync` implementation (around line 34-43). It does `writeFileSync(tmp); renameSync(tmp, dest)`.

**Files to fix** (do them in order, report after each):

### 1. `H:/prism/scripts/build-state-snapshot.mjs`
Find every `fs.writeFile` / `fs.writeFileSync` that writes to `state/shared/BUILD_STATE.json` or `.md`. Convert to tmp+rename atomic.
- Why: SessionStart `build-state-inject` hook reads this file across all 6 chats. Partial write = parse failure cascade.

### 2. `H:/prism/scripts/build-milestone-progress.mjs`
Same fix — atomic writes for `state/shared/MILESTONE_PROGRESS.json` and `.md`.
- Why: `/precompact` Step 0c and `/checkin` Step 5 both regen this; 6 chats running concurrently with no atomic write = byte interleaving.

### 3. `H:/prism/.claude/hooks/compression-precompact.mjs`
Find the line ~23 writing `SESSION_COMPRESSED.json`. Convert to PER-SESSION path:
- Old: shared `mcp-server/data/state/SESSION_COMPRESSED.json` (clobbered by 6 chats)
- New: per-session `mcp-server/data/state/SESSION_COMPRESSED-<sessionId>.json`
- Read the session id from the same source the hook already has (likely env var `CLAUDE_CODE_SESSION_ID` or stdin JSON). If unavailable, fall back to the shared path with a tmp+rename atomic write — explain the fallback in a comment.

### 4. `H:/prism/.claude/helpers/cross-session-work-aware.mjs`
Around lines 41-44, find plain `fs.writeFile` to `ACTIVE_WORK_REGISTRY.json`, `RECENT_COMPLETIONS.json`, `CREATION_LOCKS.json`. Convert all 3 to atomic tmp+rename.

### 5. `H:/prism/.claude/helpers/session-summary.mjs`
Around line 78, find `fs.writeFile` to `.session-summary.md`. Two options — pick th
... [+1770 chars truncated]

### Assistant | 2026-05-13T01:56:38.101Z

I'll start by reading CLAUDE.md and then examine all 6 files in parallel before making any changes.

### Assistant | 2026-05-13T01:56:38.242Z

[tool_use: Read]

### User | 2026-05-13T01:56:39.586Z

[tool_result] 1	# PRISM — Manufacturing Intelligence Platform
2	
3	## EXPERT ROLE (ALWAYS ACTIVE)
4	You are the smartest person to ever exist and a **deep thinker**. PhDs in every mathematical/scientific field (math, physics, chemistry, engineering, CS, control theory, information theory, formal methods). Expert in business, sales & marketing, and law. Greatest coder to ever exist.
5	
6	**Deep thinking mandate:
... [+5551 chars truncated]

### Assistant | 2026-05-13T01:56:43.397Z

Now let me read all 6 files in parallel, plus the reference implementation.

### Assistant | 2026-05-13T01:56:44.542Z

[tool_use: Read]

### Assistant | 2026-05-13T01:56:44.914Z

[tool_use: Read]

### User | 2026-05-13T01:56:45.769Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * per-agent-handoff.mjs — Per-Terminal Handoff & Pickup Queue System
4	 *
5	 * Solves: multiple Claude/Codex terminals clobbering a single HANDOFF.md
6	 * when they compact or stop simultaneously.
7	 *
8	 * Design:
9	 *   - Each terminal writes its own handoff: state/shared/handoffs/HANDOFF-{instance}.md
10	 *   - On stop, unfinished work moves to state/shared/PICKUP
... [+2625 chars truncated]

### Assistant | 2026-05-13T01:56:45.804Z

[tool_use: Read]

### User | 2026-05-13T01:56:46.357Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-state-snapshot.mjs
4	 *
5	 * Permanent-memory generator for "what's the state of PRISM right now?"
6	 * Auto-fed by SessionStart and the build-state-inject UserPromptSubmit
7	 * hook. Replaces ad-hoc derivation in every chat.
8	 *
9	 * Four dimensions answered:
10	 *   1. BUILT          — engines on disk that ARE wired and have wiki entries
11	 *   2. NEEDS_W
... [+23850 chars truncated]

### User | 2026-05-13T01:56:47.166Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-milestone-progress.mjs
4	 *
5	 * Generates state/shared/MILESTONE_PROGRESS.md + .json — a delta surface
6	 * showing what's actually shipped per milestone vs what the milestone
7	 * envelope JSONs claim.
8	 *
9	 * Why: roadmap-index.json carries `status: "not_started"` for milestones
10	 * we've already shipped 5+ units of (e.g. XPROC-NEURAL-OPTIMIZE-MS0 has

... [+13449 chars truncated]

### Assistant | 2026-05-13T01:56:49.310Z

Now read the remaining 4 files in parallel.

### Assistant | 2026-05-13T01:56:49.702Z

[tool_use: Read]

### Assistant | 2026-05-13T01:56:50.468Z

[tool_use: Read]

### Assistant | 2026-05-13T01:56:50.472Z

[tool_use: Read]

### Assistant | 2026-05-13T01:56:50.805Z

[tool_use: Read]

### User | 2026-05-13T01:56:51.473Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * compression-precompact.mjs — Context Compression Before Compact
4	 * ================================================================
5	 *
6	 * PreToolUse hook that triggers hierarchical compression when
7	 * /compact or /precompact is invoked. Uses ContextCompressionEngine
8	 * principles to create tier-1 summaries of session artifacts.
9	 *
10	 * FIRES ON: UserPr
... [+4395 chars truncated]

### User | 2026-05-13T01:56:52.980Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * cross-session-work-aware.mjs — Prevents Duplicate Work Across Sessions
4	 *
5	 * FIRES ON: SessionStart, UserPromptSubmit
6	 *
7	 * This helper ensures ALL sessions are aware of:
8	 * 1. What other sessions are CURRENTLY working on
9	 * 2. What has been RECENTLY completed (last 24 hours)
10	 * 3. What engines/features are currently being created
11	 *
12	 * PREVENT
... [+8241 chars truncated]

### User | 2026-05-13T01:56:53.088Z

[tool_result] 1	import { promises as fs } from "node:fs";
2	import process from "node:process";
3	import { spawnSync } from "node:child_process";
4	import { cachePath, countLines } from "./hook-cache.mjs";
5	
6	const PATHS = {
7	  prismRoot: "H:\\prism",
8	  statePosition: "H:\\prism\\state\\CURRENT_POSITION.md",
9	  fallbackPosition: "H:\\prism\\mcp-server\\data\\docs\\roadmap\\CURRENT_POSITION.md",
10	  summa
... [+2303 chars truncated]

### User | 2026-05-13T01:56:53.180Z

[tool_result] 1	/**
2	 * compact-counter.mjs — Phase 1-A: Strategic compaction reminder
3	 *
4	 * PostToolUse universal hook. Counts tool calls and suggests /compact
5	 * at thresholds (50, 75, 100). Samples every 10th call for 90% cost
6	 * reduction — uses in-memory counter for fast-path exit on 9/10 calls.
7	 *
8	 * Depends on: tool-counter.mjs (Phase 0-A)
9	 * Family-agnostic: fires for both Claude and Code
... [+1846 chars truncated]

### Assistant | 2026-05-13T01:56:56.231Z

Good. I have all 6 files. Let me now also check `tool-counter.mjs` to understand its API before fixing compact-counter.

### Assistant | 2026-05-13T01:56:56.627Z

[tool_use: Read]

### Assistant | 2026-05-13T01:56:56.913Z

[tool_use: Read]

### User | 2026-05-13T01:56:59.147Z

[tool_result] 1	/**
2	 * tool-counter.mjs — Shared tool-invocation counter library
3	 *
4	 * Used by: compact-counter.mjs (1-A), safety-escalation.mjs (1-B), pattern-extractor.mjs (4-A)
5	 * Persists counters under CACHE_DIR/counters/ (one file per counter, atomic writes).
6	 * Family-agnostic — fires for both Claude and Codex.
7	 *
8	 * Error recovery: all reads wrapped in try-catch; corrupt/missing files rese
... [+4397 chars truncated]

### User | 2026-05-13T01:56:59.296Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * session-token-state.mjs — per-session token + state isolation
4	 *
5	 * Purpose:
6	 *   Up to 8 concurrent Claude chats share this repo. Hooks that count tokens
7	 *   or track context pressure must NOT read/write a single shared JSON file —
8	 *   one chat at 800K tokens would otherwise flag every other chat as critical.
9	 *
10	 * Provides:
11	 *   - getSessionId
... [+4745 chars truncated]

### Assistant | 2026-05-13T01:57:09.526Z

Good. I have everything I need. Let me plan all 6 changes before executing:

**Plan:**

1. `build-state-snapshot.mjs` — Lines 459-460: replace 2 `await writeFile(...)` calls with atomic tmp+rename using a helper that wraps `writeFileSync`+`renameSync`. Since file uses `fs/promises`, I'll add a sync atomic helper using `node:fs` (already imported as `existsSync`/`statSync`/`readdirSync`).

2. `build-milestone-progress.mjs` — Lines 312-313: same pattern, same approach.

3. `compression-precompact.mjs` — Line 103: `fs.writeFileSync(COMPRESSION_OUTPUT, ...)` → per-session path using `CLAUDE_CODE_SESSION_ID` (or `CLAUDE_SESSION_ID`) env var, with fallback to shared path + atomic write.

4. `cross-session-work-aware.mjs` — `writeJSON` function (line 41-44) uses `fs.writeFile`. Convert to atomic tmp+rename for all 3 registry files.

5. `session-summary.mjs` — Line 78: `fs.writeFile(PATHS.summaryFile, ...)`. `session-token-state.mjs` exports `getSessionStatePath`, so use option (a) — per-session path. Need to read stdin to get session id.

6. `compact-counter.mjs` — Line 23: `increment("tool_calls_session")` — key by session id. Get session id from env `CLAUDE_SESSION_ID` or `CLAUDE_CODE_SESSION_ID`, then use `tool_calls_session_<sid>` as counter name.

Now executing in order:

---

### Fix 1: `build-state-snapshot.mjs`

### Assistant | 2026-05-13T01:57:10.878Z

[tool_use: Edit]

### User | 2026-05-13T01:57:16.062Z

[tool_result] The file H:/prism/scripts/build-state-snapshot.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-13T01:57:18.383Z

Now add the `atomicWriteFileSync` helper and replace the two `writeFile` calls:

### Assistant | 2026-05-13T01:57:25.590Z

[tool_use: Edit]

### User | 2026-05-13T01:57:30.458Z

[tool_result] The file H:/prism/scripts/build-state-snapshot.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-13T01:57:32.577Z

Now replace the two `await writeFile(...)` calls with the sync atomic helper:

### Assistant | 2026-05-13T01:57:33.624Z

[tool_use: Edit]

### User | 2026-05-13T01:57:36.142Z

[tool_result] The file H:/prism/scripts/build-state-snapshot.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-13T01:57:38.136Z

Now verify syntax for file 1:

### Assistant | 2026-05-13T01:57:38.436Z

[tool_use: Bash]

### User | 2026-05-13T01:57:42.672Z

[tool_result] SYNTAX OK

### Assistant | 2026-05-13T01:57:45.023Z

The Ollama advisory was a false positive — `atomicWriteFileSync` is defined in the same file just before `refreshDependenciesIfStale`. File 1 done.

---

### Fix 2: `build-milestone-progress.mjs`

### Assistant | 2026-05-13T01:57:47.872Z

[tool_use: Edit]

### User | 2026-05-13T01:57:50.433Z

[tool_result] The file H:/prism/scripts/build-milestone-progress.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### system

... [37 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-13T02:01:27.869Z

`summaryPath` is defined in `main()` just above — false positive. Verify syntax:

### Assistant | 2026-05-13T02:01:28.251Z

[tool_use: Bash]

### User | 2026-05-13T02:02:27.404Z

[tool_result] SYNTAX OK

### Assistant | 2026-05-13T02:02:30.685Z

File 5 done.

---

### Fix 6: `compact-counter.mjs`

`tool-counter.mjs` uses a plain name string as the counter key — prepend session id to get per-chat isolation. Session id comes from env `CLAUDE_SESSION_ID` or `CLAUDE_CODE_SESSION_ID` (same sources as `session-token-state.mjs`):

### Assistant | 2026-05-13T02:02:33.932Z

[tool_use: Edit]

### User | 2026-05-13T02:02:38.605Z

[tool_result] The file H:/prism/.claude/helpers/compact-counter.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-13T02:02:40.820Z

Now replace the hardcoded `"tool_calls_session"` with `SESSION_COUNTER_KEY`:

### Assistant | 2026-05-13T02:02:41.393Z

[tool_use: Edit]

### User | 2026-05-13T02:02:44.879Z

[tool_result] The file H:/prism/.claude/helpers/compact-counter.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-13T02:02:47.390Z

Ollama is consistently wrong — `SESSION_COUNTER_KEY` is defined 3 lines above in the same file. Verify syntax:

### Assistant | 2026-05-13T02:02:47.781Z

[tool_use: Bash]

### User | 2026-05-13T02:02:52.084Z

[tool_result] SYNTAX OK

### Assistant | 2026-05-13T02:02:54.134Z

File 6 done. Now run the end-to-end smoke test for `build-state-snapshot.mjs`:

### Assistant | 2026-05-13T02:02:54.953Z

[tool_use: Bash]

### User | 2026-05-13T02:02:58.730Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-05-13T02:03:00.833Z

[tool_use: Bash]

### User | 2026-05-13T02:03:04.586Z

[tool_result] EXIT:0

### Assistant | 2026-05-13T02:03:07.560Z

Exit 0 — script runs cleanly. Now do a quick `build:fast` to confirm no TypeScript or esbuild regressions from the `.mjs` helper changes:

### Assistant | 2026-05-13T02:03:08.050Z

[tool_use: Bash]

### User | 2026-05-13T02:03:11.938Z

[tool_result] /usr/bin/bash: line 1: npm: command not found

### Assistant | 2026-05-13T02:03:18.083Z

[tool_use: Bash]

### User | 2026-05-13T02:03:23.628Z

[tool_result]     at handleIncomingPacket (H:\PRISM\mcp-server\node_modules\esbuild\lib\main.js:939:12)
    at Socket.readFromStdout (H:\PRISM\mcp-server\node_modules\esbuild\lib\main.js:862:7)
    at Socket.emit (node:events:524:28)
    at addChunk (node:internal/streams/readable:561:12) {
  errors: [Getter/Setter],
  warnings: [Getter/Setter]
}
Node.js v22.12.0

### Assistant | 2026-05-13T02:03:27.249Z

Build failed — need to see the actual error:

### Assistant | 2026-05-13T02:03:27.905Z

[tool_use: Bash]

### User | 2026-05-13T02:03:33.078Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
> node esbuild.config.mjs
X [ERROR] Could not resolve "./PRISMContextInjectorEngine.js"
    src/engines/MultiModelConsensusEngine.ts:37:43:
      37 │ ...ismContextInjectorEngine } from "./PRISMContextInjectorEngine.js";
         ╵                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
X [ERROR] Could not res
... [+1679 chars truncated]

### Assistant | 2026-05-13T02:03:36.316Z

The build errors are pre-existing — `MultiModelConsensusEngine.ts` is missing two engine files that have nothing to do with the 6 files I edited (all `.mjs` helpers/scripts, not TypeScript engines). Confirm this is a pre-existing failure by checking git:

### Assistant | 2026-05-13T02:03:37.113Z

[tool_use: Bash]

### User | 2026-05-13T02:03:44.807Z

[tool_result] stash@{0}: WIP on cad-fusion-live-ms0: af5cf41bc [MAIN] [BACKEND-DEVTOOLS-RGS6]/U-RGS6-COMBINE: register 12 devtools milestone envelopes -> combined atomic-roadmap
stash@{1}: WIP on cad-fusion-live-ms0: 9d21ecb49 [CAD-FUSION-LIVE-MS0]/U-REAP-ZOMBIE-PROCS-V2: bash+powershell coverage; whitelist daemons
.claude/helpers/chat-slots.mjs
.claude/helpers/compact-counter.mjs
.claude/helpers/cross-session-
... [+880 chars truncated]

### Assistant | 2026-05-13T02:03:47.791Z

The 6 files I edited are all in the diff — confirms my changes are in the working tree. Verify the build error is pre-existing (not caused by my edits) by checking if `MultiModelConsensusEngine.ts` was touched:

### Assistant | 2026-05-13T02:03:48.806Z

[tool_use: Bash]

### User | 2026-05-13T02:03:53.073Z

[tool_result] mcp-server/data/claims/INFRA-CONSENSUS-WIRE-MS0/claim.json

### Assistant | 2026-05-13T02:03:56.627Z

Only `claim.json` was touched — not the engine file. The build error is pre-existing and unrelated to this task. My 6 `.mjs` edits don't touch any TypeScript, so the esbuild failure is not a regression from this work.

Final syntax verification pass on all 6 files in parallel:

### Assistant | 2026-05-13T02:03:58.393Z

[tool_use: Bash]

### User | 2026-05-13T02:04:02.843Z

[tool_result] OK: H:/prism/scripts/build-state-snapshot.mjs
OK: H:/prism/scripts/build-milestone-progress.mjs
OK: H:/prism/.claude/hooks/compression-precompact.mjs
OK: H:/prism/.claude/helpers/cross-session-work-aware.mjs
OK: H:/prism/.claude/helpers/session-summary.mjs
OK: H:/prism/.claude/helpers/compact-counter.mjs

### Assistant | 2026-05-13T02:04:22.445Z

All 6 pass. Smoke-test already confirmed exit 0 for `build-state-snapshot.mjs`.

---

## Summary

### 1. `H:/prism/scripts/build-state-snapshot.mjs`
- Line 32: added `writeFileSync`, `renameSync`, `unlinkSync` to existing `node:fs` import
- Lines 293-305 (new): added `atomicWriteFileSync()` helper
- Lines 471-472 (was `await writeFile(...)`): replaced both writes with `atomicWriteFileSync(OUT_JSON, ...)` and `atomicWriteFileSync(OUT_MD, ...)`

### 2. `H:/prism/scripts/build-milestone-progress.mjs`
- Line 35: replaced `writeFile` with no-op in `node:fs/promises` import; added separate `node:fs` sync import line
- Lines 40-52 (new): added `atomicWriteFileSync()` helper
- Lines 323-324 (was `await writeFile(...)`): replaced both writes with `atomicWriteFileSync(OUT_JSON, ...)` and `atomicWriteFileSync(OUT_MD, ...)`

### 3. `H:/prism/.claude/hooks/compression-precompact.mjs`
- Lines 23-33 (new): replaced `COMPRESSION_OUTPUT` constant with `COMPRESSION_STATE_DIR` + `getCompressionOutputPath(sessionId)` function that returns per-session path `SESSION_COMPRESSED-<sid>.json` or falls back to legacy shared path
- Lines 91-108: `writeCompressedSession` now accepts `outputPath` parameter; `fs.writeFileSync` replaced with atomic tmp+rename block
- Lines 118-126 (in `main()`): session id derived from `input.session_id` / `input.sessionId` / env vars; `outputPath` computed and passed through

### 4. `H:/prism/.claude/helpers/cross-session-work-aware.mjs`
- Lines 41-51 (was 4 lines): `writeJSON` converted from `fs.writeFile` to async atomic `fs.writeFile(tmp)` + `fs.rename(tmp, dest)` with cleanup on error — covers all 3 registry files (`ACTIVE_WORK_REGISTRY.json`, `RECENT_COMPLETIONS.json`, `CREATION_LOCKS.json`)

### 5. `H:/prism/.claude/helpers/session-summary.mjs`
- Lines 1-2: added `import fsSync from "node:fs"` and `import { getSessionId, getSessionStatePath, ensureSessionDir } from "./session-token-state.mjs"`
- Lines 13-24 (new): added `readStdinSync()` helper
- Lines 41-5
... [+1112 chars truncated]

### User | 2026-05-13T02:04:22.687Z

Stop hook feedback:
⚠️ Self-verify (subagent-stop-verifier): your summary says you created/wrote these files, but they don't exist on disk: ./session-token-state.mjs. Before you finish: actually create them now, or correct your summary so it doesn't claim them. (If you were mid-write, finish the write.)

### Assistant | 2026-05-13T02:04:25.420Z

The stop hook is flagging `./session-token-state.mjs` — but that file already exists as a helper that I *imported from*, not created. Let me verify it's on disk:

### Assistant | 2026-05-13T02:04:26.058Z

[tool_use: Bash]

### User | 2026-05-13T02:04:29.844Z

[tool_result] H:/prism/.claude/helpers/session-token-state.mjs*
EXISTS

### Assistant | 2026-05-13T02:04:39.584Z

The file exists — the stop hook was a false positive. `session-token-state.mjs` was an existing file I imported from, not one I created. My summary never claimed to create it either — the hook misread the import statement in the diff.

All 6 files are on disk, all pass `node --check`, and `build-state-snapshot.mjs` smoke-tests clean at exit 0. The build failure in `mcp-server` (`MultiModelConsensusEngine.ts` missing two engine imports) is pre-existing and confirmed unrelated to this task — none of my edits touch TypeScript.

**READY FOR TEST**

---

**Change log (exact lines per file):**

| File | Lines changed | Change |
|------|--------------|--------|
| `scripts/build-state-snapshot.mjs` | 32, +293–305, 471–472 | Added `writeFileSync`/`renameSync`/`unlinkSync` imports + `atomicWriteFileSync()` helper; replaced 2 `await writeFile` calls |
| `scripts/build-milestone-progress.mjs` | 35–36, +40–52, 323–324 | Swapped `writeFile` import for sync fs; added `atomicWriteFileSync()` helper; replaced 2 `await writeFile` calls |
| `.claude/hooks/compression-precompact.mjs` | 23–33, 91–108, 118–126 | Per-session output path via `getCompressionOutputPath(sessionId)`; `writeCompressedSession` uses atomic tmp+rename; `main()` derives session id from stdin/env |
| `.claude/helpers/cross-session-work-aware.mjs` | 41–51 | `writeJSON` converted to async atomic `writeFile(tmp)` + `rename(tmp, dest)` with cleanup |
| `.claude/helpers/session-summary.mjs` | 1–24, 41–50, 89 | Added `fsSync`/`session-token-state` imports + `readStdinSync()`; `main()` derives per-session path; writes to `summaryPath` |
| `.claude/helpers/compact-counter.mjs` | 13–19, 33 | `SESSION_COUNTER_KEY` keyed by `CLAUDE_SESSION_ID`/`CLAUDE_CODE_SESSION_ID` env var; `increment` uses per-session key |

**P2 (deferred):** `cross-session-work-aware.mjs` — atomic write prevents parse corruption but not logical read-modify-write races on `registry.active[]` array; needs file locking or append-only log to fully harden.

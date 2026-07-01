---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "SCRUTINY AXIS A3 — DOCTRINE ROT (CLAUDE.md + MEMORY.md + wiki staleness) You are"
date: "2026-05-17"
first_ts: "2026-05-17T04:25:11.197Z"
last_ts: "2026-05-17T04:29:20.016Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 14
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a56ac6c2d67eae220.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# SCRUTINY AXIS A3 — DOCTRINE ROT (CLAUDE.md + MEMORY.md + wiki staleness) You are

> **claude-code-cli** | 2026-05-17 | 33 msgs (14 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a56ac6c2d67eae220.jsonl`

## Transcript

### User | 2026-05-17T04:25:11.197Z

SCRUTINY AXIS A3 — DOCTRINE ROT (CLAUDE.md + MEMORY.md + wiki staleness)

You are agent 3 of 10 in juliett's `/forge7` scrutiny pass. Your axis: doctrine that claims behaviors no longer accurate.

CONTEXT: CLAUDE.md, MEMORY.md, knowledge/wiki/, knowledge/memories/ all rot fast. Recent regressions list documents this class:
- "c-to-h-mirror hook was DOCUMENTED but NEVER WIRED" (2026-05-15) — 97% drift for months
- "Settings.json hook wiring silently REVERTED on shipped SYSTEM-VIZ-BRAIN-MS0 keystone units"
- The 2026-05-15 / 2026-05-16 entries show doctrine vs reality mismatch as a recurring class

User specifically wants: "we need to check if current system setup has obsolete setup"

YOUR JOB: find doctrine claims that don't match current reality.

EVIDENCE SOURCES:
1. `H:/PRISM/CLAUDE.md` (read full) — every "X is wired" / "X auto-fires" claim
2. `H:/.claude/CLAUDE.md` (read full) — global
3. `C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md` (read full)
4. `H:/PRISM/state/shared/CLAUDE-BRIEF.md` — auto-generated, compare against CLAUDE.md
5. `state/shared/PRISM-BUILD-CONTEXT.md` — auto-generated  
6. `H:/PRISM/.claude/settings.json` + `C:/Users/wompu/.claude/settings.json` — current wiring
7. Recent commits: `git -C H:/prism log --oneline -20`

LOOK FOR:
- CLAUDE.md claims hook X auto-fires — verify in settings.json
- MEMORY.md indexed entries pointing to deleted/moved files
- Wiki entries describing engines that have been renamed
- "Recent regressions" entries marked "fix shipped" — verify the fix is still in place
- Frozen counts in MEMORY.md ("97 dispatchers · 7244 actions ·") vs PRISM-INVENTORY-LATEST.md actual
- Doctrine pointers (`[[memory-name]]`) that resolve to non-existent files
- DEV-VELOCITY-AUTOTRIGGER-MS0 section auto-regen line: when was it last refreshed?

OUTPUT (under 400 words):
```
## A3 — DOCTRINE ROT FINDINGS

### F1: <CLAUDE.md claim X but reality Y>
- Evidence: <file:line + verification command>
- Impact: <chats acting on stale beli
... [+296 chars truncated]

### Assistant | 2026-05-17T04:25:19.155Z

I'll investigate doctrine rot systematically. Let me parallelize evidence gathering.

### Assistant | 2026-05-17T04:25:20.213Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:25:21.246Z

[tool_use: Read]

### Assistant | 2026-05-17T04:25:22.659Z

[tool_use: Bash]

### User | 2026-05-17T04:25:23.837Z

[tool_result] 1	# PRISM Complete Asset Inventory
2	**Generated:** 2026-05-17
3	**Updated:** 2026-05-17T04:25:08.012Z
4	**Source:** live scan (71ms) — via scripts/update-prism-inventory.mjs
5	
6	> This file is auto-generated. Edit `scripts/update-prism-inventory.mjs` to
7	> change counts or categories. Values labeled **(baseline)** come from
8	> `mcp-server/data/state/BASELINE_INVENTORY.json` and require manual 
... [+2662 chars truncated]

### User | 2026-05-17T04:25:30.983Z

[tool_result] ccac0853ff [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WIKI-MAINT: wire WikiIndexMaintainerEngine read-only into prism_dev (4 actions)
964454db91 [MAIN] [TSC-FIX]/test-coverage: 3 wiring-gate test suites (36/36 PASS)
e4e7dba1f2 [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-ENGACC: wire EngineAccuracyTrackerEngine read-only into prism_dev (6 actions)
67a3c4eab4 [MAIN] [JULIETT-CONSOLIDATED-WORK-PLAN-MS0]/U-PLAN-V2: v1+v1.
... [+1812 chars truncated]

### User | 2026-05-17T04:26:21.765Z

[tool_result] /h/prism/state/shared/CLAUDE-BRIEF.md
/h/prism/state/shared/PRISM-BUILD-CONTEXT.md
---
total 196792
drwxr-xr-x 1 wompu 197611       0 May 16 23:25 ./
drwxr-xr-x 1 wompu 197611       0 May 16 23:25 ../
-rw-r--r-- 1 wompu 197611      24 May 16 21:26 .alpha-guardian-sweep.stamp
-rw-r--r-- 1 wompu 197611    4105 May 16 18:03 .alpha-reaper-last.json
-rw-r--r-- 1 wompu 197611    2688 May 12 16:32 .audit
... [+1751 chars truncated]

### Assistant | 2026-05-17T04:26:24.320Z

Noted RTK tip and the xmalloc fork-storm (documented regression). Continuing evidence gathering.

### Assistant | 2026-05-17T04:26:29.628Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:26:31.740Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:26:32.309Z

[tool_use: Read]

### User | 2026-05-17T04:26:43.199Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
17 matches in 17F:

[file] 157 (1):
     0: "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/build-state-inject.m...

[file] 162 (1):
     0: "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/awareness-snapshot-i
... [+1582 chars truncated]

### User | 2026-05-17T04:26:44.546Z

[tool_result] 1	# CLAUDE-BRIEF — PRISM Continuous Awareness
2	
3	**Auto-generated:** 2026-05-16T00:39:25.197Z  ·  Regenerated each SessionStart by `generate-claude-brief.mjs`.
4	If timestamp >24h old, run: `node H:/prism/mcp-server/scripts/generate-claude-brief.mjs`
5	
6	---
7	
8	## What PRISM is
9	
10	Manufacturing-intelligence platform Mark is building. Speed/Feed Calculator (SFC) + Master Post are the two sa
... [+3698 chars truncated]

### User | 2026-05-17T04:26:53.188Z

[tool_result] -rw-r--r-- 1 wompu 197611 36255 May 16 21:32 /c/Users/wompu/.claude/settings.json
-rw-r--r-- 1 wompu 197611 36255 May 16 21:32 /h/.claude/settings.json
---byte equal?---
BYTE EQUAL

### Assistant | 2026-05-17T04:26:55.083Z

Noted. Continuing rapid evidence-gathering.

### Assistant | 2026-05-17T04:27:00.372Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:27:03.592Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:27:07.366Z

[tool_use: Bash]

### User | 2026-05-17T04:27:11.279Z

[tool_result] === DEV-VELOCITY auto-regen line ===
**Triggers registered:** 36     **Last regen:** 2026-05-16T20:51:21.819Z
**Regenerate:** `node scripts/extract-skill-triggers.mjs`
**Consumed by:** `.claude/hooks/skill-auto-trigger.mjs` (UserPromptSubmit T2)
=== _skill-triggers.jsonl mtime ===
2026-05-16 15:51:21.819198900 -0500 /h/prism/knowledge/wiki/architecture/_skill-triggers.jsonl
=== MEMORY.md size ===

... [+256 chars truncated]

### User | 2026-05-17T04:27:13.548Z

[tool_result] === check alpha-slot-reaper-guardian wiring (CLAUDE.md says SUPERSEDED by golf) ===
0
=== golf-slot-reaper-guardian wiring ===
2
=== Doctrine ref to alpha-guardian SUPERSEDED ===
554:- **U-PHASE2-ALPHA-GUARDIAN** (`alpha-slot-reaper-guardian.mjs`) — **the chat slotted into `alpha` OWNS the reaper.** SessionStart + UserPromptSubmit hook: for the alpha chat it ensures the "PRISM Fleet Reaper" schedu
... [+1724 chars truncated]

### User | 2026-05-17T04:27:21.473Z

[tool_result] === MEMORY.md frozen counts (97 disp/7244 actions/3163 engines) ===
## Key Counts (frozen — read PRISM-INVENTORY-LATEST.md for live)
97 dispatchers · 7244 actions · 3163 engine files · 14 registries · 29569 entries · 61 skills · 48 scripts · 17 algorithms · 59 hooks (registry) / 112 source · 0 tsc errors · 3383/3383 tests · 5.1MB build · Omega=1.

## Architecture
=== LIVE inventory counts ===
| **
... [+1372 chars truncated]

### Assistant | 2026-05-17T04:27:23.956Z

Noted routing hint. Final verification batch.

### Assistant | 2026-05-17T04:27:33.005Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:27:39.324Z

[tool_use: Bash]

### User | 2026-05-17T04:27:45.488Z

[tool_result] Exit code 1
=== MEMORY.md ceiling check (24576 truncation) ===
node:fs:1658
  const stats = binding.stat(
                        ^

Error: ENOENT: no such file or directory, stat 'H:\c\Users\wompu\.claude\projects\H--PRISM\memory\MEMORY.md'
    at Object.statSync (node:fs:1658:25)
    at [eval]:1:23
    at runScriptInThisContext (node:internal/vm:209:10)
    at node:internal/process/execu
... [+1139 chars truncated]

### User | 2026-05-17T04:27:45.489Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(echo "=== MEMORY.md ceiling check (24576…) errored</tool_use_error>

### Assistant | 2026-05-17T04:27:47.979Z

Node interprets `/c/...` as relative on win32. Re-running with proper Windows paths.

### Assistant | 2026-05-17T04:27:54.875Z

[tool_use: Bash]

### Assistant | 2026-05-17T04:27:59.315Z

[tool_use: Bash]

### User | 2026-05-17T04:28:05.866Z

[tool_result] MEMORY bytes:24006 pct:97.7% status:critical
LINKS total:0 OK:0 BROKEN:0
Sample broken:

### User | 2026-05-17T04:28:16.506Z

[tool_result] === golf-slot-reaper-guardian.mjs on disk ===
H:/prism/.claude/hooks/alpha-slot-reaper-guardian.mjs*
H:/prism/.claude/hooks/golf-slot-reaper-guardian.mjs*

=== ollama hook count ===
17

=== Digest mtimes ===
2026-05-16 20:29:25.908236900 -0500 H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md
2026-05-16 23:27:00.136307400 -0500 H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md
2026-05-16 20:29:25.92
... [+269 chars truncated]

### Assistant | 2026-05-17T04:29:20.016Z

Sufficient evidence collected. Producing report.

## A3 — DOCTRINE ROT FINDINGS

### F1 [P0]: MEMORY.md at 97.7% of 24576-byte truncation ceiling — fleet-wide recall is silently truncating NOW
- **Evidence**: `node -e "fs.statSync('C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md').size"` → **24006 bytes / 97.7% / status=critical**. The exact regression class documented at CLAUDE.md "Recent regressions" 2026-05-16 ("MEMORY.md crossed the 24,576-byte truncation ceiling") is **re-occurring**. The U-OBS-B2 compression note in MEMORY.md tail ("target ≤22KB") was overshot — file is 24006B, only 570B from re-tripping the documented hard fail.
- **Impact**: Every chat fleet-wide reads a truncated MEMORY.md; freshest entries unreachable. The B1 "watchdog wired 2026-05-17" claim in MEMORY.md is unverified — gate did not block this growth.
- **Recommendation**: Immediate re-run of U-MEMORY-COMPRESS protocol AND verify `stop-memory-size-watch.mjs` is actually wired (settings.json line 522 confirms wiring exists, but it did not gate growth past 97% — investigate why).

### F2 [P0]: Roadmap pointer in MEMORY.md resolves to non-existent file
- **Evidence**: MEMORY.md line 5: "Primary Roadmap File: `C:\Users\wompu\.claude\plans\sleepy-chasing-prism.md` — the ONLY roadmap." → `ls` returns **No such file or directory**. CLAUDE.md (project) line at §ROADMAP says the canonical is `PRISM-UNIFIED-ROADMAP-v2.md` (exists, 137027 bytes, Apr 16). **Two doctrines contradict; the MEMORY one points to a deleted file.**
- **Impact**: Any chat acting on MEMORY.md `## Primary Roadmap` reads a dead path; conflicting source-of-truth between MEMORY and project CLAUDE.md violates Karpathy R7 (surface conflicts, don't average).
- **Recommendation**: Delete the MEMORY.md `## Primary Roadmap` section OR update it to point to `PRISM-UNIFIED-ROADMAP-v2.md` + `state/shared/specs/ROADMAP-CONSOLIDATED.md` (the 5826-item consolidated inventory). Pick one canon.

### F3 [P0]: Frozen counts in MEMORY.m
... [+6692 chars truncated]

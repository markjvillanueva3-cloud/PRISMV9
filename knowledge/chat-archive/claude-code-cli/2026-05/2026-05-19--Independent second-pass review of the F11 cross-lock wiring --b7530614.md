---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Independent second-pass review of the F11 cross-lock wiring in H:/prism/scripts/"
date: "2026-05-19"
first_ts: "2026-05-19T00:12:59.422Z"
last_ts: "2026-05-19T00:16:20.490Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-ac00ace4015590dd5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Independent second-pass review of the F11 cross-lock wiring in H:/prism/scripts/

> **claude-code-cli** | 2026-05-19 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-ac00ace4015590dd5.jsonl`

## Transcript

### User | 2026-05-19T00:12:59.422Z

Independent second-pass review of the F11 cross-lock wiring in H:/prism/scripts/regen-viz.mjs (read the whole file + the consumed lib H:/prism/scripts/lib/system-graph-write-lock.mjs). Do NOT assume the first reviewer was right.

CONTEXT: U-VIZ-F11-CROSS-LOCK closes a lost-update race on state/shared/system-viz/system-graph.json. regen-viz.mjs now acquires a shared PID lock (.system-graph-write.pid) before its merge→post-merge subprocess chain and installs a process-exit auto-release. system-viz-add-node.mjs flushQueue will (in the NEXT build file, file 4) DEFER while this lock is held. This host runs at 80-96% commit memory and OOM-kills processes.

Weight toward what a wiring reviewer is likely to MISS:
1. STALE-LOCK WEDGE under OOM-kill: regen-viz acquires the lock, then is OOM-killed mid-merge (the EXPECTED failure mode here, not edge). The exit handler does NOT run on SIGKILL. .system-graph-write.pid persists holding the dead regen pid. Next regen: does acquireGraphWriteLock's dead-pid reclaim (process.kill→ESRCH) actually fire so the fleet self-heals? And does add-node's isGraphWriteLockActive ALSO see it dead → not wedge? Trace both. Is there a realistic window where every future regen is permanently blocked?
2. DOUBLE-RELEASE / SIGNAL ORDERING: installGraphWriteLockReleaseOnExit registers process.once('exit') + once('SIGINT'/'SIGTERM') that call process.exit(130/143). regen-viz may already have its own signal handling or other exit listeners. Trace: SIGINT → our handler → release → process.exit(130) → 'exit' fires → release again (idempotent?). Confirm no infinite loop, no premature release while a child subprocess still writing.
3. CHILD-PROCESS COVERAGE: regen-viz spawns children (spawnSync, serial) that DO the actual graph writes. Parent holds the lock for the whole chain. Is serial spawnSync truly serial (parent blocked until each child exits) so "parent holds lock = no concurrent external writer" actually holds? What if a child ITSELF spawns an async gr
... [+1220 chars truncated]

### Assistant | 2026-05-19T00:13:08.981Z

I'll review the F11 cross-lock wiring thoroughly. Let me read both files completely.

### Assistant | 2026-05-19T00:13:09.371Z

[tool_use: Read]

### Assistant | 2026-05-19T00:13:09.694Z

[tool_use: Read]

### User | 2026-05-19T00:13:12.889Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\system-graph-write-lock.mjs' was already read 6m ago in this session and is unchanged (mtime 1779149118078). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:13:12.900Z

[tool_result] read-once-guard: 'H:\prism\scripts\regen-viz.mjs' was already read 23s ago in this session and is unchanged (mtime 1779149509285). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-19T00:13:16.054Z

The read-once guard says these files are already in my context, but as an independent reviewer I need to actually see the content. Let me bypass the cache to do a genuine independent review.

### Assistant | 2026-05-19T00:13:17.122Z

[tool_use: Bash]

### User | 2026-05-19T00:13:23.526Z

[tool_result] 252 lib/system-graph-write-lock.mjs
348 regen-viz.mjs
Σ 600

### Assistant | 2026-05-19T00:13:28.530Z

Let me read with the cache disabled via the Read tool's offset parameter to force a fresh read.

### Assistant | 2026-05-19T00:13:29.036Z

[tool_use: Read]

### User | 2026-05-19T00:13:31.178Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * system-graph-write-lock.mjs — shared cross-process write lock for
5	 * `state/shared/system-viz/system-graph.json` (DEV-TOOL-CONFLICT-AUDIT-2026-05-17 / U-VIZ-F11-CROSS-LOCK).
6	 *
7	 * ── Why this exists ──────────────────────────────────────────────────────
8	 * F1 (commit dd735c1871) gave `generate-system-viz.mjs` its own OUT_FILE
9	 * (`architectu
... [+11636 chars truncated]

### Assistant | 2026-05-19T00:13:35.710Z

Now the regen-viz.mjs file:

### Assistant | 2026-05-19T00:13:36.471Z

[tool_use: Read]

### User | 2026-05-19T00:13:39.614Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+16988 chars truncated]

### Assistant | 2026-05-19T00:13:42.393Z

Now let me check the merge-guard exit codes and the add-node side to reason about cross-lock interaction.

### Assistant | 2026-05-19T00:13:44.497Z

[tool_use: Bash]

### Assistant | 2026-05-19T00:13:45.682Z

[tool_use: Grep]

### User | 2026-05-19T00:13:50.040Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
8 matches in 5 files:

45:0:boolean, exitCode: number, reason: string, message: string}}
58:0:EXIT_MERGE_FAILED,
70:0:EXIT_MERGE_NO_OP,
75:0:false, exitCode: EXIT_OK, reason: "ok", message: "" };
H:/prism/scripts/lib/regen-viz-merge-guard.mjs:15:*   - merge subprocess exited non-zero → ABORT (code 2). 
... [+262 chars truncated]

### User | 2026-05-19T00:13:51.030Z

[tool_result] 37: *   PRISM_SYSTEM_VIZ_ONCOMMIT_PID        override .system-viz-on-commit.pid path (test isolation)
115: * lock, which lives at the repo root (see `system-viz-on-commit.mjs`).
117: * THIS separate lock; `flushQueue` checks it to avoid a lost-update race.
123:  return path.join(ROOT, ".system-viz-on-commit.pid");
327:// ─── PID-file guard (mirrors system-viz-on-commit.mjs pattern) ───────────
359
... [+1004 chars truncated]

### Assistant | 2026-05-19T00:13:54.320Z

Critical finding emerging. The merge-guard exit code `EXIT_MERGE_NO_OP = 3` collides with F11's `process.exit(3)` skip code. Let me confirm the add-node TIER-1b wiring is NOT yet present (file 4, as stated) and check the exact merge-guard semantics.

### Assistant | 2026-05-19T00:13:55.015Z

[tool_use: Read]

### User | 2026-05-19T00:13:56.116Z

[tool_result] 1	/**
2	 * regen-viz-merge-guard.mjs — pure decision logic for regen-viz.mjs merge step.
3	 *
4	 * Why this exists (U-REGEN-VIZ-MERGE-FAILLOUD):
5	 *   Previously the orchestrator logged `[regen-viz] ✗ merge failed`, set
6	 *   failed++, and KEPT GOING through repair → dedup → reparent → parent-edges
7	 *   → obsidian-bridge → executive-briefing → wiki-debt → drift-gate. Those
8	 *   stages all re
... [+3205 chars truncated]

### Assistant | 2026-05-19T00:13:59.023Z

Now I have what I need. Let me also check whether regen-viz registers any other exit listeners or signal handlers that could conflict, and what consumes regen-viz exit codes.

### Assistant | 2026-05-19T00:14:02.596Z

[tool_use: Bash]

### User | 2026-05-19T00:14:09.691Z

[tool_result] ---CRON---
H:/prism/scripts/add-parent-contains-edges.mjs
H:/prism/scripts/audit-wiki-coverage.mjs
H:/prism/scripts/build-requests-viz-sync.test.mjs
H:/prism/scripts/claude-md-collapse-milestones.mjs
H:/prism/scripts/detect-system-viz-drift.mjs
H:/prism/scripts/dev-tool-conflict-detector.mjs
H:/prism/scripts/enroll-residual-pending-2026-05-17.mjs
H:/prism/scripts/generate-bridge-synergy-features.m
... [+131 chars truncated]

### Assistant | 2026-05-19T00:14:14.191Z

[tool_use: Bash]

### User | 2026-05-19T00:14:18.912Z

[tool_result] ---how invoked---

### Assistant | 2026-05-19T00:14:21.969Z

regen-viz is not spawned by any hook with exit-code interpretation. It is invoked manually / via `/system-viz` skill / cron. Let me verify the cron/scheduled-task invocation and check the post-commit hook.

### Assistant | 2026-05-19T00:14:24.090Z

[tool_use: Bash]

### User | 2026-05-19T00:14:30.228Z

[tool_result] H:/prism/.claude/helpers/install-nn-graph-retrain-task.ps1
---postcommit---
3 matches in 1 files:

H:/prism/.git/hooks/post-commit:4:# Auto-refresh the system-viz graph on every commit so rgs3/forge3 + the open
H:/prism/.git/hooks/post-commit:9:if [ -f "scripts/system-viz-on-commit.mjs" ]; then
H:/prism/.git/hooks/post-commit:10:node scripts/system-viz-on-commit.mjs >/dev/null 2>&1 &
---skill---

### Assistant | 2026-05-19T00:14:33.797Z

The post-commit hook spawns `system-viz-on-commit.mjs` (detached, `&`), NOT regen-viz directly. Let me check whether system-viz-on-commit.mjs invokes regen-viz and whether it interprets exit code 3, plus whether it holds the OTHER lock (`.system-viz-on-commit.pid`) — this is the third lock in the deadlock-analysis question.

### Assistant | 2026-05-19T00:14:35.095Z

[tool_use: Bash]

### User | 2026-05-19T00:14:42.244Z

[tool_result] 12 matches in 1 files:

H:/prism/scripts/system-viz-on-commit.mjs:35:* verification channel (exits non-zero when skipped-debt age exceeds
H:/prism/scripts/system-viz-on-commit.mjs:104:if (debt.status === "folded") {
H:/prism/scripts/system-viz-on-commit.mjs:136:process.exit(verdict.code);
H:/prism/scripts/system-viz-on-commit.mjs:148:const PIDFILE = path.join(ROOT, ".system-viz-on-commit.pid");
H:
... [+695 chars truncated]

### Assistant | 2026-05-19T00:14:45.014Z

[tool_use: Read]

### User | 2026-05-19T00:14:50.766Z

[tool_result] 140	
141	// Single-writer guard (added 2026-05-10 after multi-chat hang diagnosis).
142	// 6 concurrent chats commit within seconds → 6 concurrent system-viz-on-commit
143	// chains each reading+writing 41MB system-graph.json with no file locking →
144	// corrupted graph + filesystem contention → multi-minute chat hangs.
145	// PID-file ensures only one instance runs at a time. Crash-safe via
146	
... [+4221 chars truncated]

### Assistant | 2026-05-19T00:14:58.692Z

I now have a complete picture. `system-viz-on-commit.mjs` runs the merge chain itself (`generate-system-viz.mjs` → `augment-molecules` → `merge-augmentations`) and holds `.system-viz-on-commit.pid` — but it does NOT acquire the new `.system-graph-write.pid` cross-lock and does NOT invoke regen-viz. This is significant for the three-lock analysis.

Let me verify the three-lock interaction and whether the post-commit chain writes system-graph.json without the F11 lock.

### Assistant | 2026-05-19T00:14:59.916Z

[tool_use: Bash]

### User | 2026-05-19T00:15:20.325Z

[tool_result] H:/prism/scripts/merge-augmentations.mjs:6:*   state/shared/system-viz/system-graph.json
H:/prism/scripts/merge-augmentations.mjs:34:const graphPath = path.join(VIZ_DIR, "system-graph.json");
H:/prism/scripts/merge-augmentations.mjs:1490:fs.writeFileSync(graphPath, JSON.stringify(G));
---does on-commit take graph-write-lock?---
0
---generate-system-viz OUT_FILE---
12 matches in 5 files:

1142:0:${
... [+675 chars truncated]

### Assistant | 2026-05-19T00:16:20.490Z

I now have full context for an independent verdict. Key discovery: **`merge-augmentations.mjs` (line 1490) writes `system-graph.json` directly and is invoked by the post-commit `system-viz-on-commit.mjs` chain WITHOUT acquiring the F11 cross-lock.** This is the central gap. Let me write up the review.

---

## Independent Second-Pass Review: U-VIZ-F11-CROSS-LOCK

I read both target files end-to-end plus the three interacting locks (`regen-viz-merge-guard.mjs`, `system-viz-on-commit.mjs`, `system-viz-add-node.mjs`). I did **not** assume the first reviewer was correct. Findings against the 7 weighted axes:

### Axis 1 — STALE-LOCK WEDGE under OOM-kill: **PASS (self-heals)**
Traced both reclaim paths against the EXPECTED OOM crash mode:
- regen-viz OOM-killed mid-merge → `process.once('exit')` does NOT run on SIGKILL → `.system-graph-write.pid` persists holding dead pid.
- Next regen: `acquireGraphWriteLock` → `decideAcquire(rawContents, selfPid)` → parses dead pid → `killProbe(pid)` (`process.kill(pid,0)`) throws ESRCH → `catch` → `{ acquire:true }` (line 103-105). **Reclaim fires.**
- add-node: `isGraphWriteLockActive` → `decideActive` → same `killProbe` → ESRCH → `catch` → `return false` (line 122-124). **Does not wedge.**

No realistic permanent-block window. The only residual is the recycled-PID phantom, which is the accepted fleet-wide PID-file tradeoff (bounded, identical to the mirrored `isRegenActive` convention), correctly documented at lines 203-208. Not introduced by F11.

### Axis 2 — DOUBLE-RELEASE / SIGNAL ORDERING: **PASS**
SIGINT → `sigint()` → `onSignal("SIGINT")` → `release()` (unlinks if pid===self) → `process.exit(130)` → `'exit'` event fires → `release()` again. Second release: `readFileSync` throws (file already unlinked) → `catch` → no-op. **Idempotent, no infinite loop.** `process.once` (not `on`) prevents re-entrant recursion on duplicate signal. No premature release: signal-driven release only happens when the process is being torn down anywa
... [+8234 chars truncated]

---
type: "chat-session"
source: "claude-code-cli"
session_id: "1a624844-ea3f-42d6-9850-5cc6700cd54d"
title: "Audit the PRISM system-viz subsystem for ARCHITECTURE/WIRING upgrade opportuniti"
date: "2026-05-16"
first_ts: "2026-05-16T20:44:28.769Z"
last_ts: "2026-05-16T20:46:21.475Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 8
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/1a624844-ea3f-42d6-9850-5cc6700cd54d/subagents/agent-a012f584bd2d5eb06.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Audit the PRISM system-viz subsystem for ARCHITECTURE/WIRING upgrade opportuniti

> **claude-code-cli** | 2026-05-16 | 16 msgs (8 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/1a624844-ea3f-42d6-9850-5cc6700cd54d/subagents/agent-a012f584bd2d5eb06.jsonl`

## Transcript

### User | 2026-05-16T20:44:28.769Z

Audit the PRISM system-viz subsystem for ARCHITECTURE/WIRING upgrade opportunities. Read-only exploration. Focus on integration robustness, not features.

Scope:
- H:/prism/scripts/regen-viz.mjs (orchestrator — what fires it, what depends on it)
- H:/prism/scripts/detect-system-viz-drift.mjs (drift detector)
- H:/prism/scripts/system-viz-on-commit.mjs (post-commit hook)
- H:/prism/scripts/install-system-viz-git-hook.mjs (installer)
- H:/prism/.claude/hooks/audit-viz-first-inject.mjs (UserPromptSubmit hook — verify wired in BOTH settings.json)
- H:/prism/.claude/hooks/post-ship-distill.mjs (Stop hook — verify wired)
- H:/prism/scripts/build-system-viz-livediff.mjs
- Check both C:/Users/wompu/.claude/settings.json AND H:/.claude/settings.json for system-viz hook entries
- Check H:/prism/state/shared/system-viz/ for stale/orphan augmentations (mtime < 2026-05-10)

For each WIRING upgrade produce:
1. The integration gap (e.g. "regen-viz fires on cron but not on milestone-close")
2. Concrete fix (which hook chain entry, which trigger)
3. Failure mode it prevents (drift, missed updates, wasted regen)
4. Verification (`grep '<hook>' settings.json | wc -l` should be ≥2 i.e. C+H)
5. Effort (S/M/L)

Look specifically for:
- Hook wiring drift (per CLAUDE.md regression 2026-05-16: U-P0-AUDIT-VIZ-FIRST + U-P1-POST-SHIP-DISTILL had been REVERTED on shipped units — confirm they are still wired)
- regen-viz fires on what cadence and what triggers? Is it gated by fingerprint?
- detect-system-viz-drift wiring (does any Stop/cron consume DRIFT_REPORT.json?)
- Orphan augmentation files (mtime older than 2 weeks — unused?)
- Augmentation FAST[] vs SLOW[] split in regen-viz — any new augmenters registered but not in FAST?
- Are there Worktrees referenced (41 active) where graph is stale relative to that branch's HEAD?
- merge-augmentations.mjs — does it require manual splice for every new aug, or auto-discover? (CLAUDE.md says BOTH FAST[] + merge-splice needed — manual)
- system-viz-obsi
... [+239 chars truncated]

### Assistant | 2026-05-16T20:44:30.530Z

I'll audit the PRISM system-viz subsystem for architecture and wiring gaps. Let me start by exploring the key files.

### Assistant | 2026-05-16T20:44:30.699Z

[tool_use: Read]

### Assistant | 2026-05-16T20:44:30.938Z

[tool_use: Read]

### Assistant | 2026-05-16T20:44:30.950Z

[tool_use: Read]

### User | 2026-05-16T20:44:31.021Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-on-commit.mjs — full refresh chain.
4	 *
5	 * Called by:
6	 *   - Git post-commit hook (auto-fires on every commit)
7	 *   - Cron (hourly)
8	 *   - Slash command /system-viz
9	 *   - Manual: `node scripts/system-viz-on-commit.mjs`
10	 *
11	 * Sequence:
12	 *   1. generate-system-viz.mjs           — base graph from live PRISM state
13	 *   2. merge-augmen
... [+6420 chars truncated]

### Assistant | 2026-05-16T20:44:31.791Z

[tool_use: Read]

### Assistant | 2026-05-16T20:44:31.856Z

[tool_use: Glob]

### Assistant | 2026-05-16T20:44:31.920Z

[tool_use: Glob]

### User | 2026-05-16T20:44:32.933Z

[tool_result] .claude\hooks\post-ship-distill.mjs

### User | 2026-05-16T20:44:33.002Z

[tool_result] .claude\hooks\audit-viz-first-inject.mjs

### User | 2026-05-16T20:44:33.372Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * install-system-viz-git-hook.mjs — wire system-viz refresh into the git post-commit hook.
4	 *
5	 * Idempotent installer:
6	 *   - Locates the active .git directory (worktree-aware)
7	 *   - Reads existing post-commit hook (or creates one)
8	 *   - Appends the system-viz refresh block (skipped if already present)
9	 *   - Marks executable on POSIX, leaves alone on W
... [+3353 chars truncated]

### User | 2026-05-16T20:45:20.544Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+8835 chars truncated]

### User | 2026-05-16T20:45:20.732Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * detect-system-viz-drift.mjs — SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-DRIFT-DETECTOR
4	 *
5	 * Diffs system-viz graph state against current disk reality. Surfaces stale
6	 * namespaces (lastWalkedAt aging past threshold) AND coverage-delta cases
7	 * (where dir mtime is significantly past lastWalkedAt). Writes a machine-readable
8	 * report at state/shared/system-viz/DRIF
... [+12545 chars truncated]

### User | 2026-05-16T20:46:00.167Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   Audit PRISM system-viz subsystem (orchestrator, drift detector, post-commit hook, installer) for ARCHITECTURE/WIRING upgrade opportunities. Focus on integration robustness, not features. Return under 500 words with: integration gap description, concrete fix, failure mode it prevents, verification command, and effort estimate (S/M/L), ranked by drift-prevention impact. Verify hook wiring in both C:/Users/wompu/.claude/settings.json AND H:/.claude/settings.json. Check for stale augmentations (mtime < 2026-05-10). Examine regen-viz cadence/triggers, detect-system-viz-drift consumption, obsidian-bridge v1 vs v2, merge-augmentations manual splice requirements, worktree graph staleness, and system-viz-on-commit vs install-system-viz-git-hook relationship.

2. Key Technical Concepts:
   - PRISM system-viz graph architecture: base generation → augmentation merge → drift detection → wiki regeneration
   - FAST[] vs HEAVY[] augmenters (47 FAST, 2 HEAVY) in regen-viz.mjs
   - Single-writer pidfile guard pattern (.system-viz-on-commit.pid) for multi-chat concurrency safety
   - DRIFT_REPORT.json categories: fresh, stale-time, stale-churn, truncated, root-missing, never-walked
   - Round-4 skip optimization (1-commit highlight lag vs 91s×6 contention avoidance)
   - Detached async wiki regen via viz-regen-guard.mjs to prevent git index.lock blocking
   - 16GB heap + 8MB stack requirement for Windows JSON serialization of 90MB+ graph

3. Files and Code Sections:
   - H:/prism/scripts/regen-viz.mjs
     * Orchestrator spawning 47 FAST augmenters sequentially, optionally 2 HEAVY with --full flag
     * Post-merge pipeline: repair-graph-engine-classification.mjs → dedup-graph-nodes.mjs → reparent-viz-categories.mjs → add-parent-contains-edges.mjs
     * Obsidian-bridge-v2.mjs runs only on -
... [+5208 chars truncated]

### Assistant | 2026-05-16T20:46:21.475Z

Based on my read of the four core system-viz files, here are the wiring gaps ranked by drift-prevention impact:

---

## 1. **Round-4 Re-merge Skip Creates 1-Commit Blind Spot**
**Gap:** `system-viz-on-commit.mjs` (line 103) skips the final merge-augmentations pass by default (`FOLD_NEWLY_BUILT=1` required to re-enable). Newly-built nodes highlight only on the *next* commit, not the current one. If the next commit is delayed or fails, the graph lacks current-state visibility.

**Fix:** Default to `FOLD_NEWLY_BUILT=1` in `system-viz-on-commit.mjs` and move the 91s re-merge overhead to hourly cron only (`regen-viz.mjs` with `--full`) to avoid commit-time contention.

**Failure Mode Prevented:** Stale graph state reported to chat agents on high-commit-rate days (6 concurrent chats); agents make decisions on lagged state.

**Verify:** `grep -n "FOLD_NEWLY_BUILT" /mnt/h/prism/scripts/system-viz-on-commit.mjs` (should show only env check, not default-true logic).

**Effort:** S (change 1 env default, add cron binding)

---

## 2. **Obsidian-Bridge v2 Runs Only on `--full`, Missing Auto-Rebuild**
**Gap:** `regen-viz.mjs` (lines 173–179) runs `system-viz-obsidian-bridge-v2.mjs` only when `--full` is passed. Post-commit fast path never regenerates wiki backlinks, leaving knowledge vault out of sync.

**Fix:** Unconditionally run `system-viz-obsidian-bridge-v2.mjs` in the FAST[] pipeline (not conditionally on `--full`). If it's too slow, profile and optimize; don't skip it.

**Failure Mode Prevented:** Wiki entries and node.knowledge fields diverge; recall hooks fail to find relevant entries; training data becomes invalid.

**Verify:** `node /mnt/h/prism/scripts/regen-viz.mjs` (fast) should emit obsidian-bridge status; currently silent.

**Effort:** M (profiling + optional optimization + CI integration to detect regressions)

---

## 3. **Detached Wiki-Regen Process Not Monitored for Failure**
**Gap:** `system-viz-on-commit.mjs` (lines 127–138) spawns wiki regen with `detache
... [+3727 chars truncated]

---
type: "chat-session"
source: "claude-code-cli"
session_id: "24e5b0b2-d2bb-4979-b53b-5d101e78cd1c"
title: "Round-4 review of H:\\prism\\scripts\\sfc-variability-resume-guard.mjs (v4) + H:\\pr"
date: "2026-05-19"
first_ts: "2026-05-19T02:04:26.121Z"
last_ts: "2026-05-19T02:06:42.091Z"
cwd: "H:\\PRISM"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/24e5b0b2-d2bb-4979-b53b-5d101e78cd1c/subagents/agent-a3d83ce6e92156302.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Round-4 review of H:\prism\scripts\sfc-variability-resume-guard.mjs (v4) + H:\pr

> **claude-code-cli** | 2026-05-19 | 7 msgs (3 user / 4 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/24e5b0b2-d2bb-4979-b53b-5d101e78cd1c/subagents/agent-a3d83ce6e92156302.jsonl`

## Transcript

### User | 2026-05-19T02:04:26.121Z

Round-4 review of H:\prism\scripts\sfc-variability-resume-guard.mjs (v4) + H:\prism\scripts\sfc-variability-resume-guard.test.mjs end-to-end (read both whole files).

v3→v4 delta to verify (v3's pure-core min-worker-frontier resume logic already passed 3 rounds — focus on the v4 CHANGES):
1. TWO-TASK design: the guard NO LONGER spawns the batch. `runGuard`'s default `relaunch` dep is `defaultRelaunch` which does `spawnSync("schtasks", ["/run","/tn",batchTaskName(domain)])`. The batch runs as its own on-demand scheduled task. Verify: the guard genuinely never spawns the batch; `defaultRelaunch` throws loudly on schtasks failure → `runGuard` records `action:"relaunch-failed"` + `triggerError`; the CLI surfaces relaunch-failed loudly (exitCode 3).
2. SIDECAR ts-REFRESH: on an `alive`-this-host pass, `runGuard` re-reads the sidecar and rewrites it with a fresh `ts` (preserving launchSkip/workers/chunkSize/maxMinutes). Verify: this keeps the cross-PC window fresh for a healthy batch; the preserved fields are correct; `buildSidecarRecord` floors launchSkip and handles null; dry-run does NOT write.
3. CADENCE-SCALED host window: `decideHostOwnership` now takes `stalenessMs` = `HOST_STALENESS_MIN(15)*MIN_TO_MS`, NOT the 600-min batch runtime. Verify HOST_STALENESS_MIN is correct (≈3× the 5-min cadence) and the window logic: other-host + ts within 15min → remote-alive; stale → clear (take over).
4. HOST-KEYED lock: `lockPathForHost(host)` → `.sfc-variability-guard-<host>.lock`. Verify two PCs get distinct lock files (no cross-host stale-reap); unsafe chars sanitized.
5. `readResumeState` now scans newest→oldest chunk per worker, first valid maxIdx wins (corrupt newest chunk falls back to prior complete chunk). Verify gap-free.

Flag P0/P1/P2 with line refs:
- Does the ts-refresh logic ever CORRUPT the sidecar (e.g. an alive-pass on host A overwriting a sidecar whose launchSkip was for a batch host A doesn't know about)? Walk it.
- Is there any path where `runGuard` both refr
... [+684 chars truncated]

### Assistant | 2026-05-19T02:05:02.503Z

I'll review both files end-to-end.

### Assistant | 2026-05-19T02:05:03.365Z

[tool_use: Read]

### Assistant | 2026-05-19T02:05:03.372Z

[tool_use: Read]

### User | 2026-05-19T02:05:19.349Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * SFC-ACCURACY-MS1 — Variability batch resume-guard (watchdog). v4.
4	 *
5	 * The Stage-2 batch (`sfc-variability-batch-run.mjs`) is a multi-day workload
6	 * toward billions of compatibility-filtered combos. It has died TWICE on
7	 * machine switches (the H: drive is shared across PCs; disk state survives,
8	 * processes do not). This guard makes the batch self-resu
... [+32454 chars truncated]

### User | 2026-05-19T02:05:19.694Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Hermetic tests for sfc-variability-resume-guard.mjs (v4 — two-task arch).
4	 *
5	 * Pins the P0s + P1s from three rounds of per-file scrutiny (2026-05-19):
6	 *   P0  resume skip = min over workers of max RECORD idx (not filename, not
7	 *       max) — multi-worker round-robin death must not produce silent gaps.
8	 *   P0  EMPTY enumeration → "indeterminate", never
... [+29554 chars truncated]

### Assistant | 2026-05-19T02:06:42.091Z

I've read both files end-to-end. Let me verify the v4 delta claims systematically.

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 2 (`sfc-variability-resume-guard.mjs` v4, `sfc-variability-resume-guard.test.mjs`)
- Issues Found: 1 P1, 3 P2
- Verdict: **PASS**

---

### v4 Delta Verification

**1. Two-task design — guard never spawns the batch.** VERIFIED.
- No `spawn`/`exec` of the batch anywhere. `defaultRelaunch` (line 354–366) calls `spawnSync("schtasks", ["/run","/tn",batchTaskName(ctx.domain)])` — fixed argv, shell-free.
- It throws loud on `r.error` (line 360) and on non-zero status (line 361–364). `runGuard` catches that (line 633–635), sets `triggerError`, records `action: "relaunch-failed"` (line 637).
- CLI surfaces it: line 707–713 filters `relaunch-failed`, writes a per-domain WARNING to stderr, sets `exitCode = 3`. The test at line 420 drives a throwing `relaunch` and asserts `action: "relaunch-failed"` + `triggerError` matched. Real.

**2. Sidecar ts-refresh on alive pass.** VERIFIED with one P1 caveat below.
- Lines 560–572: on `aliveState === "alive" && !dryRun`, re-reads sidecar, calls `buildSidecarRecord` preserving `launchSkip/workers/chunkSize/maxMinutes/note`, writes. `dryRun` correctly gated (line 561). `buildSidecarRecord` floors `launchSkip` (line 456) and emits `null` for non-finite. Test at line 345 confirms ts→now, launchSkip preserved, host overwritten.

**3. Cadence-scaled host window.** VERIFIED.
- `HOST_STALENESS_MIN = 15` (line 105) = 3× the 5-min `GUARD_CADENCE_MIN`. `decideHostOwnership` (line 425) uses `stalenessMs`; caller passes `HOST_STALENESS_MS` (line 580), NOT `maxMinutes`. Test at line 61 pins `>= 2× cadence` AND `< 60` (anti-revert to batch-runtime scale). Window logic correct: `(nowMs - tsMs) < windowMs` → `remote-alive`, else `clear`.

**4. Host-keyed lock.** VERIFIED.
- `lockPathForHost` (line 467) → `.sfc-variability-guard-<safe>.lock`; CLI uses it (line 682). Unsafe-char s
... [+12087 chars truncated]

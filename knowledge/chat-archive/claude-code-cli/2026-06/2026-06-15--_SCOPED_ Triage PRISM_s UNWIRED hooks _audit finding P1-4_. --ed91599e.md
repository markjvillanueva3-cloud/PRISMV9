---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "[SCOPED] Triage PRISM's UNWIRED hooks (audit finding P1-4). Repo root H:/prism. "
date: "2026-06-15"
first_ts: "2026-06-15T05:19:16.158Z"
last_ts: "2026-06-15T05:25:47.965Z"
cwd: "H:\\prism-slot-sierra"
messages: 38
user_msgs: 16
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-ae15298881b8559ed.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# [SCOPED] Triage PRISM's UNWIRED hooks (audit finding P1-4). Repo root H:/prism. 

> **claude-code-cli** | 2026-06-15 | 38 msgs (16 user / 22 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-ae15298881b8559ed.jsonl`

## Transcript

### User | 2026-06-15T05:19:16.158Z

[SCOPED] Triage PRISM's UNWIRED hooks (audit finding P1-4). Repo root H:/prism. There are 712 .mjs files in .claude/hooks/ (excl *.test.mjs); only ~387 are referenced in any settings.json (C:/Users/wompu/.claude/settings.json + H:/.claude/settings.json) OR in .claude/hooks/bundles/*.mjs -> ~363 are UNWIRED (never fire).

STEP 1: Regenerate the unwired list yourself with node (run via the Bash tool):
node -e "const fs=require('fs'),p=require('path');const HD='H:/prism/.claude/hooks';const onDisk=fs.readdirSync(HD).filter(f=>f.endsWith('.mjs')&&!f.endsWith('.test.mjs'));const refd=new Set();for(const sp of ['C:/Users/wompu/.claude/settings.json','H:/.claude/settings.json']){if(!fs.existsSync(sp))continue;let s;try{s=JSON.parse(fs.readFileSync(sp,'utf8'))}catch{continue}const h=s.hooks||{};for(const ev of Object.keys(h))for(const m of (h[ev]||[]))for(const e of (m.hooks||[])){const mm=(e.command||'').match(/[\\w.-]+\\.mjs/g);if(mm)mm.forEach(x=>refd.add(x))}}const bd=p.join(HD,'bundles');if(fs.existsSync(bd))for(const bf of fs.readdirSync(bd).filter(f=>f.endsWith('.mjs'))){const mm=fs.readFileSync(p.join(bd,bf),'utf8').match(/[\\w.-]+\\.mjs/g);if(mm)mm.forEach(x=>refd.add(x))}const unwired=onDisk.filter(f=>!refd.has(f));console.log(unwired.join('\\n'))"

STEP 2: CLASSIFY the unwired list into 3 buckets by reading file headers where needed:
- (A) RETIRED/SUPERSEDED: obsolete (old milestone-prefix name, a newer sibling clearly replaced it, one-off migration) -> safe to relocate to hooks/_archive/.
- (B) ORPHANED-INTENDED: the name + header imply a load-bearing SAFETY / dedup / guard / anti-regression / enforcement role that SHOULD fire but doesn't -> candidate to WIRE. For these, read the header to confirm intent AND that it's a valid hook (has a main() that emits hook JSON, declares its event).
- (C) AMBIGUOUS.

REPORT: count per bucket + the FULL list for (B) ORPHANED-INTENDED with a one-line reason + intended event for each (this is the actionable high-value set; keep
... [+148 chars truncated]

### Assistant | 2026-06-15T05:19:18.559Z

I'll work through this systematically. Let me start by running the node script to get the unwired list, then classify them.

### Assistant | 2026-06-15T05:19:21.375Z

[tool_use: Bash]

### User | 2026-06-15T05:19:46.414Z

[tool_result] agent-registry-load.mjs
agent-util-log.mjs
agent-watchdog.mjs
aggressive-killer-stop.mjs
agi-safety-envelope-guard.mjs
ai-auto-command-router.mjs
ai-duplication-guard.mjs
ai-feature-recommend.mjs
ai-session-sync.mjs
ai-system-activate.mjs
allow-superseding.mjs
alpha-slot-reaper-guardian.mjs
anti-regression-auto-sweep.mjs
appdata-junction-guard.mjs
archived-skill-suggest.mjs
async-pattern-checker.m
... [+9376 chars truncated]

### Assistant | 2026-06-15T05:19:49.166Z

Good, I have 303 unwired hooks. Now let me read headers in bulk to classify them efficiently.

### Assistant | 2026-06-15T05:19:54.695Z

[tool_use: Bash]

### User | 2026-06-15T05:20:37.244Z

[tool_result] === H:/prism/.claude/hooks/stop_on_awareness_degraded.mjs ===
#!/usr/bin/env node
// tier: T4
/**
 * stop_on_awareness_degraded.mjs — Tier 6 Stop Hook
 * Warns when awareness score dropped below threshold during session.
 */
import fs from "node:fs";
import path from "node:path";

const HEALTH_REPORT = "H:/prism/mcp-server/data/state/HEALTH_CHECK_REPORT.json";
const THRESHOLD = 0.80;


... [+15527 chars truncated]

### Assistant | 2026-06-15T05:20:42.078Z

Now let me read headers for the high-priority pretool/posttool/session-start/pre-*/guard hooks in parallel batches.

### Assistant | 2026-06-15T05:20:46.696Z

[tool_use: Bash]

### User | 2026-06-15T05:21:02.667Z

[tool_result] === claude-no-delete-files.mjs ===
#!/usr/bin/env node
// tier: T1
/**
 * claude-no-delete-files.mjs — PreToolUse Bash hook.
 *
 * Operator-imposed safety lock (2026-05-19): makes file-deletion IMPOSSIBLE for
 * Claude. Hard-blocks every destructive shell pattern by default. The existing
 * asset-deletion-block + bash-destructive-guard hooks only cover named protected
 * paths or warn-not-block — 
... [+13845 chars truncated]

### Assistant | 2026-06-15T05:21:09.335Z

[tool_use: Bash]

### User | 2026-06-15T05:21:14.885Z

[tool_result] === pre-edit-impact-analyzer.mjs ===
#!/usr/bin/env node
// tier: T1
// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
/**
 * Pre-Edit Impact Analyzer Hook
 *
 * Fires on PreToolUse for Edit/Write opera
... [+12142 chars truncated]

### Assistant | 2026-06-15T05:21:21.437Z

[tool_use: Bash]

### User | 2026-06-15T05:21:32.266Z

[tool_result] === autonomous-loop-watchdog.mjs ===
#!/usr/bin/env node
// tier: T0
/**
 * autonomous-loop-watchdog — Stop hook for autonomous yolo-mode runs.
 *
 * Bounds the worst-case "stuck loop" damage at 15 minutes. Pure decision
 * logic lives in ./lib/autonomous-foolproof-logic.mjs (decideWatchdog).
 *
 * U-AF01 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:
... [+11880 chars truncated]

### Assistant | 2026-06-15T05:21:35.041Z

Good progress. Let me now read the remaining candidate hooks in parallel to complete the classification.

### Assistant | 2026-06-15T05:21:39.197Z

[tool_use: Bash]

### User | 2026-06-15T05:21:47.925Z

[tool_result] === agent-watchdog.mjs ===
#!/usr/bin/env node
// tier: T3
/**
 * agent-watchdog.mjs — stall detector for the 10-chat PRISM fleet.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-AGENT-RUNTIME-ALERTS (G3).
 *
 * Why this exists:
 *   The fleet has 10 concurrent chat slots. A chat that holds a slot
 *   but stops posting heartbeats (Claude CLI hung, terminal crashed,
 *   operator walked away mid-loop) silentl
... [+10477 chars truncated]

### Assistant | 2026-06-15T05:21:49.982Z

Good. Now let me read the final batch of candidate hooks to complete classification.

### Assistant | 2026-06-15T05:21:53.903Z

[tool_use: Bash]

### User | 2026-06-15T05:21:59.001Z

[tool_result] === hook-saturation-alert.mjs ===
// tier: T3
/**
 * hook_saturation_alert — USSH Phase 0.25
 * ========================================
 *
 * Monitors hook pipeline saturation using queueing theory.
 * Alerts when utilization ρ > 0.8 (system approaching saturation).
 *
 * Fires: PostToolUse
 * Theory: Little's Law (L = λW), M/M/1 queue analysis
 */

import fs from 'fs';
import path from 'path';


... [+8462 chars truncated]

### Assistant | 2026-06-15T05:22:04.779Z

[tool_use: Bash]

### User | 2026-06-15T05:22:12.626Z

[tool_result] === error-pattern-learner.mjs ===
#!/usr/bin/env node
// tier: T3
/**
 * error-pattern-learner.mjs — dual-mode hook.
 *
 * MODE A — PostToolUse:* (capture)
 *   When a tool_response signals an error/block/failure, classify the root cause
 *   into a coarse pattern (regex-mismatch, magic-number, json-shape, type-error,
 *   permission-denied, hook-blocked, test-failure, schema-violation, etc.) and

... [+8595 chars truncated]

### Assistant | 2026-06-15T05:22:21.969Z

[tool_use: Bash]

### User | 2026-06-15T05:22:32.144Z

[tool_result] === protect-document-content.mjs ===
// tier: T4
=== cag-soul-cache-block.mjs ===
#!/usr/bin/env node
// tier: T2
// U-CAG-01-SOUL-TO-SESSIONSTART — emit the static slot-soul as a SessionStart
// additionalContext block ONCE per session (instead of UserPromptSubmit per prompt).
//
// Article-2 (akshay_pachaar) cold/hot split: slot-soul is purely cold (frozen per
// slot, only changes when the soul
... [+9361 chars truncated]

### Assistant | 2026-06-15T05:22:38.290Z

[tool_use: Bash]

### User | 2026-06-15T05:22:50.818Z

[tool_result] === allow-superseding.mjs ===
// tier: T0
/**
 * allow-superseding.mjs — Phase 1 Tier 5B
 *
 * PreTool hook that requires reasonCode for forced re-extractions.
 * Ensures intentional superseding has documented justification.
 */

import * as fs from "fs";
import * as path from "path";

const SUPERSEDE_LOG_PATH = "mcp-server/data/state/supersede-log.json";

// Valid reason codes for re-extraction
c
... [+9981 chars truncated]

### Assistant | 2026-06-15T05:22:56.539Z

[tool_use: Bash]

### User | 2026-06-15T05:23:02.140Z

[tool_result] === warn-redundant-read.mjs ===
#!/usr/bin/env node
// tier: T1
/**
 * warn-redundant-read.mjs — PreToolUse hook (Read only)
 *
 * Warns when about to Read a file that was already read in this session
 * with a covering range. Helps prevent token waste from re-reads.
 *
 * Does NOT block — Claude may have a valid reason (file modified externally).
 * Records every Read to FileReadDeduplicationEngi
... [+7527 chars truncated]

### Assistant | 2026-06-15T05:23:08.456Z

[tool_use: Bash]

### User | 2026-06-15T05:23:13.517Z

[tool_result] === ai-duplication-guard.mjs ===
#!/usr/bin/env node
// tier: T0
/**
 * AI Duplication Guard — PreToolUse Hook (Phase 0.1 Fix)
 *
 * HARD BLOCKS duplicate creation of:
 * - Engines (*.ts in /engines/)
 * - Formulas (FormulaRegistry additions)
 * - Algorithms (AlgorithmRegistry additions)
 * - Extractions (data/extracted-knowledge/)
 * - Skills (skills/, commands/)
 * - Hooks (hooks/)
 * - Dispatch
... [+7664 chars truncated]

### Assistant | 2026-06-15T05:23:18.326Z

Now I have enough data to produce the full triage report. Let me do a final quick check on a few ambiguous ones before writing up.

### Assistant | 2026-06-15T05:23:22.992Z

[tool_use: Bash]

### User | 2026-06-15T05:23:39.280Z

[tool_result] === stop_on_non_h_roadmap.mjs ===
#!/usr/bin/env node
// tier: T4
// DEFERRED IMPLEMENTATION — temporary no-op stub.
// Registered in H:/.claude/settings.json (Stop hook, line ~255) by claude-cba638c3
// but real content not yet written. This stub prevents harness hangs on Stop.
// Exit 0 = allow Stop (default-permissive until real policy ships).
// When the owning chat ships the real hook, simply
... [+4277 chars truncated]

### Assistant | 2026-06-15T05:23:42.521Z

[tool_use: Bash]

### User | 2026-06-15T05:23:52.239Z

[tool_result] 1 H:/prism/.claude/hooks/protect-document-content.mjs
// tier: T4

### Assistant | 2026-06-15T05:23:59.105Z

[tool_use: Bash]

### User | 2026-06-15T05:24:06.515Z

[tool_result] disabled_token_redux: 7   deferred_stubs: 2   oneshot_scripts: 1   shims: 2

### Assistant | 2026-06-15T05:25:47.965Z

I now have everything needed. Here is the full triage report.

---

## PRISM Unwired Hook Triage — P1-4 Audit

### Regenerated Count

The node script produced **303 unwired hooks** (not 363 — the settings.json + bundles reference set is larger than the prior estimate covered).

---

### Bucket Summary

| Bucket | Count |
|---|---|
| (A) RETIRED / SUPERSEDED | 71 |
| (B) ORPHANED-INTENDED — should wire | 46 |
| (C) AMBIGUOUS | 186 |

---

### (A) RETIRED / SUPERSEDED — 71 files

Representative 10-item sample (safe to relocate to `hooks/_archive/`):

1. `roadmap-reconcile.mjs` — self-describes as "one-time reconciliation, run manually"; not a hook, never fires via harness
2. `stop_on_non_h_roadmap.mjs` — explicit `DEFERRED IMPLEMENTATION` no-op stub, policy never written
3. `pre-write-roadmap-home.mjs` — same class: `DEFERRED IMPLEMENTATION` no-op stub
4. `protect-document-content.mjs` — 1-line file, body is only `// tier: T4`; completely empty, superseded by `document-preserve-guard.mjs`
5. `pre-edit-impact-analyzer.mjs` — `DISABLED_TOKEN_REDUX_2026_04_23` early-exit shim; real logic bypassed by design
6. `complexity-gate.mjs` — same `DISABLED_TOKEN_REDUX_2026_04_23` kill-switch
7. `lathe-master-post-quality-gate.mjs` — same `DISABLED_TOKEN_REDUX_2026_04_23` kill-switch
8. `task-goal-tracker.mjs` — same `DISABLED_TOKEN_REDUX_2026_04_23` kill-switch
9. `naming-convention-enforcer.mjs` — same `DISABLED_TOKEN_REDUX_2026_04_23` kill-switch
10. `neural-roadmap-resume-detect.mjs` — milestone-specific `XPROC-NEURAL-OPTIMIZE-MS0` prompt-matcher; milestone is long-completed, trigger phrase is dead

Full retired set also includes: `_envelope.mjs`, `_rpc-shim.mjs` (infrastructure shims never wired as hooks), `schema-version-read.mjs` (reader utility, no main()), `svi-watch-refresh.mjs` / `svi-inject.mjs` / `svi-projection.mjs` (export-default only, no stdin main, pre-dates hook protocol), `training-convergence-guard.mjs` / `rag-relevance-guard.mjs` / `neural-cad-validation.mjs`
... [+13211 chars truncated]

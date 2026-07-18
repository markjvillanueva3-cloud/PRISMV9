---
type: "chat-session"
source: "claude-code-cli"
session_id: "0c203c88-6d98-44df-931a-5945093269a2"
title: "PRISM has a master system graph at `H:\\prism\\state\\shared\\system-viz\\system-grap"
date: "2026-05-22"
first_ts: "2026-05-22T15:43:30.038Z"
last_ts: "2026-05-22T15:45:34.520Z"
cwd: "H:\\PRISM"
messages: 61
user_msgs: 26
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/0c203c88-6d98-44df-931a-5945093269a2/subagents/agent-a0da9748eab0abe19.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# PRISM has a master system graph at `H:\prism\state\shared\system-viz\system-grap

> **claude-code-cli** | 2026-05-22 | 61 msgs (26 user / 35 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/0c203c88-6d98-44df-931a-5945093269a2/subagents/agent-a0da9748eab0abe19.jsonl`

## Transcript

### User | 2026-05-22T15:43:30.038Z

PRISM has a master system graph at `H:\prism\state\shared\system-viz\system-graph.json` (~110K nodes) consumed by "master-index search". The user wants to be sure this graph is kept fresh automatically. I need to know if it auto-updates and whether it is currently stale.

Investigate and report (thorough exploration):

1. The exact path(s) of `system-graph.json` and any sibling graph files in `H:\prism\state\shared\system-viz\` (e.g. architecture-graph.json, staging/*). Report the current file SIZE and MTIME (last-modified timestamp) of each — use `ls -la` or `stat`.

2. How the graph is generated. Find and summarize `H:\prism\scripts\regen-viz.mjs` and `H:\prism\scripts\merge-augmentations.mjs` — what regenerates the graph, the FAST[] vs full pipeline, and roughly how heavy/slow it is. Note any other generator scripts under `H:\prism\scripts\` matching `*viz*` or `*graph*`.

3. AUTOUPDATE — the key question. Search for anything that regenerates the graph automatically:
   - A Windows scheduled task: grep for "viz" / "graph" / "regen" in `H:\prism\.claude\helpers\*.ps1` and any `install-*-task.ps1` scripts.
   - A cron entry: read `H:\.claude\scheduled_tasks.json` and `H:\prism\.claude\scheduled_tasks.json` if they exist.
   - A Stop hook or SessionStart hook: grep the `.claude\hooks\` dir and `H:\.claude\settings.json` for hooks that call regen-viz or touch system-graph.json.
   Report definitively: does the graph regenerate on a schedule, on a trigger (Stop/SessionStart), or ONLY manually?

4. Is the graph currently STALE? Compare its mtime (from step 1) against recent git activity: run `git -C H:/prism log -1 --format=%ci` for the newest commit date. If commits are days newer than the graph mtime, it is stale — say so explicitly.

5. Also check `H:\prism\scripts\lib\master-index-search-lib.mjs` — how does it locate/load the graph file, and does it have an mtime cache that would pick up a regenerated graph automatically?

Report concrete file paths, line numbers, 
... [+44 chars truncated]

### Assistant | 2026-05-22T15:43:37.109Z

I'll investigate the system-graph.json file, its generation, and auto-update status thoroughly.

### Assistant | 2026-05-22T15:43:37.324Z

[tool_use: Bash]

### User | 2026-05-22T15:43:41.779Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### Assistant | 2026-05-22T15:43:43.831Z

I'm in plan mode. Let me refine my approach and search efficiently for the information you need.

### Assistant | 2026-05-22T15:43:44.053Z

[tool_use: Glob]

### Assistant | 2026-05-22T15:43:44.236Z

[tool_use: Glob]

### Assistant | 2026-05-22T15:43:44.543Z

[tool_use: Glob]

### Assistant | 2026-05-22T15:43:44.847Z

[tool_use: Bash]

### User | 2026-05-22T15:43:46.678Z

[tool_result] state\shared\system-viz\business-value-map.json
state\shared\system-viz\awareness-augmentation.json
state\shared\system-viz\novelty-catalog.json
state\shared\system-viz\engine-spotlight.json
state\shared\system-viz\h-drive-census.json
state\shared\system-viz\agent-slices\1.json
state\shared\system-viz\agent-slices\2.json
state\shared\system-viz\agent-slices\3.json
state\shared\system-viz\agent-sli
... [+4811 chars truncated]

### User | 2026-05-22T15:43:47.423Z

[tool_result] scripts\system-viz-obsidian-bridge.mjs
scripts\install-system-viz-git-hook.mjs
scripts\reparent-viz-categories.mjs
scripts\audit-roadmap-viz-bindings.mjs
scripts\regen-wiki-from-viz.mjs
scripts\system-viz-obsidian-bridge-v2.mjs
scripts\__tests__\build-system-viz-livediff.test.mjs
scripts\viz-regen-guard.mjs
scripts\viz-output-size.mjs
scripts\build-system-viz-livediff.mjs
scripts\render-fleet-pipe
... [+1841 chars truncated]

### User | 2026-05-22T15:43:47.452Z

[tool_result] scripts\augment-graph-with-awareness.mjs
scripts\repair-graph-engine-classification.mjs
scripts\dedup-graph-nodes.mjs
scripts\export-graph-cypher.mjs
scripts\generate-vault-graph.mjs
scripts\lib\tribal-graph-clusters.mjs
scripts\lib\tribal-graph-clusters.test.mjs
scripts\lib\tribal-graph-embedding.mjs
scripts\lib\tribal-graph-embedding.test.mjs
scripts\tribal-graph-course-mapper.mjs
scripts\regen-
... [+1137 chars truncated]

### User | 2026-05-22T15:43:50.477Z

[tool_result]   File: H:/prism/state/shared/system-viz/system-graph.json
  Size: 432557518 	Blocks: 422420     IO Block: 65536  regular file
Modify: 2026-05-21 11:32:16.851369800 -0500

### Assistant | 2026-05-22T15:43:52.456Z

Good start. Now let me check the main generator scripts and auto-update mechanisms.

### Assistant | 2026-05-22T15:43:52.904Z

[tool_use: Read]

### Assistant | 2026-05-22T15:43:53.150Z

[tool_use: Read]

### Assistant | 2026-05-22T15:43:53.506Z

[tool_use: Bash]

### User | 2026-05-22T15:43:56.286Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+4060 chars truncated]

### User | 2026-05-22T15:43:56.290Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
4	 *
5	 * Layers (top→bottom):
6	 *   L0 Personas        — 5 user roles
7	 *   L1 Frontend        — 144 web pages clustered into functional groups + CLIs
8	 *   L2 Transport       — MCP / REST / gRPC / GraphQL / WS / auth / rate / telemetry
9	 *   L3 AI Hierarchy    — Tier-1 Claude / Tier-2 coordinator
... [+5217 chars truncated]

### User | 2026-05-22T15:44:01.065Z

[tool_result] 2026-05-21 21:12:27 -0500 a850bec293 [MAIN] [HIGH-ROI-WIKI-TRIBAL]/U-WIKI-MATH-MACHINABILITY (slot:hotel): math wiki ...

### Assistant | 2026-05-22T15:44:04.210Z

Now let me check for auto-update hooks and scheduled tasks.

### Assistant | 2026-05-22T15:44:04.625Z

[tool_use: Read]

### Assistant | 2026-05-22T15:44:05.049Z

[tool_use: Bash]

### Assistant | 2026-05-22T15:44:05.821Z

[tool_use: Bash]

### Assistant | 2026-05-22T15:44:06.204Z

[tool_use: Bash]

### User | 2026-05-22T15:44:09.141Z

[tool_result] 1	/**
2	 * regen-viz-merge-guard.mjs — pure decision logic for regen-viz.mjs merge step.
3	 *
4	 * Why this exists (U-REGEN-VIZ-MERGE-FAILLOUD):
5	 *   Previously the orchestrator logged `[regen-viz] ✗ merge failed`, set
6	 *   failed++, and KEPT GOING through repair → dedup → reparent → parent-edges
7	 *   → obsidian-bridge → executive-briefing → wiki-debt → drift-gate. Those
8	 *   stages all re
... [+2449 chars truncated]

### User | 2026-05-22T15:44:12.331Z

[tool_result] H:/prism/.claude/bin/check-mem.ps1
H:/prism/.claude/cache/awareness-v2.json
H:/prism/.claude/cache/bash-result-cache.json
H:/prism/.claude/cache/build-cache/0bd2552c.json
H:/prism/.claude/cache/build-cache/317fb800.json
H:/prism/.claude/cache/build-cache/c888968f.json
H:/prism/.claude/cache/build-cache/d99dc7c4.json
H:/prism/.claude/cache/build-cache/e4d781f4.json
H:/prism/.claude/cache/build-cach
... [+579 chars truncated]

### User | 2026-05-22T15:44:16.572Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: syntax error near unexpected token `{'
/usr/bin/bash: eval: line 1: `if (Test-Path "H:/prism/.claude/scheduled_tasks.json") { Get-Content "H:/prism/.claude/scheduled_tasks.json" | Select-Object -First 200 } else { Write-Output "File not found" }'

### User | 2026-05-22T15:44:20.808Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: syntax error near unexpected token `{'
/usr/bin/bash: eval: line 1: `if (Test-Path "H:/.claude/scheduled_tasks.json") { Get-Content "H:/.claude/scheduled_tasks.json" -Raw | Select-Object -First 1000 } else { Write-Output "File not found" }'

### Assistant | 2026-05-22T15:44:23.895Z

Let me search for hooks and scheduled tasks more carefully.

### Assistant | 2026-05-22T15:44:24.120Z

[tool_use: Glob]

### Assistant | 2026-05-22T15:44:24.358Z

[tool_use: Glob]

### Assistant | 2026-05-22T15:44:24.478Z

[tool_use: Read]

### User | 2026-05-22T15:44:25.154Z

[tool_result] File does not exist. Note: your current working directory is H:\PRISM.

### User | 2026-05-22T15:44:25.351Z

[tool_result] .claude\hooks\agent-boundary-guard.mjs
.claude\hooks\agent-pid-tracker.mjs
.claude\hooks\agent-registry-load.mjs
.claude\hooks\agent-rules-inject.mjs
.claude\hooks\agent-util-log.mjs
.claude\hooks\agent-vs-direct.mjs
.claude\hooks\agent-worktree-stale-unlock.mjs
.claude\hooks\aggressive-killer-stop.mjs
.claude\hooks\agi-safety-envelope-guard.mjs
.claude\hooks\ai-auto-command-router.mjs
.claude\hoo
... [+3851 chars truncated]

### User | 2026-05-22T15:44:26.685Z

[tool_result] scripts\slot-task-claim-release-on-commit.mjs
scripts\slot-task-claim-release-on-commit.test.mjs
scripts\system-viz-on-commit.test.mjs
scripts\system-viz-on-commit.mjs

### Assistant | 2026-05-22T15:44:29.163Z

Now let me check the on-commit hook and search for viz regen in hooks:

### Assistant | 2026-05-22T15:44:29.612Z

[tool_use: Read]

### Assistant | 2026-05-22T15:44:30.526Z

[tool_use: Grep]

### Assistant | 2026-05-22T15:44:30.916Z

[tool_use: Bash]

### User | 2026-05-22T15:44:33.165Z

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
... [+3962 chars truncated]

### User | 2026-05-22T15:44:35.430Z

[tool_result] H:/prism/state/shared/system-viz/system-graph.json  412.5M
H:/prism/state/shared/system-viz/system-graph.previous.json  372.0M

### User | 2026-05-22T15:44:52.107Z

[tool_result] Found 30 files limit: 30
H:\.claude\projects\H--prism\0c203c88-6d98-44df-931a-5945093269a2\subagents\agent-a22498dfe9ab7ab05.jsonl
H:\.claude\projects\H--prism\0c203c88-6d98-44df-931a-5945093269a2\subagents\agent-a0da9748eab0abe19.jsonl
H:\.claude\projects\H--prism\0c203c88-6d98-44df-931a-5945093269a2.jsonl
H:\.claude\projects\H--prism\fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27.jsonl
H:\.claude\projects
... [+2225 chars truncated]

### Assistant | 2026-05-22T15:44:53.919Z

Now let me check for the git post-commit hook and master-index search implementation:

### Assistant | 2026-05-22T15:44:54.339Z

[tool_use: Bash]

### Assistant | 2026-05-22T15:44:55.244Z

[tool_use: Grep]

### Assistant | 2026-05-22T15:44:55.315Z

[tool_use: Read]

### User | 2026-05-22T15:44:56.508Z

[tool_result] 6: *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
32:const DEFAULT_GRAPH_PATH = "H:/prism/state/shared/system-viz/system-graph.json";
34:// excludes the L11/L12 filesystem-coverage layers that regen-viz --full merges in).
133: * The merged system-graph.json is ~372 MB; parsing + tokenizing it inline was
211: * Load system-graph.json with mtime-based caching. Returns null
... [+217 chars truncated]

### User | 2026-05-22T15:44:57.582Z

[tool_result] 1	/**
2	 * master-index-search-lib.mjs
3	 *
4	 * Shared keyword search over PRISM's two large knowledge corpora:
5	 *
6	 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7	 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
8	 *
9	 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
10	 *      domain). Keyword-only path (s
... [+4423 chars truncated]

### User | 2026-05-22T15:44:59.649Z

[tool_result] applypatch-msg.sample  478B
commit-msg.sample  896B
fsmonitor-watchman.sample  4.6K
post-commit  1.1K
post-update.sample  189B
pre-applypatch.sample  424B
pre-commit.sample  1.6K
pre-merge-commit.sample  416B
pre-push.sample  1.3K
pre-rebase.sample  4.8K
pre-receive.sample  544B
prepare-commit-msg.sample  1.5K
push-to-checkout.sample  2.7K
sendemail-validate.sample  2.3K
update.sample  3.6K

### Assistant | 2026-05-22T15:45:01.958Z

Let me check the post-commit hook directly and verify the file sizes with timestamps:

### Assistant | 2026-05-22T15:45:02.411Z

[tool_use: Read]

### Assistant | 2026-05-22T15:45:03.077Z

[tool_use: Bash]

### Assistant | 2026-05-22T15:45:03.375Z

[tool_use: Read]

### User | 2026-05-22T15:45:05.649Z

[tool_result] 1	#!/bin/sh
2	# PRISM post-commit hook
3	# === PRISM SYSTEM-VIZ AUTO-REFRESH (managed; do not edit between markers) ===
4	# Auto-refresh the system-viz graph on every commit so rgs3/forge3 + the open
5	# browser tab + any chat consuming system-graph.json see fresh state immediately.
6	# Runs in background — does not block the commit. Exit code is ignored.
7	(
8	  cd "$(git rev-parse --show-topleve
... [+762 chars truncated]

### User | 2026-05-22T15:45:05.701Z

[tool_result] 200	    for (const i of idxs) {
201	      const node = nodes[i];
202	      if (node && typeof node.id === "string") bucket.add(node.id);
203	    }
204	    // Match loadGraph's legacy index: only non-empty buckets are recorded.
205	    if (bucket.size > 0) inverted.set(tok, bucket);
206	  }
207	  return { nodes, inverted };
208	}
209	
210	/**
211	 * Load system-graph.json with mtime-based caching. 
... [+3821 chars truncated]

### User | 2026-05-22T15:45:07.501Z

[tool_result]   File: H:/prism/state/shared/system-viz/system-graph.json
  Size: 432557518 	Blocks: 422420     IO Block: 65536  regular file
Modify: 2026-05-21 11:32:16.851369800 -0500
  File: H:/prism/state/shared/system-viz/architecture-graph.json
  Size: 22903518  	Blocks: 22368      IO Block: 65536  regular file
Modify: 2026-05-20 02:34:33.101384000 -0500

### Assistant | 2026-05-22T15:45:09.713Z

Perfect. Now let me verify the current staleness by comparing the graph mtime against the latest commit:

### Assistant | 2026-05-22T15:45:10.357Z

[tool_use: Bash]

### User | 2026-05-22T15:45:14.633Z

[tool_result] 2026-05-21 21:12:27 -0500
---
Modify: 2026-05-21 11:32:16.851369800 -0500

### Assistant | 2026-05-22T15:45:34.520Z

Perfect. I have all the information needed. Let me compile the comprehensive report:

---

## System-Graph.json Auto-Update & Staleness Report

### 1. **Graph Files & Current State**

**Primary graph:**
- Path: `H:/prism/state/shared/system-viz/system-graph.json`
- Size: 412.5 MB (432,557,518 bytes)
- Mtime: **2026-05-21 11:32:16.851** (May 21, 2026 @ 11:32 AM EDT)

**Sibling graphs:**
- `architecture-graph.json` (22.9 MB) — Mtime: 2026-05-20 02:34:33 (architecture-only, ~20K nodes from `generate-system-viz.mjs`)
- `system-graph.previous.json` (372 MB) — prior snapshot

### 2. **How the Graph is Generated**

**Two separate producers (2026-05-17 split):**

1. **`regen-viz.mjs`** (~100s runtime)
   - Owns the canonical merged system-graph.json (~372K nodes with fsCoverage)
   - Runs FAST[] augmentations by default: generate-engine-domain-inventory, generate-knowledge-inventory, generate-staleness-overlay, generate-wiring-overlay, generate-galaxy-constituents, etc.
   - **`--full` flag** also runs heavy fs-deep + L11 filesystem-coverage layers
   - Includes drift-gate validation (hard-fail W4/U-DRIFT-HARD-FAIL) — reads DRIFT_REPORT.json, exits non-zero on truncated/root-missing graphs
   - **Merge guard** (`regen-viz-merge-guard.mjs`, lines 1-60): prevents silent no-ops when merge subprocess fails or graph shrinks while augmentations exist on disk (Karpathy R12: fail-loud)

2. **`generate-system-viz.mjs`** — architecture-only
   - Outputs to separate `architecture-graph.json` (was clobbering system-graph.json before U-VIZ-SPLIT-OUT-FILE fix, 2026-05-17)
   - ~10 layers (L0 Personas → L10 Vault), 20K nodes, no fsCoverage

**Related generators:**
- `system-viz-on-commit.mjs` (lines 1-37): 4-round full refresh chain (100s total measured 2026-05-10)
  - Rounds: generate-system-viz → merge-augmentations → detect-newly-built → merge-augmentations (round 2, skipped by default to avoid git contention)
  - W1/U-FOLD-DEFAULT: fold-debt tracking (`.newly-built-fold-debt.json`) to
... [+2761 chars truncated]

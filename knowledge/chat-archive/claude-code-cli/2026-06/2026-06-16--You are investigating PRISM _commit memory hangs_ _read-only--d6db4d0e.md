---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "You are investigating PRISM \"commit memory hangs\" (read-only; do NOT edit). The "
date: "2026-06-16"
first_ts: "2026-06-16T18:51:21.486Z"
last_ts: "2026-06-16T19:08:13.122Z"
cwd: "H:\\prism"
messages: 85
user_msgs: 37
assistant_msgs: 48
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a06f3ae48eac553eb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# You are investigating PRISM "commit memory hangs" (read-only; do NOT edit). The 

> **claude-code-cli** | 2026-06-16 | 85 msgs (37 user / 48 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a06f3ae48eac553eb.jsonl`

## Transcript

### User | 2026-06-16T18:51:21.486Z

You are investigating PRISM "commit memory hangs" (read-only; do NOT edit). The operator reports: "optimize commit memory relative to pc specs, we're still getting commit memory hangs even though the system is twice as powerful as it was a few months ago and we're running less chats." The box is a Blackwell build: RTX PRO 6000 96GB VRAM, Ryzen 9950X3D 32 threads, 136GB RAM, NVMe.

Your job: find the ROOT CAUSE of memory-heavy hangs that fire around `git commit` and chat Stop. Do NOT fabricate — read actual files and measure actual sizes. Investigate:

1. What fires on git commit: read H:/prism/.git/hooks/pre-commit and post-commit (if present). Report what they invoke.

2. What fires on chat Stop (Stop hooks are the heaviest commit-adjacent work): grep H:/.claude/settings.json and H:/prism/.claude/settings.json for the Stop hook array. Find memory-heavy ones, especially: stop-obsidian-memory-feed.mjs, scrutinize-before-stop.mjs, tribal embed/rerank hooks, stop-auto-capture, error-pattern-promote, anything touching the tribal index or system graph.

3. Measure the BIG files these operations load (this is the likely hang source — V8 string cap / heap pressure):
   - `ls -la H:/prism/state/shared/tribal-embed-index.json* 2>&1` (there's a known V8 512MiB string-cap + sharding history)
   - `ls -la H:/prism/state/shared/system-viz/*.json 2>&1 | head` and the 644MB system-graph.json
   - `ls -la H:/prism/state/shared/nn-graph/*.jsonl 2>&1`
   - any embeddings files
   Report exact byte sizes.

4. Node heap config: grep scripts + hooks + package.json for `--max-old-space-size` and `NODE_OPTIONS`. Which commit/Stop-path scripts run WITHOUT a heap bump? (Known pattern: a script spawns a heap-bumped child but does heavy work in its own default-heap process → OOM. See the 2026-06-11 GNN lifecycle regression.) Report scripts on the commit/Stop path that lack a heap bump.

5. The git-sync / git-add-lane / worktree-commit-route hooks: do any load large files or do full-tree scans
... [+568 chars truncated]

### Assistant | 2026-06-16T18:51:28.532Z

I'll investigate the commit memory hangs systematically. Let me read the actual files in parallel.

### Assistant | 2026-06-16T18:51:28.798Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:51:29.156Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:51:29.836Z

[tool_use: Bash]

### User | 2026-06-16T18:52:07.995Z

[tool_result] total 69
drwxr-xr-x 1 wompu 197611    0 May 16 16:09 .
drwxr-xr-x 1 wompu 197611    0 Jun 16 13:51 ..
-rwxr-xr-x 1 wompu 197611  478 Apr 21 22:22 applypatch-msg.sample
-rwxr-xr-x 1 wompu 197611  896 Apr 21 22:22 commit-msg.sample
-rwxr-xr-x 1 wompu 197611 4726 Apr 21 22:22 fsmonitor-watchman.sample
-rwxr-xr-x 1 wompu 197611 1089 May 16 16:09 post-commit
-rwxr-xr-x 1 wompu 197611  189 Apr 21 22:22 
... [+665 chars truncated]

### User | 2026-06-16T18:52:08.328Z

[tool_result] -rw-r--r-- 1 wompu 197611   3248859 May 23 22:32 H:/prism/state/shared/tribal-embed-index.blurbs-cache.json
-rw-r--r-- 1 wompu 197611     16037 Jun  8 23:32 H:/prism/state/shared/tribal-embed-index.CLOBBERED-2026-06-08-stub.json
-rw-r--r-- 1 wompu 197611       473 Jun 16 13:02 H:/prism/state/shared/tribal-embed-index.manifest.json
-rw-r--r-- 1 wompu 197611 503314708 Jun 16 13:01 H:/prism/state/sha
... [+247 chars truncated]

### User | 2026-06-16T18:52:08.413Z

[tool_result] -rw-r--r-- 1 wompu 197611   1055587 Jun 15 22:26 H:/prism/state/shared/system-viz/action-engine-edges-augmentation.json
-rw-r--r-- 1 wompu 197611     45095 Jun 15 22:26 H:/prism/state/shared/system-viz/actions-atomic-augmentation.json
-rw-r--r-- 1 wompu 197611      3954 Jun 16 12:14 H:/prism/state/shared/system-viz/agent-overlay.json
-rw-r--r-- 1 wompu 197611      2315 Jun 15 22:24 H:/prism/state/
... [+3025 chars truncated]

### Assistant | 2026-06-16T18:52:13.397Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:52:14.147Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:52:14.251Z

[tool_use: Read]

### User | 2026-06-16T18:53:05.977Z

[tool_result] 765170052 H:/prism/state/shared/system-viz/system-graph.json
519458359 H:/prism/state/shared/system-viz/system-graph.previous.json
477583092 H:/prism/state/shared/system-viz/obsidian-augmentation.json
267955063 H:/prism/state/shared/system-viz/system-graph-index.json
259373585 H:/prism/state/shared/system-viz/system-graph-normalized.json
132480809 H:/prism/state/shared/system-viz/h-drive-census.js
... [+979 chars truncated]

### User | 2026-06-16T18:53:24.749Z

[tool_result] 1	#!/bin/sh
2	# PRISM post-commit hook
3	# === PRISM SYSTEM-VIZ AUTO-REFRESH (managed; do not edit between markers) ===
4	# Auto-refresh the system-viz graph on every commit so rgs3/forge3 + the open
5	# browser tab + any chat consuming system-graph.json see fresh state immediately.
6	# Runs in background — does not block the commit. Exit code is ignored.
7	(
8	  cd "$(git rev-parse --show-topleve
... [+762 chars truncated]

### User | 2026-06-16T18:53:34.996Z

[tool_result] -rw-r--r-- 1 wompu 197611   1649256 Jun  4 12:47 H:/prism/state/shared/nn-graph/ghost-node-embeddings.jsonl
-rw-r--r-- 1 wompu 197611 118118944 Jun 15 09:35 H:/prism/state/shared/nn-graph/node-embeddings-768d.jsonl
-rw-r--r-- 1 wompu 197611     71227 Jun 16 13:06 H:/prism/state/shared/nn-graph/retrain-lifecycle.jsonl

### Assistant | 2026-06-16T18:53:41.180Z

Let me continue the investigation in parallel across all remaining areas.

### Assistant | 2026-06-16T18:53:42.398Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:53:43.619Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:53:44.672Z

[tool_use: Bash]

### User | 2026-06-16T18:54:19.504Z

[tool_result] #!/usr/bin/env node
/**
 * system-viz-on-commit.mjs — full refresh chain.
 *
 * Called by:
 *   - Git post-commit hook (auto-fires on every commit)
 *   - Cron (hourly)
 *   - Slash command /system-viz
 *   - Manual: `node scripts/system-viz-on-commit.mjs`
 *
 * Sequence:
 *   1. generate-system-viz.mjs           — base graph from live PRISM state
 *   2. merge-augmentations.mjs       
... [+3939 chars truncated]

### User | 2026-06-16T18:55:08.572Z

[tool_result] {
  "schemaVersion": "1.0.0",
  "model": "nomic-embed-text:latest",
  "dim": 768,
  "generatedAt": "2026-06-16T18:01:39.896Z",
  "wikiEmbeddedAt": "2026-06-16T18:01:39.896Z",
  "wikiEmbeddedCount": 44324,
  "sharded": true,
  "shardCount": 3,
  "totalEntries": 73857,
  "shards": [
    {
      "file": "tribal-embed-index.shard-000.json",
      "count": 31570,
      "bytes": 503314708
... [+246 chars truncated]

### User | 2026-06-16T18:55:51.020Z

[tool_result] # Canonical Host Facts + Ollama Routing — DESKTOP-N7MI1VB (2026-06-09, slot:papa)

> **Single source of truth** for this host's hardware + local-LLM roster. Verified LIVE 2026-06-09 (`os.cpus/totalmem/freemem`, `nvidia-smi`, `ollama /api/tags`). Every doc/skill/CLAUDE.md that cites specs or Ollama models should reference THIS file, not re-state numbers (that is how the drift this campaign targets 
... [+4601 chars truncated]

### Assistant | 2026-06-16T18:55:54.297Z

Let me continue reading the critical files in parallel.

### Assistant | 2026-06-16T18:55:55.337Z

[tool_use: Read]

### Assistant | 2026-06-16T18:55:58.425Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:55:59.906Z

[tool_use: Bash]

### User | 2026-06-16T18:56:19.497Z

[tool_result] 80	// with the failed stage + exit code + a stderr tail, so an operator (and the
81	// U-GO-B5 SessionStart staleness inject) can see WHY the graph stopped
82	// updating without re-running the chain or digging through git history.
83	// Success and failure markers never delete each other — a reader compares
84	// their `ts` fields; the newer marker is the current state.
85	const REGEN_FAILURE_PAT
... [+5171 chars truncated]

### User | 2026-06-16T18:56:46.250Z

[tool_result] Stop hook count: 6
 - "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/goal-complete-gate.mjs
 - "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/scrutinize-before-stop.mjs
 - "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/stop-task-boundary-compact-nudge.mjs
 - "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/macro-bulk-emit-guard.mjs
 - "$CLAUDE_PROJECT_DIR/.claude/hoo
... [+5396 chars truncated]

### User | 2026-06-16T18:58:27.770Z

[tool_result] Stop hook count: 1
 - "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/stop-auto-wire.mjs
 - "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/stop-consensus-drain.mjs
 - "H:/.claude/bin/portable-node" H:/prism/.claude/helpers/async-hook-enqueue.mjs --hook H:/prism/.claude/hooks/git-sync-stop.mjs --tier T4 --event Stop
 - "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/output-ca
... [+2975 chars truncated]

### Assistant | 2026-06-16T18:58:37.821Z

That's 66+ Stop hooks across two settings files firing in sequence. Let me now measure the heaviest ones and check heap configs.

### Assistant | 2026-06-16T18:58:38.451Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:58:39.156Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:58:39.959Z

[tool_use: Bash]

### User | 2026-06-16T18:59:28.562Z

[tool_result] #!/usr/bin/env node
// tier: T4
/**
 * stop-obsidian-memory-feed.mjs — Stop Hook
 * =========================================
 *
 * Dedicated, RELIABLE auto-memory -> Obsidian feed.
 *
 * Spawns `obsidian-memory-sync.mjs --quiet` detached on Stop so every memory
 * file written to C:/Users/<u>/.claude/projects/H--prism/memory/*.md gets
 * mirrored into the H: Obsidian vault (knowledge/memories/<ty
... [+2765 chars truncated]

### User | 2026-06-16T18:59:28.610Z

[tool_result] #!/usr/bin/env node
// stop-brain-refresh.mjs — Stop hook: fire-and-forget the consolidated brain-refresh.
// Spawns scripts/brain-refresh.mjs DETACHED (never synchronously — a full run is ~30min and would
// block the chat's Stop). Stamp-throttled so 13-26 simultaneous Stops collapse to ~one spawn per
// window. brain-refresh's own throttle + O_EXCL lock are the real serializer; this is just spaw
... [+1567 chars truncated]

### User | 2026-06-16T18:59:28.672Z

[tool_result] #!/usr/bin/env node
// tier: T3
/**
 * stop-wiki-from-nodes-autopopulate.mjs — Stop hook (T3, non-blocking)
 *
 * Closes the operator ask "auto populating anytime either domain gains
 * another node". Behavior on Stop:
 *
 *   1. Check the system-viz graph mtime — if it's newer than our last
 *      successful run (cache sidecar), the graph has gained/lost nodes.
 *   2. Throttle: do not fire more
... [+3136 chars truncated]

### Assistant | 2026-06-16T18:59:40.086Z

Now let me investigate the heap configs, the system-viz-on-commit chain, and the heaviest Stop hooks in parallel.

### Assistant | 2026-06-16T18:59:41.617Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:59:43.140Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:59:44.696Z

[tool_use: Bash]

### User | 2026-06-16T18:59:56.656Z

[tool_result] [rtk] WARNING: untrusted project filters (.rtk/filters.toml)
[rtk] Filters NOT applied. Run `rtk trust` to review and enable.
H:/prism/scripts/build-card-offset-index.mjs
H:/prism/scripts/build-graph-index.mjs
H:/prism/scripts/build-graph-index.test.mjs
H:/prism/scripts/build-viz-adjacency.mjs
H:/prism/scripts/code-graph-projection.mjs
H:/prism/scripts/cron-revwalk.mjs
H:/prism/scripts/docustrata-
... [+1859 chars truncated]

### system

... [5 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-16T19:00:37.967Z

[tool_use: Bash]

### User | 2026-06-16T19:00:40.148Z

[tool_result] 1	/**
2	 * ensure-heap-floor.mjs — guarantee a minimum V8 old-space heap for child spawns.
3	 *
4	 * THE BUG IT FIXES (2026-06-09, confirmed via a live MCP outage). The MCP server
5	 * OOMs on boot — `FATAL ERROR: Reached heap limit Allocation failed` — because it
6	 * loads 4000+ tribal tips + registries + graph during its ~40-50s cold boot, far
7	 * exceeding the **384MB** `--max-old-space-size`
... [+1839 chars truncated]

### User | 2026-06-16T19:00:57.105Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'max-old-space-size\|ensure-heap-floor\|reexec\|self.*reexec\|heap'

### User | 2026-06-16T19:01:12.714Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 1 files:

H:/prism/scripts/merge-augmentations.mjs:31:// regen-viz.mjs already passes --max-old-space-size=16384 when spawning this
H:/prism/scripts/merge-augmentations.mjs:45:[`--max-old-space-size=${HEAP_MB_REQUI
... [+274 chars truncated]

### Assistant | 2026-06-16T19:01:21.093Z

Critical finding: `generate-system-viz.mjs` has NO heap bump but is in the commit chain. Let me now check the portable-node heap cap, the commit-chain spawn sequence, and the heaviest Stop hooks.

### Assistant | 2026-06-16T19:01:22.305Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:01:23.449Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:01:24.055Z

[tool_use: Read]

### User | 2026-06-16T19:01:28.168Z

[tool_result] 200	
201	// --fold-debt-status: read-only verification channel. Runs BEFORE the pid
202	// guard so it never contends with a live chain. This is W1's re-measurable
203	// signal (forge-audit-v2 doctrine: a finding needs a re-runnable check).
204	if (process.argv.includes("--fold-debt-status")) {
205	  const maxHrs = (() => {
206	    const v = Number(process.env.PRISM_FOLD_DEBT_MAX_HRS);
207	    re
... [+5646 chars truncated]

### User | 2026-06-16T19:01:29.818Z

[tool_result] #!/usr/bin/env node
// tier: T4
/**
 * stop-obsidian-memory-extract.mjs — Stop Hook
 * =============================================
 *
 * Extracts session learnings and writes to Obsidian vault.
 * Uses Ollama (FREE) to analyze the session and extract:
 * - Patterns that worked
 * - Mistakes to avoid
 * - Decisions made
 * - Context for next session
 *
 * This completes the memory loop:
 *   work
... [+1935 chars truncated]

### User | 2026-06-16T19:01:31.017Z

[tool_result] #!/bin/bash
# portable-node — Tries H: drive Node.js first, falls back to C: drive.
# Works in Git Bash on Windows.
#
# ─── HEAP CEILING (MCP-FLEET-CAPACITY-MS0, 2026-06-08) ───
# V8 defaults to ~2GB old-space on Windows. A hook needs ~50-100MB; only the
# few hooks that parse the 70MB+ system-graph.json need real headroom.
#
# THE OVER-COMMIT BUG this fixes: the prior version set a BLANKET 4GB
# 
... [+1948 chars truncated]

### Assistant | 2026-06-16T19:01:37.626Z

Excellent findings so far. Let me finish the remaining critical checks in parallel.

### Assistant | 2026-06-16T19:01:38.830Z

[tool_use: Read]

### Assistant | 2026-06-16T19:01:40.430Z

[tool_use: Bash]

### User | 2026-06-16T19:01:42.212Z

[tool_result] 40	# design — a missed advisory fire is preferable to compounding crashes.
41	
42	if [[ -z "$NODE_OPTIONS" ]]; then
43	    # Default hook heap cap (commit-reservation control). Override per-invocation
44	    # by exporting NODE_OPTIONS yourself, or fleet-wide via PRISM_HOOK_HEAP_MB.
45	    export NODE_OPTIONS="--max-old-space-size=${PRISM_HOOK_HEAP_MB:-384}"
46	fi
47	
48	run_node() {
49	    local 
... [+934 chars truncated]

### Assistant | 2026-06-16T19:01:42.450Z

[tool_use: Bash]

### User | 2026-06-16T19:01:53.032Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'max-old-space-size\|NODE_OPTIONS\|ensure-heap\|HEAP_MB'

### User | 2026-06-16T19:02:01.673Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'loadGraph\|readFileSync.*system-graph\|JSON\.parse.*graph\|tribal.*shard\|load-tribal'

### Assistant | 2026-06-16T19:02:09.115Z

Good - generate-system-viz.mjs has no heap bump either. Now check the tribal-rerank hooks (UserPromptSubmit heavy hitters) and the git hooks for full-tree scans.

### Assistant | 2026-06-16T19:02:11.473Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:02:13.413Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:02:15.790Z

[tool_use: Bash]

### User | 2026-06-16T19:03:35.922Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
/usr/bin/grep: H:/prism/.claude/hooks/tribal-rerank.mjs: No such file or directory
0 matches for 'load-tribal\|tribal.*shard\|readFileSync.*tribal\|loadTribalIndex'

### User | 2026-06-16T19:04:44.469Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
25 matches in 1 files:

H:0:195:    return spawnSync(git, args, { cwd: process.cwd(), timeout: 2000, enco...
H:0:299:const wtRes = spawnSync(git, ["worktree", "list", "--porcelain"], {
H:0:4: * git-add-lane-guard.mjs — PreToolU
... [+600 chars truncated]

### User | 2026-06-16T19:05:04.266Z

[tool_result] Total hook files: 719

### Assistant | 2026-06-16T19:05:11.947Z

Now check the tribal-rerank spawn path (which IS wired) and the scrutinize-before-stop heap behavior, plus the git-sync-stop full-tree scan detail.

### Assistant | 2026-06-16T19:05:13.271Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:05:14.274Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:05:16.357Z

[tool_use: Bash]

### User | 2026-06-16T19:05:46.319Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
1 matches in 1 files:

H:/prism/scripts/lib/tribal-rerank-spawn.mjs:10:// (state/shared/tribal-embed-index.json) is ~167MB and growing. The reranker's

### User | 2026-06-16T19:06:08.470Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'git status\|git diff\|git ls-files\|spawnSync\|execSync'

### User | 2026-06-16T19:06:25.713Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'max-old-space\|NODE_OPTIONS\|heap\|HEAP'
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PAT
... [+277 chars truncated]

### Assistant | 2026-06-16T19:06:33.313Z

Critical: `scrutinize-before-stop.mjs` runs `git status --porcelain` on the whole repo (13K+ uncommitted files). Let me read its full context and check the tribal-rerank-spawn heap.

### Assistant | 2026-06-16T19:06:33.905Z

[tool_use: Read]

### Assistant | 2026-06-16T19:06:34.764Z

[tool_use: Read]

### User | 2026-06-16T19:06:35.672Z

[tool_result] 125	  for (let i = 0; i < 8; i++) {
126	    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
127	    const parent = path.dirname(cur);
128	    if (parent === cur) break;
129	    cur = parent;
130	  }
131	  return process.cwd();
132	}
133	
134	function meaningfulChangedFiles(projectRoot) {
135	  try {
136	    const out = execSync("git status --porcelain", {
137	      cwd: 
... [+2624 chars truncated]

### Assistant | 2026-06-16T19:06:35.989Z

[tool_use: Bash]

### User | 2026-06-16T19:06:35.994Z

[tool_result] 1	// scripts/lib/tribal-rerank-spawn.mjs
2	// -------------------------------------
3	// OBSIDIAN-VAULT-SYNERGY/U-OBS-TRIBAL-HEAP-SPAWN (slot:alpha, 2026-06-09)
4	//
5	// Single source of truth for SPAWNING the tribal reranker (.claude/scripts/
6	// tribal-rerank.mjs, PSN leg #5). The spawn POLICY — heap ceiling, timeout,
7	// stdio, windowsHide, env — lives here so it can never drift between call
... [+3045 chars truncated]

### User | 2026-06-16T19:06:40.390Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
1 matches in 1 files:

1074:0:`${l5Coverage.unwired} unwired engines = ${100 - l5Coverage.coverage_pct}% of...

### Assistant | 2026-06-16T19:08:13.122Z

I now have all the data needed. Here is the complete root-cause report.

---

## Root Cause Report: Commit/Stop Memory Hangs

All findings are verified from actual files. Nothing is fabricated.

---

### Measured File Sizes (the data substrate these hangs run on)

| File | Bytes | Notes |
|---|---|---|
| `state/shared/system-viz/system-graph.json` | **765 MB** | Up from 412 MB (comment in system-viz-on-commit.mjs:283) — grows every regen |
| `state/shared/system-viz/system-graph.previous.json` | 519 MB | Prior snapshot kept on disk |
| `state/shared/system-viz/obsidian-augmentation.json` | 478 MB | Folded into graph on every merge pass |
| `state/shared/system-viz/system-graph-index.json` | 268 MB | |
| `state/shared/system-viz/system-graph-normalized.json` | 259 MB | |
| `state/shared/tribal-embed-index.shard-000.json` | 503 MB | |
| `state/shared/tribal-embed-index.shard-001.json` | 503 MB | |
| `state/shared/tribal-embed-index.shard-002.json` | 171 MB | |
| **Tribal index total** | **1.177 GB** (3 shards, 73,857 entries) | Up from ~167 MB when tribal-rerank-spawn.mjs was written |
| `state/shared/nn-graph/node-embeddings-768d.jsonl` | 118 MB | |
| `state/shared/system-viz/h-drive-census.json` | 133 MB | |
| `state/shared/system-viz/architecture-graph.json` | 64 MB | |

---

### Ranked Hang Sources

#### P0 — COMMIT PATH: post-commit spawns system-viz-on-commit.mjs with NO heap flag on the orchestrator process itself

**Verified source:** `H:/prism/.git/hooks/post-commit` lines 8–13 spawns:
```
node scripts/system-viz-on-commit.mjs
```
with no `--max-old-space-size` and no `NODE_OPTIONS` in the hook environment.

`system-viz-on-commit.mjs` sets `NODE_OPTIONS` via `process.env` before spawning its children (line 277–283 — sets `PRISM_VIZ_REGEN_HEAP_MB`, default 24576 MB, inherited by grandchildren). But the **orchestrator process itself** — the one that reads PID files, does `fs.statSync`, and manages the chain — runs under whatever `NODE_OPTIONS` the calling shell
... [+10964 chars truncated]

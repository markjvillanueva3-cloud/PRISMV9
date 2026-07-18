---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b785b10-fc31-4613-8c28-594f7533b4f2"
title: "You are a forge-audit scout for PRISM, lens=\"system-viz\". GOAL (operator): high "
date: "2026-06-04"
first_ts: "2026-06-04T12:43:40.658Z"
last_ts: "2026-06-04T12:49:14.826Z"
cwd: "H:\\prism"
messages: 72
user_msgs: 28
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/workflows/wf_9427cd3d-00b/agent-af06561699ad95b2a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# You are a forge-audit scout for PRISM, lens="system-viz". GOAL (operator): high 

> **claude-code-cli** | 2026-06-04 | 72 msgs (28 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/workflows/wf_9427cd3d-00b/agent-af06561699ad95b2a.jsonl`

## Transcript

### User | 2026-06-04T12:43:40.658Z

You are a forge-audit scout for PRISM, lens="system-viz". GOAL (operator): high hit rate, high-ROI token savings, efficient system with NO git-commit conflicts between chats and NO inefficiencies in Obsidian app / system-viz / PSN. The local 32b (qwen2.5-coder:32b on the 96GB RTX PRO 6000 Blackwell) does heavy token-work; Claude reviews. THIS is the alpha (token-optimization + efficiency + Obsidian) slot.

Repo H:/prism (cad-fusion-live-ms0). READ-ONLY. Surfaces: scripts/ (galaxy-*-synthesis.mjs, ask-ollama.mjs, generate-system-viz.mjs), .claude/hooks/+helpers/ (ollama-*, ollama-cost-router.mjs, host-class.mjs, git-commit-mutex.mjs), mcp-server/src/engines/ModelRoutingEngine.ts, knowledge/memories/+wiki/, state/shared/. Tools: Grep/Glob/Read + git log for shipped-check.


ALREADY SHIPPED THIS SESSION (do NOT re-propose — DONE, verify via git log):
- FLEET-GIT-CONTENTION-MS0: U-FGC-1 (git-commit-mutex.mjs commit serialization + ref-race retry + pathspec no-absorb), U-FGC-4 (sweepStaleIndexLock — orphaned .git/index.lock self-heal in the mutex, age+frozen gated), U-FGC-5 (git-index-lock-sweep.mjs PreToolUse:Bash hook JIT-clears dead orphan index.lock, wired first in Bash cluster). Commits c653dc4b25, 606424dc12.
- BLACKWELL-TOKEN-SYNERGY-MS0: U-BW-ROUTE-PROFILE (ModelRoutingEngine home_blackwell), U-BW-OFFLOAD-TIER (cost-router balanced->strong 14b on Blackwell), U-BW-BEST-TIER-REACH (search_synthesis -> best 32b reachable). Commit e2cdbe2e86.
- host-aware-synthesis-model.mjs resolver BUILT (scripts/lib/) — its CONSUMER wiring (galaxy-*-synthesis hardcode qwen2.5-coder:7b; ask-ollama.mjs hardcodes 3b) is KNOWN+PENDING; do not re-flag the resolver itself.
PENDING/known (refinements OK, note they're known): U-FGC-2 (quarantine ~13,788 uncommitted churn — golf lane), U-FGC-3 (slot-worktree adoption — golf+fleet). India owns U-ROUTE-LADDER (~10 deepseek-r1:14b hardcodes). Offload rate ~11% vs 30% target.

YOUR LENS: system-viz: ~548MB graph, regen-viz single-writer, stale
... [+988 chars truncated]

### Assistant | 2026-06-04T12:44:07.636Z

I'll do a focused read-only forge-audit scan on the system-viz lens. Let me start by examining the key surfaces.

### Assistant | 2026-06-04T12:44:08.372Z

[tool_use: Glob]

### Assistant | 2026-06-04T12:44:08.557Z

[tool_use: Glob]

### Assistant | 2026-06-04T12:44:09.021Z

[tool_use: Glob]

### Assistant | 2026-06-04T12:44:09.362Z

[tool_use: Glob]

### User | 2026-06-04T12:44:30.619Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T12:44:31.268Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T12:44:31.401Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T12:44:32.078Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-04T12:44:35.531Z

The globs timed out. Let me narrow the path and use direct directory listing instead.

### Assistant | 2026-06-04T12:44:37.014Z

[tool_use: Bash]

### User | 2026-06-04T12:44:44.626Z

[tool_result] _emergency-unwire-yolo-25.mjs*
add-ollama-skill-policy-frontmatter.mjs*
add-ollama-skill-policy-frontmatter.test.mjs
ai-training-galaxy-audit.mjs*
ask-ollama-fallback.test.mjs
ask-ollama.mjs*
audit-roadmap-viz-bindings.mjs*
augment-graph-with-awareness.mjs*
augment-molecules.mjs*
backfill-galaxy-master-brain-link.mjs*
batch-ollama-vision-extract.mjs*
batch-ollama-vision-extract.test.mjs
build-requ
... [+1496 chars truncated]

### Assistant | 2026-06-04T12:44:47.889Z

Let me find the canonical regen-viz writer and the merge/augmentation scripts.

### Assistant | 2026-06-04T12:44:49.958Z

[tool_use: Bash]

### User | 2026-06-04T12:44:57.207Z

[tool_result] build-system-viz-livediff.mjs*
detect-system-viz-drift.mjs*
detect-system-viz-drift.test.mjs*
expand-system-viz-l12-files.mjs*
expand-system-viz-l12-files.test.mjs
generate-system-viz.mjs*
install-system-viz-git-hook.mjs*
launch-system-viz-dashboard.ps1
merge-augmentations.mjs*
regen-viz.mjs*
system-viz-action-overlay.mjs*
system-viz-add-node.mjs*
system-viz-cot-reason-blast-radius.mjs*
system-viz
... [+1572 chars truncated]

### Assistant | 2026-06-04T12:45:01.443Z

Now let me read the core files: regen-viz.mjs, merge-augmentations.mjs, and the merge-guard lib.

### Assistant | 2026-06-04T12:45:01.898Z

[tool_use: Read]

### Assistant | 2026-06-04T12:45:02.088Z

[tool_use: Read]

### User | 2026-06-04T12:45:06.230Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1029 of 2829 total (58420 tokens, cap 25000). Call Read with offset=1030 limit=1029 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	#!/usr/bin/env node
2	/**
3	 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-
... [+54306 chars truncated]

### User | 2026-06-04T12:45:06.342Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+28417 chars truncated]

### Assistant | 2026-06-04T12:45:16.563Z

I have a clear picture of regen-viz.mjs now. I can see the merge-augmentations pattern — ~80 `loadOptional` calls, each rebuilt in a single sequential merge inside a 24GB heap process. Let me look at key efficiency surfaces: the I/O lib, the find/sidecar pattern, and the obsidian bridge for staleness. Let me check the obvious inefficiency surfaces and conflict points.

### Assistant | 2026-06-04T12:45:17.405Z

[tool_use: Read]

### Assistant | 2026-06-04T12:45:17.717Z

[tool_use: Read]

### User | 2026-06-04T12:45:18.965Z

[tool_result] 1	/**
2	 * scripts/lib/graph-io.mjs — streaming read+write for `system-graph.json`
3	 *
4	 * Bypasses V8's ~512MB max-string-length ceiling that crashes legacy
5	 * `JSON.parse(fs.readFileSync(p, "utf8"))` (read) and `JSON.stringify(G)`
6	 * (write) calls once the graph passes ~512MB serialized.
7	 *
8	 * Discovered: papa /loop 2026-05-23, U-PSN-VIZ-REGEN, on the 541MB graph.
9	 * Memory: `referen
... [+4428 chars truncated]

### User | 2026-06-04T12:45:19.744Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### Assistant | 2026-06-04T12:45:26.251Z

Now let me check the regen-viz scheduling/staleness surface (what triggers regen, the 9.9h staleness), the on-commit hook, and the find/sidecar consumers. Let me also check how galaxy synthesis uses ollama (token-savings angle) and the host-aware resolver consumer status.

### Assistant | 2026-06-04T12:45:26.862Z

[tool_use: Read]

### Assistant | 2026-06-04T12:45:28.032Z

[tool_use: Bash]

### User | 2026-06-04T12:45:30.666Z

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
... [+4704 chars truncated]

### User | 2026-06-04T12:45:36.621Z

[tool_result] bridge-contract-verify.mjs
bridge-contract-verify.test.mjs
bridge-evidence-detector.mjs
bridge-evidence-detector.test.mjs
db-bridge-absorption-demo.mjs
db-bridge-absorption-demo.test.mjs
db-node-bridge.mjs
db-node-bridge.test.mjs
graph-node-embedding-bridge.mjs*
graph-node-embedding-bridge.test.mjs*
octopus-consumption-bridge.mjs
octopus-consumption-bridge.test.mjs
ollama-bridge-telemetry.mjs
olla
... [+573 chars truncated]

### Assistant | 2026-06-04T12:45:41.538Z

The obsidian bridge v2 is at `scripts/system-viz-obsidian-bridge-v2.mjs` (not lib/). Let me read it (the staleness driver — only runs on `--full`), check the post-commit git hook itself for the conflict surface, and look at the obsidian bridge for token-savings opportunity.

### Assistant | 2026-06-04T12:45:42.240Z

[tool_use: Read]

### Assistant | 2026-06-04T12:45:42.869Z

[tool_use: Bash]

### User | 2026-06-04T12:45:46.513Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-obsidian-bridge-v2.mjs
4	 *
5	 * Replaces the legacy v1 bridge which OOM'd on the 126K-node graph due to a
6	 * triple-nested substring scan (nodes × keywords × backlink-keys).
7	 *
8	 * v2 strategy:
9	 *   1. Scope-limit: only process semantically meaningful node layers
10	 *      (L0..L8 + L10). Skip L9 (fs root), L4a (9,228 actions), L11 (102,666
11	 
... [+5006 chars truncated]

### User | 2026-06-04T12:45:52.908Z

[tool_result] #!/bin/sh
# PRISM post-commit hook
# === PRISM SYSTEM-VIZ AUTO-REFRESH (managed; do not edit between markers) ===
# Auto-refresh the system-viz graph on every commit so rgs3/forge3 + the open
# browser tab + any chat consuming system-graph.json see fresh state immediately.
# Runs in background — does not block the commit. Exit code is ignored.
(
  cd "$(git rev-parse --show-toplevel)" 2>/dev/null 
... [+685 chars truncated]

### Assistant | 2026-06-04T12:45:59.087Z

This is a key finding. The post-commit hook fires `system-viz-on-commit.mjs` **backgrounded on EVERY commit across all chats**, with no concurrency guard at the hook level (the lock is inside the script, which exits with a skip — but that means most commits' regens are wasted spawns + the 30s+ chain runs N times redundantly). Now let me verify the staleness root cause and look at the obsidian bridge model usage and how regen is scheduled. Let me check the obsidian backlink computation (is it token-work that could go to the 32b?) and confirm the `--full` gating that drives the 9.9h staleness.

### Assistant | 2026-06-04T12:46:01.899Z

[tool_use: Bash]

### Assistant | 2026-06-04T12:46:02.700Z

[tool_use: Read]

### User | 2026-06-04T12:46:11.132Z

[tool_result] 956fbabdb3 [MAIN] [CROSS-SUBSTRATE-SYNERGY-MS0]/U-XSUB-GALAXY-ROOST (slot:sierra): lift owned-by-slot coverage 7 -> ALL 34 galaxies via galaxy-roost nodes (ghost.galaxy.<name> nested under ghost.galaxy_federation) + roost->slot edges; merge splice folds newNodes (id-deduped, nodes-before-edges, mirrors engineDomain). 82 edges (7 eng-canon + 41 infer + 34 roost) + 34 nodes, schema-valid, dangling-i
... [+1832 chars truncated]

### User | 2026-06-04T12:46:13.849Z

[tool_result] 120	  const block = body.match(/^tags\s*:\s*\n((?:\s+-\s+.+\n?)+)/m);
121	  if (inline) {
122	    tags = inline[1].split(",").map((t) => t.trim().replace(/['"]/g, "")).filter(Boolean);
123	  } else if (block) {
124	    tags = block[1].split("\n").map((l) => l.replace(/^\s*-\s*/, "").trim().replace(/['"]/g, "")).filter(Boolean);
125	  }
126	  const titleMatch = body.match(/^title\s*:\s*['"]?(.+?)['
... [+4291 chars truncated]

### Assistant | 2026-06-04T12:46:23.544Z

The obsidian bridge is pure string-tokenization indexing (no model calls — not a token-savings target). Key insight: it walks the wiki+memory dirs THREE TIMES (`buildWikiIndex` walks WIKI, `buildMemIndex` walks MEM, `countBacklinks` walks BOTH again). Let me confirm and check the staleness scheduling root cause. Let me look at the revwalk task installer and how the obsidian bridge is gated (only `--full`).

### Assistant | 2026-06-04T12:46:24.810Z

[tool_use: Read]

### Assistant | 2026-06-04T12:46:26.674Z

[tool_use: Read]

### User | 2026-06-04T12:46:27.534Z

[tool_result] 1	# install-system-viz-revwalk-task.ps1 — SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-CRON-RUNNER
2	#
3	# Registers a daily Windows scheduled task ("PRISM System-Viz Re-walk Daily") that
4	# invokes cron-revwalk.mjs at 03:15 local time (off-set from the 03:00 cleanup +
5	# 03:30 reaper tasks so the disk doesn't take three simultaneous walks). Idempotent
6	# — re-running updates the existing task.
7	#
8	# Com
... [+2768 chars truncated]

### User | 2026-06-04T12:46:29.425Z

[tool_result] 250	}
251	
252	function nodeIsIncluded(node) {
253	  if (!INCLUDE_LAYERS.has(node.layer)) return false;
254	  const tag = node.subgroup || node.kind || "";
255	  if (EXCLUDE_KINDS.has(tag)) return false;
256	  return true;
257	}
258	
259	async function main() {
260	  const t0 = Date.now();
261	  if (!existsSync(GRAPH_PATH)) {
262	    console.error("graph missing at", GRAPH_PATH);
263	    process.e
... [+4059 chars truncated]

### Assistant | 2026-06-04T12:46:37.009Z

Now I have a confirmed efficiency finding: `countBacklinks()` re-walks both WIKI_DIR and MEM_DIR (`walkMd` called a 3rd and 4th time) when those directory listings were already produced by `buildWikiIndex`/`buildMemIndex`. Let me verify a couple more high-value surfaces: the `existingIds = new Set(G.nodes.map(...))` rebuild repeated ~30+ times in merge-augmentations (already a known quadratic-fix target — they hoisted byId but NOT existingIds), and the find-cache/staleness. Let me grep the merge file for the repeated `existingIds` rebuild count and confirm the staleness driver.

### Assistant | 2026-06-04T12:46:37.973Z

[tool_use: Grep]

### Assistant | 2026-06-04T12:46:39.254Z

[tool_use: Grep]

### Assistant | 2026-06-04T12:46:39.903Z

[tool_use: Grep]

### User | 2026-06-04T12:46:42.511Z

[tool_result] scripts\merge-augmentations.mjs:60

Found 60 total occurrences across 1 file.

### User | 2026-06-04T12:46:43.387Z

[tool_result] scripts\merge-augmentations.mjs:4

Found 4 total occurrences across 1 file.

### User | 2026-06-04T12:46:43.816Z

[tool_result] scripts\merge-augmentations.mjs:69

Found 69 total occurrences across 1 file.

### Assistant | 2026-06-04T12:46:51.610Z

This is a major confirmed inefficiency. The merge script comments (lines 81-94) claim they hoisted `byId`/`byIdMulti` to fix the quadratic blowup, but there are still:
- **60** local `const existingIds = new Set(G.nodes.map(...))` rebuilds — each is an O(N) scan over the ~244K-node array, AND `G.nodes` GROWS as blocks push, so it's effectively O(N×blocks) ≈ 60 × 244K = ~14.6M node-iterations just rebuilding the same set.
- **69** local `new Set(G.edges.map(edgeKey))` rebuilds — edges array is even larger; 69 × full-edge-scan.

These per-block rebuilds are the actual heap/CPU driver behind the 24GB OOM headroom bumps and slow merge. Let me verify the staleness root and check git-commit-mutex interaction with the viz graph writes (conflict surface). Let me confirm the on-commit lock behavior and the staleness inject.

### Assistant | 2026-06-04T12:46:52.363Z

[tool_use: Read]

### User | 2026-06-04T12:47:00.561Z

[tool_result] 90	 * failure must never fail the chain (the graph itself is already fresh by
91	 * the time this runs). Records the graph's own mtime so a reader can tell
92	 * a stale sentinel (script ran) from a stale graph (merge silently no-op'd).
93	 */
94	function writeRegenSentinel(extra = {}) {
95	  try {
96	    let graphMtime = null;
97	    let graphBytes = null;
98	    try {
99	      const st = fs.stat
... [+5520 chars truncated]

### Assistant | 2026-06-04T12:47:04.375Z

Let me read the single-writer guard section to understand the on-commit concurrency behavior precisely — this is the git-conflict surface.

### Assistant | 2026-06-04T12:47:05.221Z

[tool_use: Read]

### User | 2026-06-04T12:47:11.554Z

[tool_result] 218	// Single-writer guard (added 2026-05-10 after multi-chat hang diagnosis).
219	// 6 concurrent chats commit within seconds → 6 concurrent system-viz-on-commit
220	// chains each reading+writing 41MB system-graph.json with no file locking →
221	// corrupted graph + filesystem contention → multi-minute chat hangs.
222	// PID-file ensures only one instance runs at a time. Crash-safe via
223	// pr
... [+5994 chars truncated]

### Assistant | 2026-06-04T12:47:20.497Z

I have enough confirmed surfaces. Let me do two final verifications: (1) confirm the on-commit chain does NOT git-add/commit the graph (so it's not a direct git-conflict — the graph is gitignored or left uncommitted), and (2) confirm the `existingIds` rebuild blocks actually push into G.nodes between rebuilds (proving the growing-array quadratic). I already saw blocks pushing to G.nodes. Let me check whether system-graph.json is tracked by git (the real git-conflict question).

### Assistant | 2026-06-04T12:47:21.494Z

[tool_use: Bash]

### User | 2026-06-04T12:47:37.722Z

[tool_result] state/shared/system-viz/obsidian-augmentation.json
state/shared/system-viz/system-graph-index.json
---tracked?---
state/shared/system-viz/LEVERAGE-WIRING-QUEUE.json
state/shared/system-viz/LEVERAGE-WIRING-QUEUE.md
state/shared/system-viz/_server.cjs
state/shared/system-viz/agent-overlay.css
state/shared/system-viz/agent-overlay.js
state/shared/system-viz/dashboard.html
state/shared/system-viz/drea
... [+218 chars truncated]

### Assistant | 2026-06-04T12:47:44.045Z

Critical git-conflict finding confirmed. `system-graph.json` (the ~548MB regenerated-every-commit artifact) **IS git-tracked**, while `obsidian-augmentation.json` and `system-graph-index.json` are gitignored. This means every regen rewrites a tracked 548MB binary-ish JSON, and many augmentation files (`dream-artifacts-augmentation.json`, `extracted-pdf-tips-augmentation.json`, `hotel-domain-features.json`) are also tracked. Let me confirm the scope of tracked augmentation/derived files — these are the cross-chat merge-conflict surface.

### Assistant | 2026-06-04T12:47:46.602Z

[tool_use: Bash]

### User | 2026-06-04T12:47:52.367Z

[tool_result] === tracked augmentation/derived files ===
4
=== which derived ones are tracked ===
state/shared/system-viz/dream-artifacts-augmentation.json
state/shared/system-viz/extracted-pdf-tips-augmentation.json
state/shared/system-viz/hotel-domain-features.json
state/shared/system-viz/system-graph.json
=== size of tracked graph ===
100644 53073dc68b3f54710b20f5f0cd439a5a51071a03 0	state/shared/system-viz/
... [+27 chars truncated]

### Assistant | 2026-06-04T12:47:57.769Z

Confirmed: `system-graph.json` is a **675MB git-tracked file** regenerated on every commit by every chat. This is a severe git-conflict + repo-bloat surface. Let me do one final check — verify it's actively churning in git (showing up in recent commits) vs. frozen, to confirm this is a live problem and gauge the right lane.

### Assistant | 2026-06-04T12:48:01.427Z

[tool_use: Bash]

### User | 2026-06-04T12:48:14.453Z

[tool_result] === recent commits touching the tracked graph ===
aeaeff6ca4 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-REVIEWER-FIX-BATCH (slot:alpha): 4 P0/P1 reviewer findings closed + 3 framework-tweet memories + viz regen
370b33e1df [MAIN] [DREAM-RECEIPT-MS0]/U-DR08-PSN-SYNERGY (slot:bravo iter17): close /goal phase 2 — synergize U-DR08 with PSN leg #6 (System Viz). Live bundle staged 
... [+3884 chars truncated]

### Assistant | 2026-06-04T12:48:22.010Z

This is fully confirmed and is the highest-ROI finding. The `.gitignore` line 128 `state/shared/system-viz/` ignores the *directory* — so `node-adjacency.json` and `find-cache.json` ARE ignored — but `system-graph.json` (675MB), `dream-artifacts-augmentation.json`, `extracted-pdf-tips-augmentation.json`, and `hotel-domain-features.json` were **force-added** (`git add -f`) into tracking, defeating the ignore. The graph is currently `M` (dirty) in the worktree right now, regenerated every commit by every chat. This is a massive cross-chat git-conflict + bloat surface.

I have my findings. Let me verify the git-commit-mutex doesn't already handle this artifact specially.

### Assistant | 2026-06-04T12:48:23.909Z

[tool_use: Bash]

### User | 2026-06-04T12:48:29.293Z

[tool_result] 13://   3. It commits an EXPLICIT pathspec, so a peer's foreign staged files are
266: * Commit an explicit pathspec under the mutex, retrying transient ref/index
268: * files (pathspec commit) — and warns to stderr if any are present.
275:  if (!Array.isArray(paths) || paths.length === 0) return { ok: false, attempts: 0, error: "no pathspec given (pathspec commit is required to avoid peer-absorpti
... [+451 chars truncated]

### Assistant | 2026-06-04T12:49:14.826Z

The mutex handles pathspec-scoped commits but doesn't special-case the 675MB graph. My findings are complete and verified. Here they are.

FINDING: 675MB system-graph.json is git-tracked and rewritten every commit by every chat — massive cross-chat conflict + repo bloat
FILES: state/shared/system-viz/system-graph.json (675,705,013 bytes, git-tracked, currently `M` dirty); .gitignore:128 (`state/shared/system-viz/` ignores the dir but the graph was `git add -f` force-added per commit 370b33e1df); scripts/system-viz-on-commit.mjs:218-266 (regen fires backgrounded on every commit)
THEME: git-conflict
CHANGE: Untrack the derived graph: `git rm --cached state/shared/system-viz/system-graph.json` (+ the 3 force-added augmentation JSONs: dream-artifacts-augmentation.json, extracted-pdf-tips-augmentation.json, hotel-domain-features.json), letting .gitignore:128 take effect. It is 100% regenerated from live state by regen-viz/merge-augmentations, so nothing needs the committed copy. Sidecars (node-adjacency.json, find-cache.json, obsidian-augmentation.json, system-graph-index.json) are ALREADY correctly ignored — the graph + 3 augs are the inconsistency.
ROI: Eliminates the single largest git-conflict surface in the fleet — every chat's post-commit regen rewrites a 675MB tracked file, so concurrent commits collide on it and each commit bloats history by ~675MB. Removing it from tracking kills the conflict class entirely and stops unbounded .git growth.
LANE: golf-integration (history/tracking change — pairs with U-FGC-2 churn quarantine; affects all chats, needs the integrator lane)
SHIPPED-CHECK: git ls-files confirms it's tracked; git check-ignore confirms only sidecars are ignored; git-commit-mutex.mjs has NO special-casing for this artifact (grep found only generic pathspec handling); not in FLEET-GIT-CONTENTION-MS0 shipped units (U-FGC-1/4/5 are mutex+index.lock only).

FINDING: merge-augmentations.mjs rebuilds the node/edge dedup Sets 60+69 times over the growing 244K-
... [+4848 chars truncated]

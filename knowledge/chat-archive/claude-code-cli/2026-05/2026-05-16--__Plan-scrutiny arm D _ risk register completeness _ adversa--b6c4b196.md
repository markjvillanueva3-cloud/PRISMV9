---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "**Plan-scrutiny arm D — risk register completeness + adversarial cases + missed "
date: "2026-05-16"
first_ts: "2026-05-16T02:18:05.834Z"
last_ts: "2026-05-16T02:22:10.125Z"
cwd: "H:\\prism"
messages: 42
user_msgs: 15
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-ab3d881e94e466263.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# **Plan-scrutiny arm D — risk register completeness + adversarial cases + missed 

> **claude-code-cli** | 2026-05-16 | 42 msgs (15 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-ab3d881e94e466263.jsonl`

## Transcript

### User | 2026-05-16T02:18:05.834Z

**Plan-scrutiny arm D — risk register completeness + adversarial cases + missed failure modes + CLAUDE.md compliance.** Read `H:\.claude\plans\steady-kindling-tide.md` end-to-end first.

**Your scoped focus** (NOT architecture, training-rigor, data-integrity, or dispatcher-wiring — peer agents own those):

1. **What's MISSING from the risk register.** The plan lists 8 risks (AUROC, Ollama load, three embedding models, calibration, heterogeneous graph, catastrophic forgetting, cross-tree commit collision, GPU contention, plan-mode plan-file location drift). What's NOT there? Brainstorm adversarial cases:
   - Peer chat takes the same milestone name in another slot (no claim mechanism explicit in the plan).
   - One unit's tests fail at 3 AM Sunday — does the plan's "ship-anyway threshold raise" mitigation actually re-train, or just deploy the broken model with a higher gate?
   - User does `/compact` mid-build and a fresh chat doesn't know the milestone's context — is the RESUME directive specific enough to bootstrap a new chat into U4 mid-training-run?
   - The c-to-h-mirror hook fails (per [[reference_settings_wiring_drift_2026_05_16]] — wiring has silently reverted before) — does the plan have a mirror-verification step in close-out?
   - Disk fills up during U4 training checkpoints (50 epochs × ~1MB JSON = 50MB; trivial. But what about `_node-embeddings.jsonl` at ~3GB on a near-full H: drive?).
   - Subprocess kill mid-training corrupts checkpoint — atomic-write claimed, but does U4's checkpoint code actually call `safeWriteSync` from `utils/atomicWrite.ts`?

2. **CLAUDE.md hook violations that the plan would trigger.** Run the plan mentally through:
   - `comprehensive-build-enforce` (HARD BLOCK on stubs/partial) — every unit ships full?
   - `stop_on_unwired_assets` — new engines wired by their own unit close-out per the dispatcher-wiring section?
   - `commit-ownership-guard` — slot worktree assignments correct?
   - `golf-slot-write-allowlist.mjs` — golf (slo
... [+2556 chars truncated]

### Assistant | 2026-05-16T02:18:11.597Z

I'll read the plan and supporting files to perform a thorough hostile review.

### Assistant | 2026-05-16T02:18:12.030Z

[tool_use: Read]

### User | 2026-05-16T02:18:12.473Z

[tool_result] read-once-guard: 'H:\.claude\plans\steady-kindling-tide.md' was already read 80s ago in this session and is unchanged (mtime 1778897280548). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T02:18:15.305Z

The plan was already read. Let me check the supporting files to verify claims.

### Assistant | 2026-05-16T02:18:15.939Z

[tool_use: Bash]

### User | 2026-05-16T02:18:19.251Z

[tool_result] ls: cannot access 'H:.claudeplans 2': No such file or directory

### Assistant | 2026-05-16T02:18:21.798Z

Acknowledged. Let me read the plan file directly since it appears to be cached and I need its content for review.

### Assistant | 2026-05-16T02:18:22.772Z

[tool_use: Read]

### User | 2026-05-16T02:18:24.064Z

[tool_result] 1	# Plan — `[NN-GRAPH-MS0]` Hybrid Neural-Symbolic GNN over system-viz
2	
3	## Context
4	
5	**Why this milestone exists.** PRISM's `state/shared/system-viz/system-graph.json` (373,635 nodes / 592,378 edges as of this session) is currently a *retrieval substrate* — used for keyword search, audit-viz-first redirects, and the 4-tier wiring-inference pipeline (keyword → expanded-keyword → sibling-pref
... [+34429 chars truncated]

### Assistant | 2026-05-16T02:18:27.034Z

Now let me verify key claims against the codebase.

### Assistant | 2026-05-16T02:18:28.151Z

[tool_use: Read]

### User | 2026-05-16T02:18:29.082Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * golf-slot-write-allowlist.mjs — PreToolUse T0 hook (U-CLEANUP-A5)
5	 *
6	 * Blocks Edit | Write | MultiEdit | NotebookEdit on any path NOT in the golf
7	 * chat's write allowlist. Only fires when the current chat IS the golf slot
8	 * (slot 7, the dedicated hygiene chat per CLEANUP-MS0). All other chats see
9	 * a silent no-op exit 0 — the hook is inv
... [+4885 chars truncated]

### Assistant | 2026-05-16T02:18:31.127Z

Acknowledged. Continuing with read-only verification.

### Assistant | 2026-05-16T02:18:32.286Z

[tool_use: Read]

### User | 2026-05-16T02:18:33.104Z

[tool_result] 100	  /^state\/shared\/SYSTEM_VIZ_LIVEDIFF\.md$/,
101	  /^state\/shared\/DR_DRILL_LEDGER\.jsonl$/,
102	  // Golf-owned config + transient state
103	  /^state\/shared\/golf-owned-paths\.json$/,
104	  /^state\/shared\/golf-token-budget\.json$/,
105	  /^state\/shared\/golf-cron-registry\.json$/,
106	  /^state\/shared\/golf-allowlist-regex\.txt$/,
107	  /^state\/shared\/\.golf-allowlist-regex\.txt$/,

... [+2786 chars truncated]

### Assistant | 2026-05-16T02:18:36.067Z

Acknowledged. The plan is read-only review work — no task tracking needed. Now let me verify the golf allowlist contract and check the recursive-self-improvement claim.

### Assistant | 2026-05-16T02:18:37.589Z

[tool_use: Bash]

### User | 2026-05-16T02:18:41.383Z

[tool_result] ls: cannot access 'H:prismscripts 2': No such file or directory

### Assistant | 2026-05-16T02:18:43.414Z

Acknowledged. Switching to read-only tools per instruction.

### Assistant | 2026-05-16T02:18:43.998Z

[tool_use: Glob]

### User | 2026-05-16T02:18:44.292Z

[tool_result] scripts\system-viz-obsidian-bridge.mjs
scripts\install-system-viz-git-hook.mjs
scripts\system-viz-obsidian-bridge-v2.mjs
scripts\__tests__\build-system-viz-livediff.test.mjs
scripts\system-viz-add-node.mjs
scripts\system-viz-on-commit.mjs
scripts\build-system-viz-livediff.mjs
scripts\system-viz-query.mjs
scripts\expand-system-viz-l12-files.test.mjs
scripts\system-viz-ghost-report.mjs
scripts\expan
... [+135 chars truncated]

### Assistant | 2026-05-16T02:18:46.165Z

Acknowledged.

### Assistant | 2026-05-16T02:18:46.690Z

[tool_use: Read]

### User | 2026-05-16T02:18:47.426Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
4	 *
5	 * Layers (top→bottom):
6	 *   L0 Personas        — 5 user roles
7	 *   L1 Frontend        — 144 web pages clustered into functional groups + CLIs
8	 *   L2 Transport       — MCP / REST / gRPC / GraphQL / WS / auth / rate / telemetry
9	 *   L3 AI Hierarchy    — Tier-1 Claude / Tier-2 coordinator
... [+3923 chars truncated]

### Assistant | 2026-05-16T02:18:54.517Z

[tool_use: Grep]

### User | 2026-05-16T02:18:55.307Z

[tool_result] No matches found

### Assistant | 2026-05-16T02:18:58.241Z

[tool_use: Grep]

### User | 2026-05-16T02:18:59.059Z

[tool_result] 87:  engines:     pluck(/\*\*Engines\*\*\s*\|\s*(\d+)/, inv, 3173),
101:const built = headline.built_engines ?? 2269;
106:// (~23K: engines/actions/dispatchers/registries/skills/hooks/formulas/algorithms/
337:    info: `${d.count} engines in '${d.domain}' domain (${d.status})`,
340:// Catchall — engines that didn't bucket into any named domain
342:const totalEngines = counts.engines || 3173;
355: 
... [+740 chars truncated]

### Assistant | 2026-05-16T02:19:02.728Z

Key finding: `generate-system-viz.mjs` **pulls engine counts from PRISM-INVENTORY-LATEST.md** (line 87) and uses domain buckets — it does NOT directly walk individual `.ts` files for new engine nodes. Let me verify the L12 file expansion (which is the recursive substrate).

### Assistant | 2026-05-16T02:19:03.243Z

[tool_use: Read]

### User | 2026-05-16T02:19:04.028Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * expand-system-viz-l12-files.mjs — SYSTEM-VIZ-FS-COVERAGE-MS0/U-LAYER-EXPAND
4	 *
5	 * Augments state/shared/system-viz/system-graph.json with raw-filesystem
6	 * coverage of the H: drive. Adds two new layers:
7	 *
8	 *   L11 (file bundles)  — one node per "bundled" directory (>= bundle-threshold
9	 *                         files OR mostly-binary content). Carries 
... [+2876 chars truncated]

### Assistant | 2026-05-16T02:19:09.957Z

This is a read-only review — no tasks needed. I have enough verification to draft the hostile review. Let me also check the goal-complete-gate threshold and one more recursive claim.

### Assistant | 2026-05-16T02:19:11.705Z

[tool_use: Grep]

### User | 2026-05-16T02:19:12.302Z

[tool_result] 51:  const n = parseFloat(process.env.PRISM_GOAL_GATE_STALE_HRS || String(STALE_HOURS_DEFAULT));
237:  const STALE_HRS = staleHours();
256:  if (audit.ageHours > STALE_HRS) {
258:      `audit report stale (${audit.ageHours.toFixed(1)}h > ${STALE_HRS}h)`,
260:        `The close-out audit report at state/shared/CLOSE-OUT-CANDIDATES.json is ${audit.ageHours.toFixed(1)} hours old (threshold: ${STALE_H
... [+70 chars truncated]

### Assistant | 2026-05-16T02:19:15.996Z

Now I have enough. Let me write the hostile-review plan to the agent plan file.

### Assistant | 2026-05-16T02:20:31.949Z

[tool_use: Write]

### User | 2026-05-16T02:20:34.198Z

[tool_result] H: drive enforcement: project work must stay on H:\prism\ and user-authored ~/.claude/ content (commands, agents, hooks, skills, rules, plans) must live on H:\.claude\ for drive-swap portability.
Blocked paths:
  - C:\Users\wompu\.claude\plans\steady-kindling-tide-agent-ab3d881e94e466263.md
Redirect: C:\Users\*\.claude\<authored>  →  H:\.claude\<authored>
          C:\...\prism project files      
... [+34 chars truncated]

### Assistant | 2026-05-16T02:20:36.930Z

The H: drive enforcement blocks the C: path. Writing to H: instead.

### Assistant | 2026-05-16T02:21:27.072Z

[tool_use: Write]

### User | 2026-05-16T02:21:31.803Z

[tool_result] File created successfully at: H:\.claude\plans\steady-kindling-tide-agent-ab3d881e94e466263.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-16T02:22:10.125Z

# Plan-Scrutiny Arm D — Hostile Risk Review of `NN-GRAPH-MS0`

Plan file: `H:\.claude\plans\steady-kindling-tide-agent-ab3d881e94e466263.md`

## Verdict

**SHIP-RISK: HIGH.** ~35% the plan closes by Sunday EOD without a forced scope cut. Architecturally sound but operationally optimistic. Three load-bearing claims are unverified-or-false against current code; risk register omits 6 plausible failure modes; 30h wall-clock estimate misses peer-claim + scrutiny-gate overhead.

## Findings

### P0 — Recursive-self-improvement claim is partially false

Verified against `H:\prism\scripts\generate-system-viz.mjs` line 87: engine counts are scraped from `PRISM-INVENTORY-LATEST.md` regex and bucketed into named-domain L5 clusters. **There is no `.ts` walk that materializes a per-engine node.** The two new engines will increment the count and join a bucket, but will NOT appear as discrete `engine.GraphSAGELinkPredictorEngine` nodes the GNN can train against. Verification step 11's "recursive property check" CANNOT pass — the GNN smoke-test queries an engine name the graph doesn't know about.

**Fix:** Add a per-engine extractor (`scripts/lib/engine-node-extractor.mjs`) walking `mcp-server/src/engines/*.ts`, emitting `{nodeId: "engine.{ClassName}", kind, label, info}` per engine. Wire into `generate-system-viz.mjs` between L5 and L6. Without this, U7's "recursive property" claim is rhetoric, not function.

### P0 — U4 checkpoint corruption uncovered

Plan claims "atomic checkpointing as pattern reference from `CrossProcessNeuralLearningEngine`" but never specifies which atomic-write primitive `train-graphsage-link.mjs` uses. Naked `fs.writeFileSync` + fleet-reaper kill mid-write = truncated JSON. U4 acceptance criteria MUST specify `safeWriteSync(checkpointPath, json)` (write-to-temp + fsync + rename) + a SIGTERM-mid-write test case.

### P0 — Goal-gate staleness window incompatible with 30h build

Verified `H:\prism\.claude\hooks\goal-complete-gate.mjs` line 51: `PRISM_GOAL_GA
... [+4456 chars truncated]

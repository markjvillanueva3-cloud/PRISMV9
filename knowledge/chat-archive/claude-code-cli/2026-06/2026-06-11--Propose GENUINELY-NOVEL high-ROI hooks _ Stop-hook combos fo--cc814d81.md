---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "Propose GENUINELY-NOVEL high-ROI hooks + Stop-hook combos for PRISM to increase "
date: "2026-06-11"
first_ts: "2026-06-11T22:34:51.377Z"
last_ts: "2026-06-11T22:37:53.748Z"
cwd: "H:\\prism-slot-golf"
messages: 33
user_msgs: 14
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-a8604480226cf3cab.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Propose GENUINELY-NOVEL high-ROI hooks + Stop-hook combos for PRISM to increase 

> **claude-code-cli** | 2026-06-11 | 33 msgs (14 user / 19 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-a8604480226cf3cab.jsonl`

## Transcript

### User | 2026-06-11T22:34:51.377Z

Propose GENUINELY-NOVEL high-ROI hooks + Stop-hook combos for PRISM to increase efficiency, accuracy, and quality. Use the prior-art + X-article + saturation digests below.

HARD CONSTRAINTS:
- The token-savings/offload ADVISORY hook frontier is SATURATED (15+ hooks; route-suggest take-rate ~0.4% over 10450 fires). DO NOT propose another advisory hook. The bottleneck is CONVERSION, not coverage. Favor hooks that ACT on a signal (decay/suppress proven-noise, auto-apply a transform, gate/block, fuse) over hooks that merely advise.
- Every proposal MUST cite a real existing hook file:line or telemetry number as evidence (read C:/Users/wompu/.claude/settings.json + glob H:/prism/.claude/hooks/*.mjs to ground it). No fabricated hook names.
- Mark novel=true only if it is NOT in the already-built/rejected list. Set alreadyBuilt=true + put it in rejected[] if it duplicates a built hook.
- For Stop-hook combos: identify Stop hooks that fire redundantly or out of order and propose a FUSION or REORDER (e.g. the repeated fleet-task-health WARN reading stale sidecar; route-suggest summary firing every stop). Cite the Stop chain.
- Tag owner slot (golf=fleet/hooks infra, bravo=route/ollama family, alpha=token/obsidian, sierra=system-viz, india=AI/NN).
- Rank roiTier S/A/B by (token or quality impact) x frequency x conversion-likelihood.
The advisory-DECAY lever (auto-mute hooks with <5% take-rate over >=50 fires — route-suggest is 0.4%/10450) is the lead candidate; verify it is still unbuilt and include it if so.

--- PRIOR-ART / X-ARTICLE / SATURATION DIGESTS ---
I have sufficient data. Here is the digest:

---

**PRISM Skill+Hook Framework — Prior Art Digest (<=400 words)**

**A. Skill-Evaluation / Scoring Framework (scripts + schema)**

- `H:/prism/scripts/high-roi-skill-rank.mjs` — META artifact (cron-ready, exit 0/1/2). Measures: trigger-ledger coverage ratio, `model:`/`effort:` frontmatter coverage, Ollama offload ratio. Telemetry appended to `state/shared/high-roi-skill-h
... [+11646 chars truncated]

### Assistant | 2026-06-11T22:34:55.027Z

I'll ground my proposals in real hook files and telemetry. Let me read the settings and enumerate the hooks first.

### Assistant | 2026-06-11T22:34:55.502Z

[tool_use: Read]

### Assistant | 2026-06-11T22:34:55.985Z

[tool_use: Glob]

### User | 2026-06-11T22:35:01.265Z

[tool_result] H:/prism/.claude/hooks\wedm-tier6-geom-gate.mjs
H:/prism/.claude/hooks\agent-boundary-guard.mjs
H:/prism/.claude/hooks\agent-pid-tracker.mjs
H:/prism/.claude/hooks\agent-registry-load.mjs
H:/prism/.claude/hooks\agent-rules-inject.mjs
H:/prism/.claude/hooks\agent-util-log.mjs
H:/prism/.claude/hooks\agent-vs-direct.mjs
H:/prism/.claude/hooks\agent-worktree-stale-unlock.mjs
H:/prism/.claude/hooks\agi
... [+4739 chars truncated]

### User | 2026-06-11T22:35:02.526Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1430 of 1918 total (28490 tokens, cap 25000). Call Read with offset=1431 limit=1430 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PRISM_FLEET_REAPER_DISABLE": "0",
5	    "PRISM_GOLF
... [+56782 chars truncated]

### Assistant | 2026-06-11T22:35:05.773Z

Let me read the rest of the settings (UserPromptSubmit + PostToolUse chains) and check the route-suggest / advisory-decay telemetry to verify the lead candidate is unbuilt.

### Assistant | 2026-06-11T22:35:06.718Z

[tool_use: Read]

### Assistant | 2026-06-11T22:35:07.202Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:35:07.669Z

[tool_use: Glob]

### Assistant | 2026-06-11T22:35:07.974Z

[tool_use: Glob]

### User | 2026-06-11T22:35:25.905Z

[tool_result] H:/prism/.claude/hooks\active-chat-priority-decay.mjs

### User | 2026-06-11T22:35:26.089Z

[tool_result] No files found

### User | 2026-06-11T22:35:26.266Z

[tool_result] H:/prism/.claude/hooks\__tests__\mcp-route-suggest-redundancy.test.mjs
H:/prism/.claude/hooks\__tests__\mcp-route-suggest-doctrine-gate.test.mjs
H:/prism/.claude/hooks\__tests__\mcp-route-suggest.test.mjs
H:/prism/.claude/hooks\__tests__\mcp-route-suggest-backend-audit-gate.test.mjs
H:/prism/.claude/hooks\__tests__\mcp-route-suggest-rtk-guard.test.mjs
H:/prism/.claude/hooks\mcp-route-suggest.mjs

### User | 2026-06-11T22:35:29.122Z

[tool_result] 1431	            "type": "command",
1432	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/node-capability-inject.mjs",
1433	            "timeout": 2500
1434	          },
1435	          {
1436	            "type": "command",
1437	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/memory-index-precheck-inject.mjs",
1438	            "timeout"
... [+18893 chars truncated]

### Assistant | 2026-06-11T22:35:33.100Z

Now let me examine the key candidate hooks. I need to verify: (1) `mcp-route-suggest.mjs` (the 0.4% take-rate hook) and whether it has decay logic, (2) `mcp-route-takeup.mjs` (the take-rate tracker), (3) the route-suggest telemetry, (4) the fleet-task-health stop hook (the "crying wolf" stale sidecar), (5) whether there's a route-suggest summary firing at every stop, and (6) the per-file typecheck gap.

### Assistant | 2026-06-11T22:35:33.579Z

[tool_use: Read]

### Assistant | 2026-06-11T22:35:33.943Z

[tool_use: Read]

### User | 2026-06-11T22:35:48.780Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * mcp-route-takeup.mjs
5	 * --------------------
6	 * PostToolUse companion to mcp-route-suggest.mjs (TOKEN-SAVINGS-PIVOT iter8).
7	 *
8	 * Closes the take-rate measurement gap. The route-suggest hook fires TOKEN-SAVE
9	 * nudges and records each fire to state/shared/mcp-route-suggest-stats.json,
10	 * but until now we had NO data on how often the model
... [+8621 chars truncated]

### User | 2026-06-11T22:35:48.913Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * mcp-route-suggest.mjs
5	 * ---------------------
6	 * Compact PreToolUse router that nudges PRISM work toward existing MCP, helper,
7	 * and audit-chain surfaces before broad shell churn expands token cost.
8	 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
9	 * Falls back to regex-based suggestions when Ollama unavailable.
1
... [+45599 chars truncated]

### Assistant | 2026-06-11T22:35:54.048Z

The route-suggest hook is NOT in `settings.json` PreToolUse chain — I see it on disk but it's not wired (the wired one is `pre-tool-router-table-advise.mjs` at line 1295, plus the redundant-suppression logic is already built INTO `mcp-route-suggest.mjs`). Let me verify the route-suggest telemetry, the fleet-task-health Stop hook (the "crying wolf" stale sidecar), the defer-queue drain, and whether route-suggest is even wired anywhere.

### Assistant | 2026-06-11T22:35:55.454Z

[tool_use: Grep]

### Assistant | 2026-06-11T22:35:55.922Z

[tool_use: Read]

### Assistant | 2026-06-11T22:35:56.388Z

[tool_use: Read]

### User | 2026-06-11T22:36:22.226Z

[tool_result] 1295:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/pre-tool-router-table-advise.mjs",

### User | 2026-06-11T22:36:28.335Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * fleet-task-health-stop.mjs — Stop-hook arm of the scheduled-task health
5	 * watchdog (scripts/fleet-task-health-watch.mjs).
6	 *
7	 * THE GAP. PRISM's crash-prevention safety net is a set of Windows scheduled
8	 * tasks (Fleet Reaper, Fleet Memory Monitor, Cleanup Orchestrator, …). Nothing
9	 * watches whether those tasks are themselves healthy — a t
... [+12387 chars truncated]

### User | 2026-06-11T22:36:29.677Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "createdAt": "2026-05-22T23:26:22.285Z",
4	  "totalFires": 10470,
5	  "byToolName": {
6	    "Grep": 4,
7	    "Read": 7330,
8	    "Bash": 932,
9	    "Glob": 1,
10	    "Edit": 1489,
11	    "Write": 714
12	  },
13	  "byClassifier": {
14	    "isBroadGrep": 4,
15	    "doctrineSurface": 4360,
16	    "isVerboseBash": 928,
17	    "isLargeRead": 1064,
18	    "isBroadGl
... [+980 chars truncated]

### Assistant | 2026-06-11T22:36:38.751Z

I now have strong evidence. Key findings:

1. **`mcp-route-suggest.mjs` is NOT wired** in PreToolUse — only `pre-tool-router-table-advise.mjs` is (line 1295). But its telemetry sidecar shows **10,470 fires** with `doctrineSurface:4360` and `backendAuditChain:4108` dominating. The takeup data confirms ~0.4% take-rate. So whatever IS firing it (likely a bundle), the conversion is dead.

2. The advisory-DECAY lever is genuinely unbuilt — `active-chat-priority-decay.mjs` exists but is about chat priority, not advisory take-rate.

3. The Stop chain has clear redundancy: `quality-dashboard-alert.mjs` fires in BOTH PreCompact (line 456) AND Stop (line 698); `skill-auto-trigger.mjs` fires at Stop (804), UserPromptSubmit (1322), AND PostToolUse (1639); `build-cache-guard.mjs` fires in PostToolUse THREE times (1809, 1829 — and PreToolUse 1155).

Let me check the route-suggest defer-queue drain wiring and the takeup totals, plus verify the per-file typecheck gap and check whether `mcp-route-suggest` fires via a bundle.

### Assistant | 2026-06-11T22:36:41.126Z

[tool_use: Bash]

### Assistant | 2026-06-11T22:36:42.713Z

[tool_use: Grep]

### User | 2026-06-11T22:37:41.332Z

[tool_result] totalFires 10470
takeupTotals {"totalTakeups":38,"byClassifier":{"doctrineSurface":21,"backendAuditChain":3,"isLargeRead":14}}
takeups_len 26
lastFireAt 2026-06-11T22:34:45.098Z
byClassifier {"isBroadGrep":4,"doctrineSurface":4360,"isVerboseBash":928,"isLargeRead":1064,"isBroadGlob":1,"backendAuditChain":4108,"ollama":4,"isLargeWrite":1}

### User | 2026-06-11T22:37:52.275Z

[tool_result] H:\prism\.claude\hooks\bundles\bash-bundle.mjs:45:  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
H:\prism\.claude\hooks\bundles\edit-bundle.mjs:71:  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
H:\prism\.claude\hooks\bundles\posttool-bash-read-bundle.mjs:28:    "path": "H:/prism/.claude/helpers/tsc-error-dedup.mjs",
H:\prism\.claude\hoo
... [+355 chars truncated]

### Assistant | 2026-06-11T22:37:53.748Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

---
type: "chat-session"
source: "claude-code-cli"
session_id: "610a823b-dfea-4855-b749-16661916b5fa"
title: "Working dir H:/prism. TASK: reduce PreToolUse hook spawn count (fork-storm cause"
date: "2026-06-15"
first_ts: "2026-06-15T00:38:16.231Z"
last_ts: "2026-06-15T00:43:27.217Z"
cwd: "H:\\prism-slot-tango"
messages: 50
user_msgs: 21
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/workflows/wf_77674ab0-221/agent-aedcdb62e8954f407.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:12"
---

# Working dir H:/prism. TASK: reduce PreToolUse hook spawn count (fork-storm cause

> **claude-code-cli** | 2026-06-15 | 50 msgs (21 user / 29 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/workflows/wf_77674ab0-221/agent-aedcdb62e8954f407.jsonl`

## Transcript

### User | 2026-06-15T00:38:16.231Z

Working dir H:/prism. TASK: reduce PreToolUse hook spawn count (fork-storm cause). In H:/.claude/settings.json PreToolUse, COUNT separate hook commands per tool (Read/Write/Bash/Grep) and list them. Find existing bundling (grep "bundle" .claude/hooks e.g. posttool-bash-read-bundle.mjs). Identify bundleable cheap independent hooks (the 4 pre-*-graph-inject, mcp-route-suggest) vs HARD-BLOCK gates that must stay separate. recommendation=concrete low-risk bundle plan (prefer a bundle script over re-wiring high-contention settings.json).

### Assistant | 2026-06-15T00:38:20.317Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:38:20.596Z

[tool_use: Glob]

### User | 2026-06-15T00:38:31.496Z

[tool_result] H:\.claude\hooks\duplication-guard-stop.mjs
H:\.claude\hooks\wedm-tier6-geom-gate.mjs
H:\.claude\hooks\ai-system-router-inject.mjs
H:\.claude\hooks\self-awareness-enforce.mjs
H:\.claude\hooks\plugin-path-fixer.mjs
H:\.claude\hooks\lathe-gcode-lint-guard.mjs
H:\.claude\hooks\whiskey-lathe-context-inject.mjs
H:\.claude\hooks\search-thoroughness-inject.mjs
H:\.claude\hooks\search-thoroughness-inject.
... [+105 chars truncated]

### User | 2026-06-15T00:38:38.095Z

[tool_result] <persisted-output>
Output too large (71.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-tango\610a823b-dfea-4855-b749-16661916b5fa\tool-results\bq7lxs3lk.txt

Preview (first 2KB):
{
  "cleanupPeriodDays": 60,
  "env": {
    "PRISM_FLEET_REAPER_DISABLE": "0",
    "PRISM_GOLF_GUARDIAN_DISABLE": "0",
    "PRISM_GALAXY_MEMORY_OBSIDIAN_MIRROR": "1",
    "PRISM_OBSIDIAN_LIVE": 
... [+1824 chars truncated]

### Assistant | 2026-06-15T00:38:40.594Z

Let me read the full settings.json to get all PreToolUse hooks, then examine the hooks directory.

### Assistant | 2026-06-15T00:38:42.875Z

[tool_use: Read]

### Assistant | 2026-06-15T00:38:43.095Z

[tool_use: Bash]

### User | 2026-06-15T00:39:04.781Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1420 of 2062 total (30844 tokens, cap 25000). Call Read with offset=1421 limit=1420 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PRISM_FLEET_REAPER_DISABLE": "0",
5	    "PRISM_GOLF
... [+56124 chars truncated]

### User | 2026-06-15T00:39:24.234Z

[tool_result] ai-system-router-inject.mjs
alpha-token-domain-awareness-inject.mjs
architecture-scanner.py
archived
auto-approve.sh
configchange-guard.sh
duplication-guard-stop.mjs
generate-dashboard.py
health-scanner.py
HOOK-TYPE-GUIDE.md
instructions-loaded-handler.sh
lathe-gcode-lint-guard.mjs
lib
logical-build-hook.mjs
node_modules
plugin-path-fixer.mjs
postcompact-handler.sh
posttooluse-failure-handler.sh
p
... [+515 chars truncated]

### Assistant | 2026-06-15T00:39:27.014Z

Now let me read the rest of settings.json and examine the existing bundles directory:

### Assistant | 2026-06-15T00:39:29.677Z

[tool_use: Read]

### Assistant | 2026-06-15T00:39:30.154Z

[tool_use: Glob]

### User | 2026-06-15T00:39:48.444Z

[tool_result] H:\prism\.claude\hooks\bundles\lib\hook-runner.mjs
H:\prism\.claude\hooks\bundles\lib\obsidian-cache.mjs
H:\prism\.claude\hooks\bundles\posttool-bash-read-bundle.mjs
H:\prism\.claude\hooks\bundles\smoke-test.mjs
H:\prism\.claude\hooks\bundles\edit-bundle.mjs
H:\prism\.claude\hooks\bundles\stop-regression-bundle.mjs
H:\prism\.claude\hooks\bundles\__tests__\stop-regression-bundle.test.mjs
H:\prism\.
... [+292 chars truncated]

### User | 2026-06-15T00:39:48.564Z

[tool_result] 1421	            "timeout": 1500
1422	          },
1423	          {
1424	            "type": "command",
1425	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/close-out-audit-suggest.mjs",
1426	            "timeout": 1500
1427	          },
1428	          {
1429	            "type": "command",
1430	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claud
... [+25429 chars truncated]

### Assistant | 2026-06-15T00:39:53.510Z

Now let me examine the existing bundle files and the 4 graph-inject hooks plus mcp-route-suggest to understand their structure:

### Assistant | 2026-06-15T00:39:53.856Z

[tool_use: Read]

### Assistant | 2026-06-15T00:39:54.266Z

[tool_use: Read]

### Assistant | 2026-06-15T00:39:55.007Z

[tool_use: Read]

### Assistant | 2026-06-15T00:39:55.033Z

[tool_use: Read]

### User | 2026-06-15T00:40:06.630Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	// bash-bundle.mjs — single PreToolUse hook for Bash. Replaces the 6-hook
4	// Bash matcher in settings.json with one bundled invocation.
5	
6	import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";
7	
8	const HOOK_BASE = "H:/prism/.claude/hooks";
9	const HELPER_BASE = "H:/prism/.claude/helpers";
10	
11	const BASH_HOOKS = [
12	  // 2026-05-18 (slot
... [+3704 chars truncated]

### User | 2026-06-15T00:40:07.464Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	// read-bundle.mjs — single PreToolUse hook for Read. Replaces the 4-hook
4	// Read matcher in settings.json with one bundled invocation.
5	
6	import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";
7	
8	const HOOK_BASE = "H:/prism/.claude/hooks";
9	const HELPER_BASE = "H:/prism/.claude/helpers";
10	
11	const READ_HOOKS = [
12	  { path: `${HELPER_B
... [+1691 chars truncated]

### User | 2026-06-15T00:40:07.636Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-bash-graph-inject.mjs — PreToolUse:Bash graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A4.
7	 *
8	 * Sibling of pre-read / pre-grep / pre-write graph-inject. Before a Bash
9	 * command runs, surface the master-index nodes the graph already knows —
10	 * but NARROW: bash is mostly `git` / `npm` / `node` / build commands that
11
... [+13355 chars truncated]

### User | 2026-06-15T00:40:07.819Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-grep-graph-inject.mjs — PreToolUse:Grep graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A2.
7	 *
8	 * Sibling of pre-read-graph-inject.mjs. Before a Grep runs, surface the
9	 * master-index nodes that already match the grep pattern — "the graph
10	 * already knows these N nodes for your pattern" — so Claude can often
11	 * answ
... [+10484 chars truncated]

### Assistant | 2026-06-15T00:40:14.309Z

Now let me read the remaining graph-inject hooks and the hook-runner lib to understand the bundle pattern fully:

### Assistant | 2026-06-15T00:40:15.127Z

[tool_use: Read]

### Assistant | 2026-06-15T00:40:16.226Z

[tool_use: Read]

### Assistant | 2026-06-15T00:40:16.331Z

[tool_use: Read]

### Assistant | 2026-06-15T00:40:16.919Z

[tool_use: Read]

### User | 2026-06-15T00:40:30.726Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-write-graph-inject.mjs — PreToolUse:Write graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A3.
7	 *
8	 * Sibling of pre-read / pre-grep graph-inject. Before a Write creates or
9	 * overwrites a file, surface the master-index nodes whose name overlaps the
10	 * target filename — "the graph has N related/duplicate nodes for this n
... [+1915 chars truncated]

### User | 2026-06-15T00:40:30.786Z

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
... [+3196 chars truncated]

### User | 2026-06-15T00:40:30.840Z

[tool_result] 1	// tier: T4
2	// hook-runner.mjs — parallel hook execution library for U-D3 bundles.
3	// Spawns each hook as a child process, pipes stdin, collects stdout/stderr,
4	// enforces per-hook timeout, aggregates results.
5	//
6	// Hook protocol (Claude Code):
7	//   stdin  = JSON {tool_name, tool_input, ...}
8	//   stdout = JSON {decision?, reason?, additionalContext?, hookSpecificOutput?}
9	//      
... [+12093 chars truncated]

### User | 2026-06-15T00:40:31.002Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * pre-tool-savings-multi.mjs — multi-PreToolUse advisory hook
5	 *
6	 * PSN-TOOL-SAVINGS-MULTI/U-PTSM01 (2026-05-24, slot:alpha)
7	 *
8	 * Single hook, dispatches on tool_name. Covers four tool classes the prior
9	 * coverage gap missed: Grep / Glob / Write / Bash-git. Each emits a 1-line
10	 * advisory when an empirically-wasteful pattern is detected.

... [+1592 chars truncated]

### Assistant | 2026-06-15T00:40:34.231Z

Now let me look at the pre-read-graph-inject and count the exact PreToolUse hooks per tool:

### Assistant | 2026-06-15T00:40:34.617Z

[tool_use: Read]

### Assistant | 2026-06-15T00:40:35.004Z

[tool_use: Grep]

### User | 2026-06-15T00:40:40.397Z

[tool_result] H:\prism\.claude\hooks\bundles\bash-bundle.mjs:45:  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
H:\prism\.claude\hooks\bundles\edit-bundle.mjs:71:  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },
H:\prism\.claude\hooks\bundles\read-bundle.mjs:22:  { path: `${HOOK_BASE}/mcp-route-suggest.mjs`,              timeout: 1500 },

### User | 2026-06-15T00:40:40.608Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-read-graph-inject.mjs — PreToolUse:Read graph-context injector.
5	 *
6	 * PRISM-SEARCH-MS0 / U-PSM01 (2026-05-18, slot golf).
7	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A5 (2026-05-22, slot echo) — key
8	 *   derivation refactored onto the shared scripts/lib/graph-key-derive.mjs
9	 *   so all four PreToolUse graph hooks (read / grep / write / bash) sh
... [+1664 chars truncated]

### Assistant | 2026-06-15T00:40:43.778Z

Now I have all the data needed. Let me tally the PreToolUse hook spawns per tool precisely from the settings.json analysis:

### Assistant | 2026-06-15T00:40:44.659Z

[tool_use: Grep]

### User | 2026-06-15T00:40:45.900Z

[tool_result] H:\prism\.claude\hooks\bundles\read-bundle.mjs:21:  { path: `${HOOK_BASE}/pre-read-graph-inject.mjs`,          timeout: 2000 },

### Assistant | 2026-06-15T00:41:07.837Z

I have everything needed. Now I can do the full tally and produce the structured output.

The key facts assembled from the settings.json and bundle files:

**PreToolUse matchers and their hook commands (raw settings.json entries):**

- `""` (all tools): 1 hook — `precompact-auto-trigger.mjs --pre`
- `"Bash|Agent|Task|Workflow"`: 1 hook — `fork-storm-circuit-breaker.mjs`
- `"Write|MultiEdit"`: 4 hooks — `activate-before-build-precheck`, `injection-knob-enforce`, `injection-budget-cap-enforce`, `enforce-plan-before-build`
- `"^(Edit|Write|MultiEdit|NotebookEdit)$"`: 3 hooks — `cross-session-orchestrator --pre`, `pre-edit-galaxy-cascade-inject`, `pre-write-cross-galaxy-warn`
- `"^mcp__prism.*"`: 2 hooks — `mcp-action-router`, `mcp-pretool-injector`
- `"^Task$"`: 2 hooks — `agent-rules-inject`, `subagent-model-enforce`
- `"Edit|Write|MultiEdit"`: 4 hooks — `edit-bundle`, `slot-signature-advisory`, `localhost-ollama-hardcode-guard`, `auto-consensus-critical-edit`
- `"Agent"`: 4 hooks — `agent-fanout-pressure-gate`, `ai-system-router-inject`, `agent-vs-direct`, `subagent-model-enforce`
- `"Workflow"`: 1 hook — `agent-fanout-pressure-gate`
- `"Bash"`: 6 hooks — `git-index-lock-sweep`, `bash-bundle`, `commit-coordination-acquire`, `worktree-commit-route`, `slot-commit-worktree-enforce`, `git-add-lane-guard`
- `"Read"`: 1 hook — `read-bundle`
- `"Glob|Grep"`: 3 hooks — `search-optimizer`, `grep-index-first`, `viz-first-redirect`
- `"Glob"`: 2 hooks — `glob-narrow-path`, `pre-tool-savings-multi`
- `"mcp__prism__"`: 2 hooks — `mcp-connection-coordinator`, `cost-bridge-margin-floor-gate`
- `".*"` (block 1): 2 hooks — `tribal-spike`, `autonomous-loop-defer`
- `".*"` (block 2): 1 hook — `node-process-janitor`
- `"Write|Edit|MultiEdit|Bash"`: 1 hook — `error-block-prewarn`
- `"Edit|Write|MultiEdit"` (block 2): 2 hooks — `file-claim-guard`, `claude-md-golf-only-guard`
- `"Edit|Write|MultiEdit"` (block 3): 1 hook — `ascii-guard`
- `"Bash|PowerShell|WebFetch|WebSearch|Write|Edit|Mult
... [+1004 chars truncated]

### Assistant | 2026-06-15T00:41:07.946Z

[tool_use: TaskUpdate]

### User | 2026-06-15T00:41:10.151Z

[tool_result] Updated task #10 status

### Assistant | 2026-06-15T00:41:31.091Z

Now computing the per-tool spawn counts precisely:

**READ tool — matchers that fire:**
- `""` → 1 (precompact-auto-trigger)
- `"Bash|Agent|Task|Workflow"` → 0 (no Read)
- `"Read"` block 1 → 1 (read-bundle — itself spawns 9 sub-hooks internally via hook-runner)
- `".*"` block 1 → 2 (tribal-spike, autonomous-loop-defer)
- `".*"` block 2 → 1 (node-process-janitor)
- `"Read"` block 2 → 5 (wiki-read-offload-advisory, large-read-digest-advisory, big-data-read-enforce, recall-first-advisory, grep-index-taken-correlator)
- `""` block 2 → 1 (pre-tool-router-table-advise)

**READ total outer spawns: 1+1+2+1+5+1 = 11** (plus read-bundle's 9 internal sub-process spawns = **20 processes**)

**WRITE tool — matchers that fire:**
- `""` → 1
- `"Write|MultiEdit"` → 4
- `"^(Edit|Write|MultiEdit|NotebookEdit)$"` → 3
- `"Edit|Write|MultiEdit"` → 4 (edit-bundle + 3)
- `"Bash|PowerShell|WebFetch|WebSearch|Write|Edit|MultiEdit|NotebookEdit"` → 1
- `"Write|Edit|MultiEdit|Bash"` → 1
- `"Edit|Write|MultiEdit"` block 2 → 2
- `"Edit|Write|MultiEdit"` block 3 → 1
- `"^(Write|Edit)$"` → 1
- `"Write"` → 2 (pre-write-graph-inject + pre-tool-savings-multi)
- `"Edit|Write|MultiEdit|NotebookEdit"` → 1
- `".*"` block 1 → 2
- `".*"` block 2 → 1
- `""` block 2 → 1

**WRITE total outer spawns: 1+4+3+4+1+1+2+1+1+2+1+2+1+1 = 25**

**BASH tool — matchers that fire:**
- `""` → 1
- `"Bash|Agent|Task|Workflow"` → 1 (fork-storm-circuit-breaker)
- `"Bash"` block 1 → 6 (git-index-lock-sweep, bash-bundle, commit-coordination-acquire, worktree-commit-route, slot-commit-worktree-enforce, git-add-lane-guard)
- `"Write|Edit|MultiEdit|Bash"` → 1
- `"Bash|PowerShell|WebFetch|WebSearch|Write|Edit|MultiEdit|NotebookEdit"` → 1
- `"Bash"` block 2 → 2 (build-cache-guard, nav-rerank-advisory)
- `"Bash"` block 3 → 3 (pre-bash-graph-inject, pre-tool-savings-multi, gpu-vram-admission-guard)
- `"Bash"` block 4 → 1 (auto-consensus-sync-bash)
- `".*"` block 1 → 2
- `".*"` block 2 → 1
- `""` block 2 → 1

**BASH total outer spawns: 
... [+2234 chars truncated]

### Assistant | 2026-06-15T00:41:31.409Z

[tool_use: TaskUpdate]

### User | 2026-06-15T00:41:50.907Z

[tool_result] Updated task #10 status

### Assistant | 2026-06-15T00:43:00.338Z

[tool_use: StructuredOutput]

### User | 2026-06-15T00:43:16.118Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-15T00:43:27.217Z

**Summary of findings:**

**Per-tool outer spawn counts (PreToolUse):**
- Read: **11 outer spawns** + 9 inside read-bundle = 20 total process forks
- Bash: **20 outer spawns** + 10 inside bash-bundle = 30 total process forks
- Write: **25 outer spawns** (highest; many are hard-gates that cannot be bundled)
- Grep: **10 outer spawns** (no bundle at all — every Grep advisory is a raw fork)

**Root causes of the fork-storm:**

1. **Grep has zero bundling** — all 5 advisory hooks (`search-optimizer`, `grep-index-first`, `viz-first-redirect`, `pre-grep-graph-inject`, `pre-tool-savings-multi`) fire as individual outer processes

2. **5 Read advisories are outside read-bundle** — a second `"Read"` matcher block in settings.json fires `wiki-read-offload-advisory`, `large-read-digest-advisory`, `big-data-read-enforce`, `recall-first-advisory`, `grep-index-taken-correlator` as standalone processes despite read-bundle already existing

3. **`pre-bash-graph-inject` fires TWICE for Bash** — it is inside bash-bundle (line 19) AND listed as a separate outer `"Bash"` block3 entry in settings.json

4. **`pre-write-graph-inject` and `pre-tool-savings-multi` are outer Write spawns** despite edit-bundle running for the same tool

**Concrete bundle plan (3 changes, lowest risk first):**
- **Change 1**: Append 5 hooks to `read-bundle.mjs` READ_HOOKS + remove second `"Read"` block from settings.json → saves 5 outer spawns per Read
- **Change 2**: Create `bundles/grep-glob-bundle.mjs` (tool-dispatch pattern matching bash-bundle) + collapse 3 Grep/Glob settings.json blocks to 1 → saves 4 outer spawns per Grep
- **Change 3**: Remove the outer `"Bash"` block3 `pre-bash-graph-inject` entry from settings.json (it already runs inside bash-bundle) → eliminates 1 duplicate spawn per Bash

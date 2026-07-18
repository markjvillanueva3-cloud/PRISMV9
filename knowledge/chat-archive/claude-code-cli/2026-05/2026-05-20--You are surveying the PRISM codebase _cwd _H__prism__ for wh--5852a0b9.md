---
type: "chat-session"
source: "claude-code-cli"
session_id: "5852a0b9-b93f-42e3-a8f0-deab5898423c"
title: "You are surveying the PRISM codebase (cwd `H:/prism`) for what already exists ar"
date: "2026-05-20"
first_ts: "2026-05-20T03:46:56.218Z"
last_ts: "2026-05-20T03:53:58.068Z"
cwd: "H:\\prism"
messages: 83
user_msgs: 37
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism/5852a0b9-b93f-42e3-a8f0-deab5898423c/subagents/agent-a12c8ff285cd94a36.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# You are surveying the PRISM codebase (cwd `H:/prism`) for what already exists ar

> **claude-code-cli** | 2026-05-20 | 83 msgs (37 user / 46 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5852a0b9-b93f-42e3-a8f0-deab5898423c/subagents/agent-a12c8ff285cd94a36.jsonl`

## Transcript

### User | 2026-05-20T03:46:56.218Z

You are surveying the PRISM codebase (cwd `H:/prism`) for what already exists around **token / context / budget awareness**. The goal: produce a deduplication map so a forthcoming token-awareness build does not re-create what already works.

Report under 800 words. For each surface, list: name, file path, what it tracks, where it surfaces (hook / skill / dispatcher action / dashboard / file), and whether it integrates with `/compact` / autopilot / autonomous /loop. Prefer dense bullets over prose.

Search across these specific areas — use Grep/Glob (NOT Bash find/grep):

1. **Skills** under `.claude/commands/` and `~/.claude/commands/` containing "token", "budget", "compact", "context-pressure", "context-budget", "session-budget", "token-dashboard", "token-ledger", "token-economy".
2. **Hooks** under `.claude/hooks/` matching: token-budget-gate, precompact*, context-pressure, session-budget, autocompact, compact-boundary, ollama-offload-stats (offload routing IS token-awareness).
3. **Dispatcher actions** in `prism_dev` and `prism_context` matching: `token_economy_*`, `token_accounting_*`, `token_budget_*`, `token_ledger_*`, `session_budget_*`, `context_pressure_*`, `context_budget_*`, `compact_*`, `precompact_*`. Just grep `mcp-server/src/tools/dispatchers/*.ts` for the action names.
4. **Engines** named like `*TokenEconomy*`, `*Budget*`, `*SessionBudget*`, `*ContextPressure*`, `*Compaction*`, `*Precompact*`.
5. **State files** under `mcp-server/data/state/` matching `*token*`, `*budget*`, `*usage*`, `*offload-stats*`, `*pressure*`, `*compaction*`.
6. **Auto-compact related** — look at `.claude/hooks/precompact-auto-trigger.mjs` (read it fully), and the `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` env knob — where is it set, where is it read.
7. **Statusline** — does PRISM ship a statusline script? Look for `statusLine` in `.claude/settings.json` (read both `C:/Users/wompu/.claude/settings.json` and `H:/.claude/settings.json`) and any `statusline*.mjs` under `.claude/`.
8. **
... [+828 chars truncated]

### Assistant | 2026-05-20T03:47:21.076Z

I'll survey the PRISM codebase for existing token/context/budget awareness surfaces.

### Assistant | 2026-05-20T03:47:21.298Z

[tool_use: Glob]

### User | 2026-05-20T03:47:43.484Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-20T03:47:46.540Z

[tool_use: Glob]

### User | 2026-05-20T03:48:07.848Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-20T03:48:12.779Z

[tool_use: Glob]

### User | 2026-05-20T03:48:14.012Z

[tool_result] No files found

### Assistant | 2026-05-20T03:48:17.237Z

[tool_use: Glob]

### User | 2026-05-20T03:48:18.385Z

[tool_result] H:/.claude/commands\analysis\token-usage.md
H:/.claude/commands\token-budget.md
H:/.claude/commands\token-ledger.md
H:/.claude/commands\token-dashboard.md

### Assistant | 2026-05-20T03:48:21.292Z

[tool_use: Glob]

### User | 2026-05-20T03:48:23.417Z

[tool_result] H:/.claude/commands\context-integrity.md
H:/.claude/commands\context-map.md
H:/.claude/commands\context-audit.md
H:/.claude/commands\context.md

### Assistant | 2026-05-20T03:48:31.383Z

[tool_use: Glob]

### User | 2026-05-20T03:48:32.464Z

[tool_result] H:/.claude/commands\token-budget.md

### Assistant | 2026-05-20T03:48:35.868Z

[tool_use: Glob]

### User | 2026-05-20T03:48:39.489Z

[tool_result] H:/.claude/commands\precompact.md

### Assistant | 2026-05-20T03:48:46.646Z

[tool_use: Glob]

### User | 2026-05-20T03:48:49.608Z

[tool_result] H:/.claude/commands\pressure.md

### Assistant | 2026-05-20T03:48:53.000Z

[tool_use: Glob]

### User | 2026-05-20T03:48:57.286Z

[tool_result] No files found

### Assistant | 2026-05-20T03:49:00.968Z

The task is a single-message read-only research survey - no task tracking needed. Continuing the survey.

### Assistant | 2026-05-20T03:49:01.162Z

[tool_use: Glob]

### User | 2026-05-20T03:49:11.762Z

[tool_result] .claude\hooks\cad-token-vocabulary-guard.mjs
.claude\hooks\lib\token-economy-hook.mjs
.claude\hooks\token-budget-gate.mjs

### Assistant | 2026-05-20T03:49:15.006Z

[tool_use: Glob]

### User | 2026-05-20T03:49:21.172Z

[tool_result] .claude\hooks\auto-precompact-watchdog.mjs
.claude\hooks\claim-registry-precompact.mjs
.claude\hooks\claude-brief-precompact.mjs
.claude\hooks\cog-bridge-context-auto-compact.mjs
.claude\hooks\compact-interval-warning.mjs
.claude\hooks\compaction-budget-nudge.mjs
.claude\hooks\compaction-survival-auto.mjs
.claude\hooks\compression-precompact.mjs
.claude\hooks\pre-compact-p1.mjs
.claude\hooks\preco
... [+550 chars truncated]

### Assistant | 2026-05-20T03:49:26.150Z

[tool_use: Glob]

### User | 2026-05-20T03:49:29.060Z

[tool_result] .claude\hooks\commit-pressure-stop-gate.mjs

### Assistant | 2026-05-20T03:49:32.470Z

[tool_use: Glob]

### User | 2026-05-20T03:49:33.531Z

[tool_result] .claude\hooks\cog-bridge-context-auto-compact.mjs
.claude\hooks\context-priority-coordinator.mjs
.claude\hooks\lib\context-chain-hook.mjs
.claude\hooks\ollama-context-aggregator.mjs
.claude\hooks\optimal-context-inject.mjs
.claude\hooks\pretool-context-forecast.mjs
.claude\hooks\prompt-context-inject.mjs
.claude\hooks\subagent-start-context.mjs
.claude\hooks\tier1-context-pack.mjs
.claude\hooks\po
... [+26 chars truncated]

### Assistant | 2026-05-20T03:49:36.710Z

[tool_use: Glob]

### User | 2026-05-20T03:49:37.826Z

[tool_result] .claude\hooks\cognitive-budget-allocator.mjs
.claude\hooks\compaction-budget-nudge.mjs
.claude\hooks\post-tool-batch-budget.mjs
.claude\hooks\__tests__\post-tool-batch-budget.test.mjs
.claude\hooks\auto-learn-budget-guard.mjs
.claude\hooks\__tests__\auto-learn-budget-guard.test.mjs
.claude\hooks\stop-compounding-budget.mjs
.claude\hooks\token-budget-gate.mjs

### Assistant | 2026-05-20T03:49:41.762Z

[tool_use: Glob]

### User | 2026-05-20T03:49:44.272Z

[tool_result] .claude\hooks\__tests__\ollama-task-offloader-classify.test.mjs
.claude\hooks\ollama-task-offloader.mjs
.claude\hooks\__tests__\ollama-task-offloader-autoexec.test.mjs

### Assistant | 2026-05-20T03:49:47.942Z

[tool_use: Read]

### User | 2026-05-20T03:49:50.097Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * precompact-auto-trigger.mjs — Enforce /precompact at 160K tokens.
5	 *
6	 * Goal:
7	 *   Claude runs with a 1M token context window (Opus 4.5). At 900K tokens we MUST run
8	 *   /precompact (writes the per-chat handoff so /startup can resume). The
9	 *   100K remaining buffer is writing-room for the handoff and for Claude's
10	 *   subsequent invocati
... [+5788 chars truncated]

### Assistant | 2026-05-20T03:49:54.176Z

[tool_use: Read]

### User | 2026-05-20T03:49:56.875Z

[tool_result] 120	 * compact boundary.
121	 */
122	function findLastCompactOffset(transcriptPath, fileSize) {
123	  if (!fileSize || fileSize <= 0) return 0;
124	  const start = Math.max(0, fileSize - COMPACT_SCAN_BYTES);
125	  const len = fileSize - start;
126	  let fd = -1;
127	  try {
128	    fd = fs.openSync(transcriptPath, "r");
129	    const buf = Buffer.allocUnsafe(len);
130	    fs.readSync(fd, buf, 0, l
... [+8546 chars truncated]

### Assistant | 2026-05-20T03:50:01.061Z

I have enough on precompact-auto-trigger. Moving to other surfaces.

### Assistant | 2026-05-20T03:50:02.111Z

[tool_use: Grep]

### User | 2026-05-20T03:50:24.228Z

[tool_result] Found 8 files
CLAUDE.md
.claude\settings.json
CLAUDE.html
CLAUDE.md.bak-pre-f2
.claude\settings.json.fastlane.json
.claude\settings.json.checkpoint-2026-05-10.json
H__prism_.claude_hooks_precompact-auto-trigger.mjs
.claude\hooks\precompact-auto-trigger.mjs.pre-1m-backup

### system

... [3 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-20T03:50:35.798Z

Good - statusline exists at `H:/prism/.claude/statusline.mjs`.

### Assistant | 2026-05-20T03:50:36.534Z

[tool_use: Read]

### User | 2026-05-20T03:50:37.895Z

[tool_result] 1	#!/usr/bin/env node
2	// Claude Code statusLine — HP/MP bars + party (NATO slots) + services + window title.
3	// Invoked by Claude Code on every prompt boundary; session JSON on stdin.
4	// Hard timeouts on every probe; ~60s cache on services to keep latency <100ms typical.
5	
6	import fs from 'node:fs';
7	import path from 'node:path';
8	import { execFileSync } from 'node:child_process';
9	impo
... [+3383 chars truncated]

### Assistant | 2026-05-20T03:50:41.922Z

[tool_use: Read]

### User | 2026-05-20T03:50:44.695Z

[tool_result] 80	    const buf = Buffer.alloc(tailWindow);
81	    fs.readSync(fd, buf, 0, tailWindow, stat.size - tailWindow);
82	    fs.closeSync(fd);
83	    const text = buf.toString('utf8');
84	    const compactIdx = text.lastIndexOf('"isCompactSummary":true');
85	    const activeBytes = compactIdx >= 0 ? (tailWindow - compactIdx) : stat.size;
86	    return { tokens: Math.round(activeBytes / TOKEN_BYTES_PER_
... [+4058 chars truncated]

### Assistant | 2026-05-20T03:50:48.771Z

Now let me check dispatcher actions, engines, and remaining surfaces in parallel.

### Assistant | 2026-05-20T03:50:51.006Z

[tool_use: Grep]

### User | 2026-05-20T03:50:57.022Z

[tool_result] mcp-server\src\tools\dispatchers\contextDispatcher.ts:50:  "session_budget_advise",
mcp-server\src\tools\dispatchers\contextDispatcher.ts:51:  "session_budget_one_liner",
mcp-server\src\tools\dispatchers\contextDispatcher.ts:52:  "session_budget_should_compact",
mcp-server\src\tools\dispatchers\contextDispatcher.ts:53:  "session_budget_estimate_capacity",
mcp-server\src\tools\dispatchers\contextDi
... [+5171 chars truncated]

### Assistant | 2026-05-20T03:51:01.746Z

Good. Now engines and state files.

### Assistant | 2026-05-20T03:51:02.373Z

[tool_use: Glob]

### User | 2026-05-20T03:51:09.952Z

[tool_result] mcp-server\src\engines\TokenAccountingEngine.ts
mcp-server\src\engines\TokenBudgetAllocatorEngine.ts
mcp-server\src\engines\SessionTokenLedgerEngine.ts
mcp-server\src\engines\DiffTokenEstimatorEngine.ts
mcp-server\src\engines\TokenEconomyEngine.ts
mcp-server\src\engines\CADTokenRepresentationEngine.ts
mcp-server\src\engines\TokenEconomyTrackerEngine.ts

### Assistant | 2026-05-20T03:51:13.497Z

[tool_use: Glob]

### User | 2026-05-20T03:51:15.505Z

[tool_result] mcp-server\src\engines\ContextBudgetEngine.ts
mcp-server\src\engines\OutputBudgetEngine.ts
mcp-server\src\engines\ConversationBudgetEngine.ts
mcp-server\src\engines\SessionBudgetAdvisorEngine.ts
mcp-server\src\engines\TokenBudgetAllocatorEngine.ts
mcp-server\src\engines\OutputBudgetEnforcerEngine.ts
mcp-server\src\engines\MachineToolErrorBudgetEngine.ts
mcp-server\src\engines\MetrologyBudgetEngine
... [+423 chars truncated]

### Assistant | 2026-05-20T03:51:20.089Z

Single-message research task in progress, no task tracking needed.

### Assistant | 2026-05-20T03:51:20.398Z

[tool_use: Glob]

### User | 2026-05-20T03:51:22.039Z

[tool_result] mcp-server\src\engines\CoolantPressureEngine.ts
mcp-server\src\engines\ContextWindowPressureEngine.ts
mcp-server\src\engines\PipingPressureEngine.ts
mcp-server\src\engines\MemoryPressureMonitorEngine.ts

### Assistant | 2026-05-20T03:51:26.721Z

[tool_use: Glob]

### User | 2026-05-20T03:51:28.939Z

[tool_result] mcp-server\src\engines\CompactPlannerEngine.ts
mcp-server\src\engines\SchemaCompactEngine.ts
mcp-server\src\engines\CompactionStrategyEngine.ts
mcp-server\src\engines\PowderCompactionEngine.ts
mcp-server\src\engines\ContextCompactionEngine.ts
mcp-server\src\engines\PostCompactRestorationEngine.ts
mcp-server\src\engines\CompactionSurvivalEngine.ts
mcp-server\src\engines\CompactFormatterEngine.ts

### Assistant | 2026-05-20T03:51:32.687Z

[tool_use: Glob]

### User | 2026-05-20T03:51:33.725Z

[tool_result] No files found

### Assistant | 2026-05-20T03:51:36.945Z

[tool_use: Glob]

### User | 2026-05-20T03:51:38.094Z

[tool_result] mcp-server\data\state\token-budget-telemetry.jsonl

### Assistant | 2026-05-20T03:51:41.500Z

[tool_use: Glob]

### User | 2026-05-20T03:51:43.697Z

[tool_result] mcp-server\data\state\token-budget-telemetry.jsonl

### Assistant | 2026-05-20T03:51:46.821Z

[tool_use: Glob]

### User | 2026-05-20T03:51:47.791Z

[tool_result] mcp-server\data\state\skill-usage-stats.json

### Assistant | 2026-05-20T03:51:51.377Z

[tool_use: Glob]

### User | 2026-05-20T03:51:52.570Z

[tool_result] mcp-server\data\state\ollama-offload-stats.json.tmp.27168.g0zog5
mcp-server\data\state\ollama-offload-stats.json.tmp.64840.lgdd9k
mcp-server\data\state\ollama-offload-stats.json.tmp.15788.lfgcl5
mcp-server\data\state\ollama-offload-stats.json

### Assistant | 2026-05-20T03:51:55.552Z

[tool_use: Glob]

### User | 2026-05-20T03:51:57.336Z

[tool_result] No files found

### Assistant | 2026-05-20T03:52:00.559Z

[tool_use: Glob]

### User | 2026-05-20T03:52:01.636Z

[tool_result] No files found

### Assistant | 2026-05-20T03:52:09.202Z

[tool_use: Grep]

### User | 2026-05-20T03:52:30.387Z

[tool_result] Found 1 file
.playwright-mcp\page-2026-05-20T03-45-33-692Z.yml

### Assistant | 2026-05-20T03:52:34.647Z

[tool_use: Grep]

### User | 2026-05-20T03:52:56.703Z

[tool_result] Found 1 file
.playwright-mcp\page-2026-05-20T03-45-33-692Z.yml

### Assistant | 2026-05-20T03:53:00.262Z

Neither stream-json nor anthropic-ratelimit headers are parsed in real code — only in a Playwright capture artifact. Now skill summaries.

### Assistant | 2026-05-20T03:53:01.070Z

[tool_use: Read]

### User | 2026-05-20T03:53:03.125Z

[tool_result] 1	---
2	name: token-dashboard
3	description: Token Dashboard — Unified Token Economy View
4	composes_with:
5	  - "/context"
6	  - "/context-audit"
7	  - "/pressure"
8	  - "/token-budget"
9	  - "/token-ledger"
10	  - "/waste-report"
11	---
12	# Token Dashboard — Unified Token Economy View
13	
14	Shows **budget · spend · waste · burn · compression ROI** in one pane. Combines signals from `TokenEcono
... [+785 chars truncated]

### Assistant | 2026-05-20T03:53:58.068Z

I have enough data now. Composing final report.

---

# PRISM Token / Context / Budget Awareness — Existing Surfaces

## 1. Skills (`H:/.claude/commands/`)
- **`/token-dashboard`** — unified budget/spend/waste/burn/compression view; composes `/context`, `/context-audit`, `/pressure`, `/token-budget`, `/token-ledger`, `/waste-report`. Wraps `TokenEconomyEngine` + `SessionTokenLedgerEngine`.
- **`/token-budget`** — budget planning.
- **`/token-ledger`** — per-tool spend record/summary/project/reset.
- **`/analysis/token-usage`** — token-usage analytics.
- **`/context`** · **`/context-audit`** · **`/context-integrity`** · **`/context-map`** — context inspection.
- **`/pressure`** — context pressure read.
- **`/precompact`** — write per-chat handoff before `/compact`.

## 2. Hooks (`H:/prism/.claude/hooks/`)
- **`token-budget-gate.mjs`** — UserPromptSubmit token-budget gate (pre-flight gate, runs before context injectors per CLAUDE.md wiring).
- **`precompact-auto-trigger.mjs`** — PreToolUse SOFT 880K / HARD 940K (env: `PRECOMPACT_SOFT_TOKENS` / `PRECOMPACT_HARD_TOKENS` / `PRECOMPACT_CONTEXT_CAP`). Tail-reads `transcript_path` JSONL → sums last assistant `usage.input_tokens + cache_read + cache_creation`. Falls back to byte-estimate (size/3.5) with **compact-boundary fix** (`findLastCompactOffset` scans for `"isCompactSummary":true`). Per-session SOFT marker + PENDING marker. HS-11 sanity floor (suspect counter > 1.5× cap → soft-nudge not block). Integrates with `/compact`: HARD blocks unless `precompact-pending-<sid>.marker` exists.
- **`auto-precompact-watchdog.mjs`** — monitors precompact trigger health.
- **`compact-interval-warning.mjs`** · **`compaction-budget-nudge.mjs`** · **`compaction-survival-auto.mjs`** · **`compression-precompact.mjs`** · **`pre-compact-p1.mjs`** · **`precompact-dossier.mjs`** · **`precompact-pending-guard.mjs`** · **`precompact-stale-prune-suggest.mjs`** · **`precompact-release-slot.mjs`** · **`session-start-compact-p1.mjs`** · **`memory-a
... [+6307 chars truncated]

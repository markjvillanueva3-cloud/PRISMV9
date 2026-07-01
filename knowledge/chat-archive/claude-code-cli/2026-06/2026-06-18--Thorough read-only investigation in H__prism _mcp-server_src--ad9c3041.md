---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Thorough read-only investigation in H:/prism (mcp-server/src + scripts). Produce"
date: "2026-06-18"
first_ts: "2026-06-18T00:40:23.788Z"
last_ts: "2026-06-18T00:42:35.448Z"
cwd: "H:\\prism"
messages: 79
user_msgs: 35
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-af2d82e12b6a03595.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Thorough read-only investigation in H:/prism (mcp-server/src + scripts). Produce

> **claude-code-cli** | 2026-06-18 | 79 msgs (35 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-af2d82e12b6a03595.jsonl`

## Transcript

### User | 2026-06-18T00:40:23.788Z

Thorough read-only investigation in H:/prism (mcp-server/src + scripts). Produce a CONCRETE design brief — write NO code. Goal: extend PRISM's token telemetry to measure savings per COMPLETED TASK (correlated with task SUCCESS), not just per-prompt/per-hook. The insight (from an X article): "a context-cut that makes the agent miss a file is a NET LOSS the per-prompt telemetry can't see."

READ + report the PUBLIC API (exported singleton, key method signatures, the on-disk state file + its schema) of each:
- mcp-server/src/engines/TokenAccountingEngine.ts
- mcp-server/src/engines/TokenEconomyTrackerEngine.ts
- mcp-server/src/engines/TokenEconomyEngine.ts
- mcp-server/src/engines/SessionTokenLedgerEngine.ts
- mcp-server/src/engines/TokenBudgetAllocatorEngine.ts

REPORT the data these already capture: do ANY of them already record a per-TASK (not per-prompt) unit, or correlate token spend/savings with an OUTCOME (success/fail/committed/tests-passed)? Quote the field if so.

CRITICAL DEDUP CHECK — does PRISM already have a task-outcome / closed-loop ledger that records task success? Investigate:
- The outcome dispatcher / `prism_outcome` (grep "prism_outcome", "outcomeDispatcher", "OutcomeLedger", "appendOutcome").
- mcp-server/data/state/ollama-offload-stats.json (schema + what byHook records) and state/shared/dashboards/psn-savings-aggregate.json (schema).
- Any existing engine correlating savings with success (grep "perTask", "taskOutcome", "savingsPerTask", "netSavings", "falseEconomy").
- The scrutiny ledger (SCRUTINY_LEDGER.json) + commit/test-pass signals as candidate "task success" sources.

DELIVER a tight design brief:
- (a) The MINIMAL extension: which existing engine to extend (NOT a new engine unless none fits — justify), the new method(s) + the on-disk record shape {taskId, tokensSpent, tokensSaved(bySubstrate), outcome: success|fail|abandoned, evidence}.
- (b) Where "task success" comes from (which existing signal — scrutiny PASS? commit? tests-passed? ou
... [+564 chars truncated]

### Assistant | 2026-06-18T00:40:25.804Z

I'll conduct a thorough investigation of PRISM's token telemetry infrastructure and task-outcome correlation capabilities. Let me start by exploring the token accounting engines and then verify whether task-outcome tracking already exists.

### Assistant | 2026-06-18T00:40:26.022Z

[tool_use: Glob]

### Assistant | 2026-06-18T00:40:26.307Z

[tool_use: Glob]

### Assistant | 2026-06-18T00:40:26.459Z

[tool_use: Glob]

### Assistant | 2026-06-18T00:40:26.482Z

[tool_use: Glob]

### Assistant | 2026-06-18T00:40:26.663Z

[tool_use: Glob]

### Assistant | 2026-06-18T00:40:26.843Z

[tool_use: Glob]

### Assistant | 2026-06-18T00:40:26.983Z

[tool_use: Glob]

### User | 2026-06-18T00:40:38.804Z

[tool_result] No files found

### User | 2026-06-18T00:40:38.879Z

[tool_result] mcp-server\src\engines\TokenBudgetAllocatorEngine.ts
src\engines\TokenBudgetAllocatorEngine.ts
.claude\worktrees\brave-euclid\mcp-server\src\engines\TokenBudgetAllocatorEngine.ts
tmp\prism-consensus-recovery\mcp-server\src\engines\TokenBudgetAllocatorEngine.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\engines\TokenBudgetAllocatorEngine.ts
prism-test-6d0595\mcp-server\src\engines\TokenBudgetAl
... [+206 chars truncated]

### User | 2026-06-18T00:40:38.973Z

[tool_result] mcp-server\src\engines\TokenEconomyTrackerEngine.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\engines\TokenEconomyTrackerEngine.ts
prism-test-6d0595\mcp-server\src\engines\TokenEconomyTrackerEngine.ts
.claude\worktrees\agent-a39ea356e3f158cf4\mcp-server\src\engines\TokenEconomyTrackerEngine.ts
.claude\worktrees\agent-ad02ba149880ce364\mcp-server\src\engines\TokenEconomyTrackerEngine.ts

### User | 2026-06-18T00:40:39.049Z

[tool_result] mcp-server\src\engines\TokenAccountingEngine.ts
src\engines\TokenAccountingEngine.ts
.claude\worktrees\brave-euclid\mcp-server\src\engines\TokenAccountingEngine.ts
tmp\prism-consensus-recovery\mcp-server\src\engines\TokenAccountingEngine.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\engines\TokenAccountingEngine.ts
prism-test-6d0595\mcp-server\src\engines\TokenAccountingEngine.ts
.claude\workt
... [+166 chars truncated]

### User | 2026-06-18T00:40:39.144Z

[tool_result] mcp-server\src\engines\SessionTokenLedgerEngine.ts
src\engines\SessionTokenLedgerEngine.ts
.claude\worktrees\brave-euclid\mcp-server\src\engines\SessionTokenLedgerEngine.ts
tmp\prism-consensus-recovery\mcp-server\src\engines\SessionTokenLedgerEngine.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\engines\SessionTokenLedgerEngine.ts
prism-test-6d0595\mcp-server\src\engines\SessionTokenLedgerEngin
... [+190 chars truncated]

### User | 2026-06-18T00:40:39.209Z

[tool_result] mcp-server\src\engines\TokenEconomyEngine.ts
src\engines\TokenEconomyEngine.ts
tmp\prism-consensus-recovery\mcp-server\src\engines\TokenEconomyEngine.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\engines\TokenEconomyEngine.ts
prism-test-6d0595\mcp-server\src\engines\TokenEconomyEngine.ts
.claude\worktrees\agent-a39ea356e3f158cf4\mcp-server\src\engines\TokenEconomyEngine.ts
.claude\worktrees\ag
... [+66 chars truncated]

### User | 2026-06-18T00:40:39.254Z

[tool_result] mcp-server\src\__tests__\outcomeDispatcher.test.ts
mcp-server\dist\tools\dispatchers\outcomeDispatcher.d.ts
mcp-server\src\tools\dispatchers\outcomeDispatcher.ts
mcp-server\src\__tests__\outcomeDispatcher.uwireFeedbackCollector.test.ts

### Assistant | 2026-06-18T00:40:40.597Z

Now let me read the token accounting engines and outcome dispatcher from the main mcp-server directory:

### Assistant | 2026-06-18T00:40:41.025Z

[tool_use: Read]

### Assistant | 2026-06-18T00:40:41.235Z

[tool_use: Read]

### Assistant | 2026-06-18T00:40:41.443Z

[tool_use: Read]

### Assistant | 2026-06-18T00:40:41.965Z

[tool_use: Read]

### User | 2026-06-18T00:40:42.024Z

[tool_result] 1	/**
2	 * TokenAccountingEngine — Centralized token cost accounting
3	 *
4	 * Tracks actual vs optimized token costs across all tool interactions.
5	 * Provides per-tool cost baselines, actual costs, and efficiency scores.
6	 * Powers the /token-budget and /hook-stats commands with data.
7	 *
8	 * Token savings: Meta-engine — no direct savings, enables optimization.
9	 *
10	 * @version 1.0.0
11	 
... [+5191 chars truncated]

### Assistant | 2026-06-18T00:40:42.075Z

[tool_use: Read]

### Assistant | 2026-06-18T00:40:42.150Z

[tool_use: Read]

### User | 2026-06-18T00:40:42.353Z

[tool_result] 1	/**
2	 * TokenEconomyTrackerEngine
3	 *
4	 * Tracks token spending across sessions, identifies waste patterns,
5	 * and provides optimization recommendations.
6	 *
7	 * Features:
8	 * - Per-session and cumulative tracking
9	 * - Operation categorization (build, test, search, edit, read)
10	 * - Waste detection (redundant reads, unnecessary exploration)
11	 * - Savings attribution (RTK, hooks, of
... [+17641 chars truncated]

### User | 2026-06-18T00:40:42.644Z

[tool_result] 1	/**
2	 * TokenEconomyEngine — MXU-MS2
3	 *
4	 * Optimal token allocation and context management:
5	 *   1. Budget computation — per-task token allocation
6	 *   2. Spending tracking — actual vs budgeted per session
7	 *   3. Waste detection — identify token waste patterns
8	 *   4. Compression strategy — recommend context compression approaches
9	 *   5. ROI computation — token cost vs capabilit
... [+15830 chars truncated]

### User | 2026-06-18T00:40:43.077Z

[tool_result] 1	/**
2	 * SessionTokenLedgerEngine - Real-time token accounting ledger
3	 *
4	 * Tracks every tool call's estimated input/output token cost, maintains
5	 * running totals, and provides burn rate analysis. Identifies the most
6	 * expensive operations and predicts context exhaustion.
7	 *
8	 * @version 1.0.0
9	 */
10	
11	export interface LedgerEntry {
12	  tool: string;
13	  inputTokens: number;
1
... [+4897 chars truncated]

### User | 2026-06-18T00:40:43.235Z

[tool_result] 1	/**
2	 * TokenBudgetAllocatorEngine — Allocates token budget across task phases
3	 *
4	 * Given a total token budget and a set of task phases, optimally
5	 * distributes tokens to maximize productivity. Reserves tokens for
6	 * critical operations (commits, tests, handoffs).
7	 *
8	 * Token savings: Prevents running out of context at critical moments
9	 * by ensuring budget reserves for essentia
... [+4502 chars truncated]

### User | 2026-06-18T00:40:43.575Z

[tool_result] 1	/**
2	 * outcomeDispatcher.ts — prism_outcome MCP dispatcher
3	 * =====================================================
4	 *
5	 * Exposes PRISM's closed-loop learning backbone as a single coherent
6	 * MCP tool surface. Wires all 9 previously-dormant Outcome engines:
7	 *
8	 *   capture_bus_record          → OutcomeCaptureBusEngine.record()
9	 *   capture_bus_query           → OutcomeCaptureBusE
... [+28297 chars truncated]

### Assistant | 2026-06-18T00:40:46.316Z

Now let me search for outcome tracking related files and state schemas:

### Assistant | 2026-06-18T00:40:46.979Z

[tool_use: Grep]

### Assistant | 2026-06-18T00:40:47.227Z

[tool_use: Glob]

### Assistant | 2026-06-18T00:40:47.406Z

[tool_use: Glob]

### Assistant | 2026-06-18T00:40:47.857Z

[tool_use: Grep]

### User | 2026-06-18T00:40:49.384Z

[tool_result] Found 30 files limit: 30
mcp-server\src\index.ts
mcp-server\src\__tests__\XprocOutcomeLedgerDurability.test.ts
mcp-server\src\engines\XprocOutcomeLedgerDurability.ts
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
mcp-server\src\engines\OutcomePublishAdapterEngine.ts
mcp-server\src\schemas\devActionSchemas.ts
mcp-server\src\tools\dispatchers\quotingDispatcher.ts
mcp-server\web\src\__test
... [+1393 chars truncated]

### User | 2026-06-18T00:40:50.251Z

[tool_result] Found 20 files limit: 20
mcp-server\src\tools\dispatchers\cadRegressionDispatcher.ts
mcp-server\src\schemas\cadRegressionActionSchemas.ts
mcp-server\src\__tests__\cost-dashboard.test.ts
mcp-server\src\routes\cost.ts
mcp-server\src\__tests__\CostAlarmEngine.test.ts
mcp-server\src\engines\CostAlarmEngine.ts
prism-test-6d0595\mcp-server\web\src\pages\PostProcessorPage.tsx
prism-test-6d0595\mcp-server
... [+858 chars truncated]

### User | 2026-06-18T00:40:56.558Z

[tool_result] data\state\HEALTH_CHECK_REPORT.json
data\state\BASELINE_INVENTORY.json
.claude\worktrees\brave-euclid\mcp-server\data\state\BASELINE_INVENTORY.json
.claude\worktrees\brave-euclid\mcp-server\data\state\HEALTH_CHECK_REPORT.json
data\state\AUTOMATION_CENSUS.json
mcp-server\data\state\AUTOMATION_CENSUS.json
.git\backup-untracked\mcp-server\data\state\DARK_ENGINE_TRIAGE.json
data\state\DARK_ENGINE_TRIA
... [+5752 chars truncated]

### User | 2026-06-18T00:40:56.607Z

[tool_result] .git\backup-untracked\mcp-server\src\engines\OutcomeTrackingEngine.ts
mcp-server\src\engines\OutcomeTrackingEngine.ts
tmp\prism-consensus-recovery\mcp-server\src\engines\OutcomeTrackingEngine.ts
prism-test-6d0595\mcp-server\src\engines\OutcomeTrackingEngine.ts
.claude\worktrees\agent-a39ea356e3f158cf4\mcp-server\src\engines\OutcomeTrackingEngine.ts
.claude\worktrees\agent-ad02ba149880ce364\mcp-ser
... [+40 chars truncated]

### Assistant | 2026-06-18T00:40:58.256Z

Let me read the OutcomeTrackingEngine and check the state schema files:

### Assistant | 2026-06-18T00:40:58.531Z

[tool_use: Read]

### Assistant | 2026-06-18T00:40:58.946Z

[tool_use: Read]

### User | 2026-06-18T00:40:59.394Z

[tool_result] 1	/**
2	 * OutcomeTrackingEngine — Phase 0.19 U-LLM5
3	 *
4	 * Log real shop outcomes for every program PRISM produces so downstream
5	 * learning loops (U-LLM6 IncrementalLearning, CausalReasoningEngine,
6	 * TransferLearningBridge) can train on truthful signal instead of
7	 * synthetic self-play.
8	 *
9	 * One outcome per machine run, stored as JSON lines at
10	 * `<data>/outcomes/outcomes.jsonl
... [+8439 chars truncated]

### User | 2026-06-18T00:40:59.447Z

[tool_result] EISDIR: illegal operation on a directory, read 'H:\prism\mcp-server\data\state'

### Assistant | 2026-06-18T00:40:59.472Z

[tool_use: Grep]

### User | 2026-06-18T00:41:00.808Z

[tool_result] Found 20 files limit: 20
mcp-server\data\state\wiki-recall-counts.json
mcp-server\data\state\SCRUTINY_LEDGER.json
mcp-server\data\state\settings-baseline-2026-06-18T00-13-45-158Z.json
mcp-server\data\state\settings-baseline-2026-06-18T00-13-12-610Z.json
mcp-server\data\state\settings-baseline-2026-06-18T00-10-36-398Z.json
mcp-server\data\state\settings-baseline-2026-06-18T00-08-54-667Z.json
mcp-se
... [+776 chars truncated]

### Assistant | 2026-06-18T00:41:02.706Z

Let me read the scrutiny ledger and state files:

### Assistant | 2026-06-18T00:41:03.090Z

[tool_use: Read]

### Assistant | 2026-06-18T00:41:03.311Z

[tool_use: Bash]

### Assistant | 2026-06-18T00:41:03.571Z

[tool_use: Bash]

### User | 2026-06-18T00:41:03.996Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "_lastBackfillTs": "2026-05-08T16:41:54.025Z",
4	  "entries": {
5	    "72879035": {
6	      "sessionId": "72879035",
7	      "recordedAt": "2026-06-12T04:17:34.947Z",
8	      "selfReviewed": false,
9	      "agentReviewed": true,
10	      "codexReviewed": true,
11	      "claudeReviewed": true,
12	      "opusReviewed": true,
13	      "reviews": {
14	        "opu
... [+4709 chars truncated]

### User | 2026-06-18T00:41:06.868Z

[tool_result] H:/prism/mcp-server/data/state/ollama-nav-enforce-seen.json
H:/prism/mcp-server/data/state/ollama-offload-stats.json
H:/prism/mcp-server/data/state/ollama-rate-limits.json
H:/prism/mcp-server/data/state/ollama-route-config.json

### User | 2026-06-18T00:41:11.001Z

[tool_result] -rw-r--r-- 1 wompu 197611      344 Apr 19 11:42 ABSTRACTION_HIERARCHY.json
-rw-r--r-- 1 wompu 197611  2091790 Jun  6 00:15 ACTIONS_INDEX.json
-rw-r--r-- 1 wompu 197611  1436416 Apr 17 08:01 ACTION_RESOLUTION_INDEX.json
-rw-r--r-- 1 wompu 197611    30841 Apr 19 15:34 AGENT_REGISTRY.json
-rw-r--r-- 1 wompu 197611     3874 Apr 17 22:00 AI_SYSTEM_UTILIZATION.json
-rw-r--r-- 1 wompu 197611   600776 Apr
... [+2513 chars truncated]

### Assistant | 2026-06-18T00:41:12.916Z

Now let me read the ollama-offload-stats and check for existing task-outcome correlation:

### Assistant | 2026-06-18T00:41:13.123Z

[tool_use: Read]

### Assistant | 2026-06-18T00:41:13.581Z

[tool_use: Bash]

### Assistant | 2026-06-18T00:41:14.077Z

[tool_use: Grep]

### User | 2026-06-18T00:41:14.270Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1674 of 2989 total (37931 tokens, cap 25000). Call Read with offset=1675 limit=1674 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "schemaVersion": "2.0.0",
3	  "lastUpdated": "2026-06-18T00:41:13.311Z",
4	  "lastReset": "2026-
... [+54244 chars truncated]

### User | 2026-06-18T00:41:15.568Z

[tool_result] Found 15 files limit: 15
mcp-server\src\engines\ZuluWaveSchedulerEngine.ts
mcp-server\src\engines\ShopFloorCheckInEngine.ts
mcp-server\src\engines\InfiniteConditionCombinatorEngine.ts
mcp-server\src\engines\OutcomeFeedbackOverrideStoreEngine.ts
mcp-server\src\engines\CrossProcessOutcomeStore.ts
mcp-server\src\engines\SpeedFeedUltimateAIEngine.ts
mcp-server\src\engines\MillingDeepAIHardeningEngine.
... [+409 chars truncated]

### User | 2026-06-18T00:41:17.437Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-18T00:41:19.828Z

Let me check for PSN savings aggregate and look for any existing task-outcome correlation:

### Assistant | 2026-06-18T00:41:20.248Z

[tool_use: Bash]

### Assistant | 2026-06-18T00:41:21.307Z

[tool_use: Grep]

### Assistant | 2026-06-18T00:41:21.387Z

[tool_use: Read]

### User | 2026-06-18T00:41:22.309Z

[tool_result] 236	export function registerOutcomeDispatcher(server: any): void {
237	  server.tool(
238	    "prism_outcome",
239	    [
240	      "Outcome learning backbone dispatcher -- 46 actions across 9 engines.",
241	      "Covers: capture bus (record/query/stats/flush), per-program outcome tracking",
242	      "(log/query/stats), outcome tracing (experience tuple + MLLineage edges),",
243	      "outcome pu
... [+1699 chars truncated]

### User | 2026-06-18T00:41:22.852Z

[tool_result] Found 30 files limit: 30
mcp-server\src\engines\PPJobScenarioAdvisorEngine.ts
mcp-server\src\engines\RoadmapIntelligenceEngine.ts
mcp-server\src\engines\CrossProcessOutcomeStore.ts
mcp-server\src\engines\OutcomePublishAdapterEngine.ts
mcp-server\src\engines\WEDMMultiAgentDispatchEngine.ts
mcp-server\src\engines\ZuluCapabilityAttestationEngine.ts
mcp-server\src\engines\AdaptiveShopRateEngine.ts
mcp
... [+1270 chars truncated]

### User | 2026-06-18T00:41:23.736Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-18T00:41:25.438Z

Let me check the CostSavingsTrackerEngine and look at the schemas:

### Assistant | 2026-06-18T00:41:25.905Z

[tool_use: Read]

### User | 2026-06-18T00:41:26.748Z

[tool_result] 1	/**
2	 * CostSavingsTrackerEngine — VAL-MS0 V0-U01
3	 *
4	 * The #1 sales tool for PRISM: proves ROI by tracking every optimization
5	 * recommendation and its dollar impact. Generates monthly reports showing
6	 * exactly how much money PRISM saves the shop.
7	 *
8	 * Tracks 6 savings categories:
9	 *   1. Tool life extension (Taylor-predicted vs premature change)
10	 *   2. Cycle time reduction
... [+5248 chars truncated]

### Assistant | 2026-06-18T00:41:27.015Z

[tool_use: Grep]

### Assistant | 2026-06-18T00:41:27.608Z

[tool_use: Bash]

### User | 2026-06-18T00:41:28.394Z

[tool_result] 18:export interface TokenSpend {
50:  | "failed_operation"
103:  spends: TokenSpend[];
138:          failed_operation: 1,
155:  recordSpend(spend: Omit<TokenSpend, "timestamp">): TokenSpend {
156:    const record: TokenSpend = {
170:  private detectWaste(spend: TokenSpend): WasteFlag[] {
201:  private updateSessionSummary(spend: TokenSpend): void {
249:  private calculateCost(spend: TokenSpend): n
... [+147 chars truncated]

### User | 2026-06-18T00:41:31.772Z

[tool_result] H:/prism/mcp-server/src/algorithms/CriticalPathSchedulingFormula.ts:  // Reconstruct critical path: chain critical tasks from start → end via successor
H:/prism/mcp-server/src/engines/AgentSpecializationProfileEngine.ts:  private taskHistory: Array<{ task_id: string; profile_id: string; success: boolean; duration_ms: number }> = [];
H:/prism/mcp-server/src/engines/AgentSpecializationProfileEngine.
... [+2114 chars truncated]

### Assistant | 2026-06-18T00:41:33.967Z

Now let me gather the final pieces - check CAMConfidenceCalibrationEngine and CAMFeedbackLoopEngine to see how task outcomes are tracked:

### Assistant | 2026-06-18T00:41:34.179Z

[tool_use: Read]

### Assistant | 2026-06-18T00:41:34.339Z

[tool_use: Read]

### User | 2026-06-18T00:41:34.991Z

[tool_result] 1	/**
2	 * CAMConfidenceCalibrationEngine — CAM-EXHAUST-MS0/U-CAM119
3	 *
4	 * Decision-confidence calibration & uncertainty quantification for CAM AGI
5	 * decisions. Wraps the orchestrator's raw composite confidence into a
6	 * calibrated probability that the decision will actually be correct in
7	 * production, plus an uncertainty interval. Distinct from the existing
8	 * PredictionCalibrationE
... [+5213 chars truncated]

### User | 2026-06-18T00:41:35.206Z

[tool_result] 1	/**
2	 * CAMFeedbackLoopEngine — CAM-EXHAUST-MS0/U-CAM120
3	 *
4	 * Continuous-learning feedback collection for CAM AGI decisions. Distinct
5	 * from existing engines:
6	 *   - CAMMLDriftMonitorEngine — watches MAE drift on a held-out test set;
7	 *     this engine watches accuracy drift on LIVE production decisions.
8	 *   - FeedbackCollectorEngine — shop-floor thumbs-up/down on whole NC
9	 *  
... [+5408 chars truncated]

### Assistant | 2026-06-18T00:42:35.448Z

Perfect! Now I have enough context to write a comprehensive design brief. Let me compose it:

---

## DESIGN BRIEF: Task-Outcome-Correlated Token Telemetry (Savings per Completed Task)

### EXECUTIVE SUMMARY

PRISM's current token telemetry (`TokenAccountingEngine`, `TokenEconomyTrackerEngine`, `SessionTokenLedgerEngine`, `TokenBudgetAllocatorEngine`) records token spend **per-prompt, per-hook, per-session** but lacks a **per-TASK (not per-prompt) ledger that correlates token spend/savings with task OUTCOME (success/fail/committed/tests-passed)**. The insight from the X article is correct: "a context-cut that makes the agent miss a file is a NET LOSS the per-prompt telemetry can't see" — if a file-miss causes task failure, those "saved" tokens are actually worthless (false economy).

**CRITICAL FINDING: PRISM already has task-outcome tracking.** The `OutcomeTrackingEngine` records outcomes at `data/outcomes/outcomes.jsonl` (append-only JSONL), with kinds: `good | scrap | adjusted | aborted`. The `prism_outcome` dispatcher exposes 46 actions across 9 engines (capture bus, outcome tracking, outcome trace, publish adapter, replay buffer, RL bridge, drift bridge, episodic bridge, feedback collector). A task is keyed by **`programId`** (not commit subject or unit-id), and success is recorded as `outcome: "good"` (outcomeTrackingEngine.ts:34-35, 39).

**DUPLICATION CHECK RESULT: DO NOT BUILD DUPLICATE.** `CAMFeedbackLoopEngine` (lines 88-118) and `CAMConfidenceCalibrationEngine` (lines 92-98) ALREADY correlate AI **decisions** with outcomes (`wasCorrect: boolean`, `recordedAt: number`), stored per task in ring buffers. These are narrower (AI-decision-specific) but prove the pattern is known. `CostSavingsTrackerEngine` (lines 38-62) tracks savings **events** (6 categories: tool_life, cycle_time, crash_prevention, scrap_avoidance, energy, utilization) with `accepted?: boolean` — per-event acceptance but NOT per-task-outcome correlation. **None correlate TOKENS spent with ta
... [+17677 chars truncated]

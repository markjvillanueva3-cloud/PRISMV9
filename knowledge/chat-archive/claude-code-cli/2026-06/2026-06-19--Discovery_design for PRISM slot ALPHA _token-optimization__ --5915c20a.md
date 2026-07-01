---
type: "chat-session"
source: "claude-code-cli"
session_id: "5915c20a-a517-4e95-bc12-edf7d9055431"
title: "Discovery+design for PRISM slot ALPHA (token-optimization), repo H:/prism. Find "
date: "2026-06-19"
first_ts: "2026-06-19T19:00:33.849Z"
last_ts: "2026-06-19T19:03:36.480Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/5915c20a-a517-4e95-bc12-edf7d9055431/subagents/agent-a2c50f1bb002f5e1e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Discovery+design for PRISM slot ALPHA (token-optimization), repo H:/prism. Find 

> **claude-code-cli** | 2026-06-19 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5915c20a-a517-4e95-bc12-edf7d9055431/subagents/agent-a2c50f1bb002f5e1e.jsonl`

## Transcript

### User | 2026-06-19T19:00:33.849Z

Discovery+design for PRISM slot ALPHA (token-optimization), repo H:/prism. Find the SINGLE highest-ROI, alpha-safe, buildable-NOW unit + a concrete build+test plan. Read actual files, cite file:line. Honest (R12): if a surface is already complete, say so — don't invent a gap. "alpha-safe + buildable" = no CAD/CAM/physics domain knowledge; real reference-value tests writable (R9, never toBeDefined stubs); EXTENDS existing infra not duplicates (R8).

Survey these surfaces; for each: what's already built/measured, the concrete GAP (or "no gap"), buildable unit + ROI(hi/med/lo):

1. TOKEN-TELEMETRY DORMANT WIRING (most alpha-safe). Engines in mcp-server/src/engines/: TokenEconomyEngine.ts, TokenEconomyTrackerEngine.ts, TokenAccountingEngine.ts, SessionTokenLedgerEngine.ts, TokenBudgetAllocatorEngine.ts, TokenAwarenessEngine.ts. Grep each for dispatcher wiring (prism_dev/prism_session token_*/economy actions) + barrel export in the engines index. Find any DORMANT/unwired engine OR a public method computing a useful metric that NO dispatcher action exposes. Clean unit = wire a dormant engine/method to its natural dispatcher action (z.enum + lazy import + zod schema + case) with a real round-trip test. Name the EXACT engine + method + target dispatcher + proposed action name.

2. OLLAMA OFFLOAD stat correctness. Read mcp-server/data/state/ollama-offload-stats.json (its shape — does it separate ADVISED vs ACTUALLY-OFFLOADED?) + scripts/ollama-offload-dashboard.mjs. Is there a stat BUG (advisory counted as savings / double-count / mislabel) that's a clean fix?

3. GRAPH-INJECT take-rate (GAP-C). Read scripts/lib/nav-savings-ledger.mjs (credits only exact-match collapses?) + scripts/lib/injection-dedup.mjs. Is a take-rate metric feasible by EXTENDING nav-savings-ledger, well-defined WITHOUT operator scope, with a live correlation seam? If it needs new infra/scope, say so.

CONCLUDE: WINNER (one unit + why) + BUILD PLAN (exact files file:line, the change, any dispatcher/hook w
... [+237 chars truncated]

### Assistant | 2026-06-19T19:00:40.171Z

I'll survey all three surfaces in parallel, reading the actual files before making any claims.

### Assistant | 2026-06-19T19:00:45.558Z

[tool_use: Agent]

### Assistant | 2026-06-19T19:00:49.165Z

[tool_use: Agent]

### Assistant | 2026-06-19T19:00:53.215Z

[tool_use: Agent]

### User | 2026-06-19T19:01:59.087Z

[tool_result] [{"type": "text", "text": "Here is the complete, verified picture from the actual file contents:\n\n---\n\n## 1. `ollama-offload-stats.json` \u2014 exact schema (schemaVersion 2.0.0)\n\nFile: `H:/prism/mcp-server/data/state/ollama-offload-stats.json`\n\nTop-level keys:\n\n| Key | Type | What it counts |\n|---|---|---|\n| `schemaVersion` | string | \"2.0.0\" |\n| `lastUpdated` | ISO string | last w
... [+5097 chars truncated]

### User | 2026-06-19T19:02:08.148Z

[tool_result] [{"type": "text", "text": "I have all the data needed. Here is the complete findings report.\n\n---\n\n## Research Findings: Token-Economy Engine Inventory\n\n### 1. File Existence (all 6 confirmed)\n\n| Engine | Path |\n|--------|------|\n| TokenEconomyEngine | `H:/prism/mcp-server/src/engines/TokenEconomyEngine.ts` |\n| TokenEconomyTrackerEngine | `H:/prism/mcp-server/src/engines/TokenEconomyTra
... [+7686 chars truncated]

### User | 2026-06-19T19:02:26.721Z

[tool_result] [{"type": "text", "text": "Here is the complete picture of what was found across all five files.\n\n---\n\n## 1. `scripts/lib/nav-savings-ledger.mjs`\n\n**Path:** `H:/prism/scripts/lib/nav-savings-ledger.mjs`\n\n**What events it records:** Only one event kind \u2014 `\"hit\"` (line 62). A hit is appended via `recordNavHit()` when a graph-inject hook resolves a node label to a real source path and 
... [+6846 chars truncated]

### Assistant | 2026-06-19T19:02:32.350Z

Now I have enough data from all three agents to give a complete, honest assessment. Let me verify one specific gap before concluding.

### Assistant | 2026-06-19T19:02:34.640Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:02:35.765Z

[tool_use: Grep]

### User | 2026-06-19T19:02:36.251Z

[tool_result] No matches found

### User | 2026-06-19T19:02:37.441Z

[tool_result] mcp-server\src\tools\dispatchers\calcDispatcher.ts:1
mcp-server\src\tools\dispatchers\businessDispatcher.ts:1
mcp-server\src\tools\dispatchers\contextDispatcher.ts:3
mcp-server\src\tools\dispatchers\dataDispatcher.ts:1
mcp-server\src\tools\dispatchers\camDispatcher.ts:1
mcp-server\src\tools\dispatchers\devDispatcher.ts:7
mcp-server\src\tools\dispatchers\hookDispatcher.ts:2
mcp-server\src\tools\dis
... [+465 chars truncated]

### Assistant | 2026-06-19T19:02:43.803Z

The first grep confirms zero dispatcher wiring for the 7 unwired methods. The second grep confirms those method names appear only in files OTHER than as action names — they are called internally by other engines, not wired to any dispatcher action. Let me check one of these to confirm the pattern is truly a gap and not a deliberate omission.

### Assistant | 2026-06-19T19:02:44.571Z

[tool_use: Read]

### Assistant | 2026-06-19T19:02:45.258Z

[tool_use: Read]

### User | 2026-06-19T19:02:45.430Z

[tool_result] 390	   * Compute token ROI for a session.
391	   */
392	  computeROI(
393	    taskClass: TaskClass,
394	    tokensSpent: number,
395	    capabilitiesDelivered: number,
396	  ): TokenROI {
397	    const costPerCap = capabilitiesDelivered > 0 ? tokensSpent / capabilitiesDelivered : Infinity;
398	
399	    let rating: TokenROI["efficiency_rating"];
400	    if (costPerCap < 10_000) rating = "excellent"
... [+1742 chars truncated]

### User | 2026-06-19T19:02:46.221Z

[tool_result] 120	   */
121	  project(): BurnProjection {
122	    const s = this.summary();
123	    const tokensRemaining = Math.max(0, this.contextLimit - s.totalTokens);
124	
125	    let estimatedMinutesLeft = Infinity;
126	    if (s.burnRate > 0) {
127	      estimatedMinutesLeft = Math.round(tokensRemaining / s.burnRate);
128	    }
129	
130	    let status: "healthy" | "warning" | "critical" = "healthy";
131	
... [+828 chars truncated]

### Assistant | 2026-06-19T19:03:36.480Z

Now I have all the data needed. Here is the complete, honest assessment.

---

SURFACE 1 — TOKEN TELEMETRY DORMANT WIRING

What is built: All 6 engines exist. Dispatcher coverage is substantial:
- `prism_context`: 13 actions covering `TokenEconomyEngine`, `TokenAccountingEngine`, `TokenBudgetAllocatorEngine`, `TokenAwarenessEngine`
- `prism_dev`: 12 actions covering `SessionTokenLedgerEngine`, `TokenEconomyTrackerEngine`

Genuine gaps — methods with zero dispatcher action coverage anywhere:

| Engine | Unwired method | What it returns |
|--------|---------------|-----------------|
| `TokenEconomyEngine.ts:392` | `computeROI(taskClass, tokensSpent, capabilitiesDelivered)` | `{task_class, tokens_spent, capabilities_unlocked, cost_per_capability, efficiency_rating}` |
| `TokenEconomyEngine.ts:459` | `getAllWastePatterns()` | `WastePattern[]` — all known waste patterns for a task class |
| `SessionTokenLedgerEngine.ts:147` | `mostExpensive()` | `LedgerEntry | undefined` — the single costliest tool call this session |
| `SessionTokenLedgerEngine.ts:157` | `oneLiner()` | `string` — single-line budget status for display |
| `TokenBudgetAllocatorEngine.ts:120` | `suggestCut(plan)` | `string | null` — first cut recommendation when over budget |

The highest-signal gap is `computeROI` + `mostExpensive` — they are diagnostic methods callers would naturally want to invoke via `prism_context` or `prism_dev`. `getAllWastePatterns`, `oneLiner`, and `suggestCut` are lower utility as standalone dispatcher actions (advisory/display helpers).

WINNER FOR SURFACE 1: Wire `token_economy_compute_roi` to `prism_context` and `token_ledger_most_expensive` to `prism_dev`. Clean, bounded, alpha-safe, real reference-value tests are obvious.

---

SURFACE 2 — OLLAMA OFFLOAD STAT CORRECTNESS

No stat bug. The schema is correctly designed:
- `offloaded` (180) = directive routing decisions
- `executedOffloads` (18) = confirmed executions via `mode: "executed"` early-return in `ollama-stats.mjs:138
... [+5773 chars truncated]

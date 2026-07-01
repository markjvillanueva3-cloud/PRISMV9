---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b4b9149-3502-4570-8dd8-b4bc90fad6ab"
title: "You are auditing the PRISM Speed & Feed Calculator's AI + CLOSED-LOOP LEARNING s"
date: "2026-06-08"
first_ts: "2026-06-08T15:17:56.072Z"
last_ts: "2026-06-08T15:22:37.036Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/workflows/wf_7e2ef90c-869/agent-a7ca641d7c39d61d6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# You are auditing the PRISM Speed & Feed Calculator's AI + CLOSED-LOOP LEARNING s

> **claude-code-cli** | 2026-06-08 | 34 msgs (14 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b4b9149-3502-4570-8dd8-b4bc90fad6ab/subagents/workflows/wf_7e2ef90c-869/agent-a7ca641d7c39d61d6.jsonl`

## Transcript

### User | 2026-06-08T15:17:56.072Z

You are auditing the PRISM Speed & Feed Calculator's AI + CLOSED-LOOP LEARNING stack for a VC technical-diligence report. Read these files in H:/prism and report ONLY what you verify (cite file:line):
- mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts
- mcp-server/src/engines/SpeedFeedOutcomeFeedbackBridgeEngine.ts
- mcp-server/src/engines/SpeedFeedPSNDecisionPriorEngine.ts (Bayesian prior)
- mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts (9-axis composition)
- mcp-server/src/engines/SpeedFeedDownstreamSubscriberEngine.ts
Also check: state/shared/specs/SFC-COMBINATORIAL-HARNESS-PLAN-2026-06-04.md
Report: (1) is there a REAL closed-loop (shop outcome → calibration → improved recommendation)? Trace the data path; (2) what is the "9-axis" — name the axes; (3) Bayesian/ML methods actually used; (4) is the calibration WIRED or flag-gated-off (look for PRISM_SFC_CALIB_APPLY)? Be skeptical — distinguish "designed" from "live". ~600 words max.

### Assistant | 2026-06-08T15:18:11.981Z

I'll read the files in order and trace the actual data path. Let me start with all the engine files in parallel.

### Assistant | 2026-06-08T15:18:12.979Z

[tool_use: Read]

### Assistant | 2026-06-08T15:18:13.344Z

[tool_use: Read]

### Assistant | 2026-06-08T15:18:14.103Z

[tool_use: Read]

### Assistant | 2026-06-08T15:18:14.779Z

[tool_use: Read]

### Assistant | 2026-06-08T15:18:15.244Z

[tool_use: Read]

### User | 2026-06-08T15:18:21.069Z

[tool_result] 1	/**
2	 * SpeedFeedOutcomeFeedbackBridgeEngine — closes the dangling outcome-feedback
3	 * wire identified by audit F9 from SF-PSN-VALUE-NODE-AUDIT-2026-05-22.
4	 *
5	 * Background: `sfcOutcomeWire.captureSFC()` is imported by 5 SF engines but
6	 * NOT by `SpeedFeedDeepLearningEngine` (SF-AI-L1), which holds the
7	 * `calibrationFactors` self-learning state. Outcomes are captured at the
8	 * calc
... [+8667 chars truncated]

### User | 2026-06-08T15:18:22.661Z

[tool_result] 1	/**
2	 * SpeedFeedDeepLearningEngine — SF-AI-L1
3	 *
4	 * First-layer AI hardening for Calculator Studio (Speed/Feed).
5	 * Neural networks, Monte Carlo, Bayesian optimization, chain-of-thought,
6	 * and self-learning feedback for cutting parameter optimization.
7	 *
8	 * AI Capabilities:
9	 * ----------------
10	 * 1. NEURAL NETWORK MODELS
11	 *    - Speed prediction from material/tool/operatio
... [+47194 chars truncated]

### User | 2026-06-08T15:18:22.781Z

[tool_result] 1	/**
2	 * SpeedFeedPSNDecisionPriorEngine — surface a PSN-derived decision prior for SFC.
3	 *
4	 * Closes audit findings F3 (Obsidian-brain not wired) and F4 (wiki not wired)
5	 * from `state/shared/specs/SF-PSN-VALUE-NODE-AUDIT-2026-05-22.md`.
6	 *
7	 * The 9-axis orchestrator builds recommendations from canonical physics. This
8	 * engine asks 3 PSN surfaces — "what worked here before?" — and 
... [+16125 chars truncated]

### User | 2026-06-08T15:18:23.267Z

[tool_result] 1	/**
2	 * SpeedFeedNineAxisOrchestratorEngine — 9-axis comprehensive speed/feed orchestrator.
3	 *
4	 * THIN composition layer over UltimateSpeedFeedEngine.
5	 * Does NOT reinvent physics. Accepts an explicit 9-axis input model and
6	 * derives per-axis multipliers/constraints, then pipes through the canonical
7	 * UltimateSpeedFeedEngine.calculate() for the underlying physics, and
8	 * post-proc
... [+53421 chars truncated]

### User | 2026-06-08T15:18:23.273Z

[tool_result] 1	/**
2	 * SpeedFeedDownstreamSubscriberEngine — wires the 5 downstream PRISM consumers
3	 * to the SpeedFeedPropagationBridge so they auto-receive SFC updates without
4	 * having to call the orchestrator themselves.
5	 *
6	 * The bridge exists (U-OSC9-03). This engine REGISTERS the subscribers so
7	 * that the auto-emit event chain actually moves data into:
8	 *
9	 *   1. Post-processor pipeline 
... [+8966 chars truncated]

### Assistant | 2026-06-08T15:18:30.462Z

Now let me verify the two critical claims: the calibration flag (`PRISM_SFC_CALIB_APPLY`) and whether `captureSFC`/`sfcOutcomeWire` actually writes the outcome ledger that the prior engine reads. Let me check both in parallel.

### Assistant | 2026-06-08T15:18:33.169Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:18:35.095Z

[tool_use: Bash]

### User | 2026-06-08T15:18:50.803Z

[tool_result] ---SFC_CALIB_ANY---
mcp-server/src/engines/ElectrodeDeepLearningEngine.ts
mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts
mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts
mcp-server/src/engines/SpeedFeedOutcomeFeedbackBridgeEngine.ts
mcp-server/src/engines/WireEDMPredictiveIntelligenceEngine.ts
mcp-server/src/schemas/quotingActionSchemas.ts
mcp-server/src/__tests__/SFOutcomeFeed
... [+77 chars truncated]

### User | 2026-06-08T15:20:09.194Z

[tool_result] <persisted-output>
Output too large (1.1MB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\8b4b9149-3502-4570-8dd8-b4bc90fad6ab\tool-results\bqkf0cart.txt

Preview (first 2KB):
/**
 * sfcOutcomeWire — U-PPG-SFC-01 inline helpers
 * =============================================
 *
 * Tiny wrappers around `sfcOutcomeCaptureWireEngine.recordEmission` so each
 * SFC engine adds 1
... [+1786 chars truncated]

### Assistant | 2026-06-08T15:20:22.779Z

Key finding: `PRISM_SFC_CALIB_APPLY` does NOT appear anywhere in the source. Let me confirm the ledger write path and the harness plan spec.

### Assistant | 2026-06-08T15:20:27.189Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:20:27.951Z

[tool_use: Bash]

### User | 2026-06-08T15:20:32.555Z

[tool_result] Exit code 2

### User | 2026-06-08T15:20:32.835Z

[tool_result] ===Does SFCOutcomeCaptureWireEngine write speed_feed.jsonl?===
===calibrationFactors usage in SFNineAxis/OutcomeBridge===
60:// SpeedFeedDeepLearningEngine can fold actuals back into calibrationFactors.
590:    // calibrationFactors. Best-effort: never throws.
===Does NineAxis read the DL calibration?===
59:// captures the recommendation to the AI-ladder calibration ring buffer so
60:// SpeedFeedD
... [+270 chars truncated]

### Assistant | 2026-06-08T15:20:38.288Z

The NineAxis orchestrator never imports or calls `SpeedFeedDeepLearningEngine` — the comments claim "fold actuals back into calibrationFactors" but no code reads the ring buffer. Let me confirm the ledger write path and read the harness spec.

### Assistant | 2026-06-08T15:20:42.241Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:20:43.924Z

[tool_use: Bash]

### User | 2026-06-08T15:20:51.986Z

[tool_result] Exit code 1
===
ls: cannot access 'state/shared/specs/SFC-COMBINATORIAL-HARNESS-PLAN-2026-06-04.md': No such file or directory
===try read===
head: cannot open 'state/shared/specs/SFC-COMBINATORIAL-HARNESS-PLAN-2026-06-04.md' for reading: No such file or directory

### User | 2026-06-08T15:20:53.649Z

[tool_result] ===Where is speed_feed.jsonl written (whole repo)?===
mcp-server/src/engines/SpeedFeedPSNDecisionPriorEngine.ts
mcp-server/src/__tests__/engines/sfcOutcomeCaptureWireEngine.test.ts
===SFCOutcomeCaptureWireEngine: does it persist or in-mem only?===
21: * Design invariants (mirroring OutcomeCaptureBus):
30: *      `recommendations: string[]`). `summarize()` extracts a canonical
81:  customer?: strin
... [+931 chars truncated]

### Assistant | 2026-06-08T15:20:58.120Z

The harness plan spec does not exist at the cited path. Let me locate it (it may be elsewhere) and confirm the ledger is the real write target of the outcome bus.

### Assistant | 2026-06-08T15:21:02.254Z

[tool_use: Bash]

### User | 2026-06-08T15:21:47.504Z

[tool_result] Exit code 2
===find harness plan anywhere===
===Does ANYTHING append to speed_feed.jsonl? (the bus base class)===
mcp-server/src/engines/SFCOutcomeCaptureWireEngine.ts
---trace bus base---
1:// WIRE-EXEMPT: Middleware engine — routes SFC events to OutcomeCaptureBus, not intended for dispatcher exposure
6: * @WIRE-EXEMPT Middleware engine — routes SFC events to OutcomeCaptureBus,
10: * recommendati
... [+478 chars truncated]

### Assistant | 2026-06-08T15:21:56.959Z

The outcome bus does write `speed_feed.jsonl` (86MB live, real data since 2026-05-20). Let me confirm the bus persists to that path and whether the DL calibration self-learning state is in-memory only (lost on restart).

### Assistant | 2026-06-08T15:21:58.952Z

[tool_use: Bash]

### User | 2026-06-08T15:22:07.889Z

[tool_result] ===OutcomeCaptureBus write path===
14: *   - MLLineageEngine (U-LEARN-02) links predictions → outcomes
19: *   2. PER-DOMAIN SHARD.  mill.jsonl vs lathe.jsonl — cross-domain scans
35: *   - OutcomeTrackingEngine owns per-program outcome.jsonl (legacy scope).
58:const OUTCOMES_DIR = path.resolve(process.cwd(), "state/outcomes");
171:   * on the per-domain .jsonl shard's rename-into-place atomic-app
... [+1040 chars truncated]

### Assistant | 2026-06-08T15:22:37.036Z

I have everything verified. Final report.

---

**PRISM Speed & Feed AI / Closed-Loop Audit — verified findings**

**(1) Is there a REAL closed loop? — PARTIAL / BROKEN at the calibration step.**

Trace the data path:
- The orchestrator's `run()` does emit outcomes: `SpeedFeedNineAxisOrchestratorEngine.ts:592` calls `speedFeedOutcomeFeedbackBridgeEngine.capture(input,result)`, and the SFC calculator engines call `captureSFC()` (sfcOutcomeWire.ts:33) → `SFCOutcomeCaptureWireEngine.recordEmission` → `OutcomeCaptureBusEngine`, which **does persist to disk** (`OutcomeCaptureBusEngine.ts:58,289` writes per-domain `state/outcomes/*.jsonl` via atomic copy-then-append). The ledger is real: `mcp-server/state/outcomes/speed_feed.jsonl` is **86 MB**, rows dated from 2026-05-20. So emission → persistence is LIVE.
- But the return leg is **not wired**. `SpeedFeedDeepLearningEngine` holds the `calibrationFactors` state (`SpeedFeedDeepLearningEngine.ts:462`) and its `recordFeedback()` (line 1172) requires `actual` shop values to be passed in by a caller — nothing in the orchestrator or bridge calls it. The `OutcomeFeedbackBridgeEngine.capture()` only writes a **1024-entry in-memory ring buffer** (`SpeedFeedOutcomeFeedbackBridgeEngine.ts:79,206`); its own header (lines 7–10) admits "outcomes are captured at the calculator layer and discarded before they reach the AI-ladder calibration sink… a dangling wire." `recordActuals()` (line 115) and `recentForKey()` (line 142) exist but **grep confirms no engine reads them** — NineAxisOrchestrator never imports `SpeedFeedDeepLearningEngine`; the only `calibrationFactors` references in the orchestrator are **comments** (lines 60, 590), not code. So actuals never re-enter recommendations.
- `recordFeedback`'s own state is `feedbackHistory: FeedbackEntry[] = []` — **in-memory only, no read/writeFile** (lines 461–510), so even the manually-fed calibration is lost on restart.

**Net: designed end-to-end, but the outcome→calibration→improved-reco
... [+2142 chars truncated]

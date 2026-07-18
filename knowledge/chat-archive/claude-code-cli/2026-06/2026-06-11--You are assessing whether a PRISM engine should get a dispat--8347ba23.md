---
type: "chat-session"
source: "claude-code-cli"
session_id: "8347ba23-a479-47f7-8ee0-b6014bc5e610"
title: "You are assessing whether a PRISM engine should get a dispatcher surface. PRISM "
date: "2026-06-11"
first_ts: "2026-06-11T19:28:52.768Z"
last_ts: "2026-06-11T19:36:44.906Z"
cwd: "H:\\prism-slot-bravo"
messages: 31
user_msgs: 12
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/workflows/wf_a8ef8a75-c77/agent-ae644f456b0f8fee3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# You are assessing whether a PRISM engine should get a dispatcher surface. PRISM 

> **claude-code-cli** | 2026-06-11 | 31 msgs (12 user / 19 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/workflows/wf_a8ef8a75-c77/agent-ae644f456b0f8fee3.jsonl`

## Transcript

### User | 2026-06-11T19:28:52.768Z

You are assessing whether a PRISM engine should get a dispatcher surface. PRISM is a manufacturing-intelligence platform; SFC = Speed/Feed Calculator (a saleable product).

TARGET: H:/prism/mcp-server/src/engines/SFCOutcomeCaptureWireEngine.ts (274 lines, currently 0 dispatcher references, 3 engine consumers).

DO THIS:
1. Read the engine END-TO-END. Note its singleton export (e.g. export const xEngine = new X()), its PUBLIC methods + signatures, and what it does. Flag if it is a STUB (placeholder returns, throws not-implemented, empty bodies, Math.random everywhere).
2. grep its consumers: grep -rl "SFCOutcomeCaptureWireEngine" H:/prism/mcp-server/src/engines/ (exclude its own file). For EACH consumer, check whether THAT consumer is itself dispatcher-wired: grep -rl "ConsumerName" H:/prism/mcp-server/src/tools/dispatchers/. If a consumer that USES this engine output is dispatcher-wired, this engine is effectively REACHABLE (WIRE_EXEMPT) -- name the wrapper.
3. Check it is not superseded/archived (newer replacement engine, deprecated/superseded markers, or an *.archive.* sibling).
4. R12-SAFETY: PRISM forbids wiring NN/ML INFERENCE paths that are untrained (random-init weights until LoRA training ships) -- they would silently ship garbage. Determine if the methods you would expose are DATA/deterministic (safe) or NN-inference (NOT safe yet). The sibling speedfeed_dl_stats / speedfeed_advanced_ai_stats actions wire only stats()/introspection, never inference -- follow that precedent.
5. Natural dispatcher for SFC = calcDispatcher.ts (prism_calc). Pattern: a z.enum action-name list + a switch with: case "action": { const { engineSingleton } = await import("../../engines/X.js"); result = {...}; break; }. Read near the speedfeed_dl_stats case to confirm.

CLASSIFY:
- TRUE_ORPHAN_WIRE_IT: real, valuable, NOT reachable via any dispatcher-wired consumer, AND a dispatcher surface exposes genuinely-useful DATA/deterministic capability. Propose actions (action name, engine me
... [+570 chars truncated]

### Assistant | 2026-06-11T19:28:56.454Z

I'll assess this engine systematically. Let me start by reading it end-to-end and checking its consumers in parallel.

### Assistant | 2026-06-11T19:28:56.943Z

[tool_use: Read]

### Assistant | 2026-06-11T19:28:58.680Z

[tool_use: Bash]

### Assistant | 2026-06-11T19:28:59.233Z

[tool_use: Bash]

### User | 2026-06-11T19:29:36.061Z

[tool_result] 1	// WIRE-EXEMPT: Middleware engine — routes SFC events to OutcomeCaptureBus, not intended for dispatcher exposure
2	/**
3	 * SFCOutcomeCaptureWireEngine — U-PPG-SFC-01
4	 * ===========================================
5	 *
6	 * @WIRE-EXEMPT Middleware engine — routes SFC events to OutcomeCaptureBus,
7	 * not intended for direct dispatcher exposure.
8	 *
9	 * Thin instrumentation layer that routes 
... [+10302 chars truncated]

### User | 2026-06-11T19:29:56.148Z

[tool_result] ---dispatcher-refs-done---

### User | 2026-06-11T19:30:20.108Z

[tool_result] H:/prism/mcp-server/src/engines/SFCParameterRefinementEngine.ts
H:/prism/mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts
H:/prism/mcp-server/src/engines/wiring/PATHS.md

### Assistant | 2026-06-11T19:30:24.044Z

The engine carries an explicit `// WIRE-EXEMPT:` tag on line 1 and `@WIRE-EXEMPT` in the doc block. It's a middleware/instrumentation engine. Let me verify the two real engine consumers are themselves dispatcher-wired, which would confirm reachability, and check for supersession.

### Assistant | 2026-06-11T19:30:25.666Z

[tool_use: Bash]

### Assistant | 2026-06-11T19:30:28.944Z

[tool_use: Bash]

### User | 2026-06-11T19:32:04.361Z

[tool_result] === SFCParameterRefinementEngine dispatcher refs ===
=== SpeedFeedOrchestratorEngine dispatcher refs ===
H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts
=== done ===

### User | 2026-06-11T19:32:13.353Z

[tool_result] === how consumers use it (grep usage lines) ===
H:/prism/mcp-server/src/engines/SFCParameterRefinementEngine.ts:10: *   SFCOutcomeCaptureWireEngine ──emits──► OutcomeCaptureBus
H:/prism/mcp-server/src/engines/SFCParameterRefinementEngine.ts:24: *      populated by SFCOutcomeCaptureWireEngine.
H:/prism/mcp-server/src/engines/SFCParameterRefinementEngine.ts:55: *   - SFCOutcomeCaptureWireEngine: emi
... [+752 chars truncated]

### Assistant | 2026-06-11T19:32:21.207Z

Let me verify exactly how `SpeedFeedOrchestratorEngine` (the dispatcher-wired consumer) actually invokes this engine's runtime method, since the grep hits in `SFCParameterRefinementEngine` are only doc-comment references. I need to confirm a real runtime call to `recordEmission` or the singleton.

### Assistant | 2026-06-11T19:32:23.710Z

[tool_use: Bash]

### User | 2026-06-11T19:33:53.571Z

[tool_result] === SpeedFeedOrchestratorEngine: runtime usage of the wire engine ===
3509:          sink: "SpeedFeedDeepLearningEngine.recordFeedback → SFCOutcomeCaptureWireEngine (U-SFPSN-09)",

=== SFCParameterRefinementEngine: any runtime import/call (not doc) ===
=== done ===

### Assistant | 2026-06-11T19:33:58.419Z

Both consumer references are doc-comment / metadata only — no runtime import or `recordEmission()` call. The grep for `import.*SFCOutcomeCaptureWireEngine` and `.recordEmission` in `SFCParameterRefinementEngine` returned nothing, and the orchestrator's single hit (line 3509) is a string literal describing a data-flow `sink`, not a call. The engine's own doc (lines 37-42) claims it's "Wired by U-PPG-SFC-01 to" five SFC engines, but let me verify whether those production wirings actually exist at runtime — that's the load-bearing question for reachability.

### Assistant | 2026-06-11T19:34:05.045Z

[tool_use: Bash]

### User | 2026-06-11T19:34:57.592Z

[tool_result] === ALL runtime importers of the singleton across src/ ===
H:/prism/mcp-server/src/middleware/sfcOutcomeWire.ts:25:} from "../engines/SFCOutcomeCaptureWireEngine.js";
H:/prism/mcp-server/src/__tests__/engines/sfcOutcomeCaptureWireEngine.test.ts:27:} from "../../engines/SFCOutcomeCaptureWireEngine.js";
--- end imports ---

=== Any .recordEmission( call anywhere in src/ (runtime use) ===
H:/prism/mc
... [+3171 chars truncated]

### Assistant | 2026-06-11T19:35:01.205Z

Key finding: there's a real runtime consumer — `H:/prism/mcp-server/src/middleware/sfcOutcomeWire.ts:34` calls `sfcOutcomeCaptureWireEngine.recordEmission(input)`. Let me read that middleware to understand the production path and confirm whether it routes through any dispatcher-wired surface. This is the load-bearing question for WIRE_EXEMPT vs orphan.

### Assistant | 2026-06-11T19:35:02.161Z

[tool_use: Read]

### Assistant | 2026-06-11T19:35:03.556Z

[tool_use: Bash]

### User | 2026-06-11T19:35:07.555Z

[tool_result] 1	/**
2	 * sfcOutcomeWire — U-PPG-SFC-01 inline helpers
3	 * =============================================
4	 *
5	 * Tiny wrappers around `sfcOutcomeCaptureWireEngine.recordEmission` so each
6	 * SFC engine adds 1–2 lines instead of inlining the full payload. Errors
7	 * inside the wire are swallowed — speed/feed recommendations must never
8	 * fail because telemetry failed.
9	 *
10	 * Used by:
11
... [+1588 chars truncated]

### User | 2026-06-11T19:35:38.574Z

[tool_result] === who imports/uses the sfcOutcomeWire middleware? ===
H:/prism/mcp-server/src/engines/AutoSpeedFeedCalculatorEngine.ts:24:import { captureSFC } from "../middleware/sfcOutcomeWire.js";
H:/prism/mcp-server/src/engines/LatheSpeedFeedCalculatorFacadeEngine.ts:35:import { captureSFC } from "../middleware/sfcOutcomeWire.js";
H:/prism/mcp-server/src/engines/MachineAwareSpeedFeedEngine.ts:26:import { ca
... [+1781 chars truncated]

### Assistant | 2026-06-11T19:35:44.634Z

The picture is now complete and conclusive. The claimed production wirings are real: `UltimateSpeedFeedEngine.ts:32`, `AutoSpeedFeedCalculatorEngine.ts:24`, `LatheSpeedFeedCalculatorFacadeEngine.ts:35`, `MachineAwareSpeedFeedEngine.ts:26`, and `SFCCalculateEngine.ts:14` all import `captureSFC` from the `sfcOutcomeWire` middleware, which calls `sfcOutcomeCaptureWireEngine.recordEmission(input)` at `middleware/sfcOutcomeWire.ts:34`.

Let me confirm at least one of those five SFC engines is itself dispatcher-wired (which makes this engine reachable through a real dispatcher round-trip), and verify there's no `speedfeed_*_wire` style stats action precedent I'm missing.

### Assistant | 2026-06-11T19:35:46.450Z

[tool_use: Bash]

### User | 2026-06-11T19:36:05.147Z

[tool_result] === Are the SFC caller engines dispatcher-wired? ===
UltimateSpeedFeedEngine -> 2 dispatcher file(s)
AutoSpeedFeedCalculatorEngine -> 2 dispatcher file(s)
SFCCalculateEngine -> 1 dispatcher file(s)
MachineAwareSpeedFeedEngine -> 1 dispatcher file(s)
LatheSpeedFeedCalculatorFacadeEngine -> 1 dispatcher file(s)
--- end ---

### Assistant | 2026-06-11T19:36:21.699Z

Conclusive. This is a textbook WIRE_EXEMPT case, and the engine even self-documents it.

Findings:
- The engine is **real, not a stub**: `recordEmission()` does genuine work (canonical-field summarization in `summarizeSFCRecommendation`, JSON-safe cycle/BigInt stripping via `jsonSafe`/`cloneSafe`, delegation to `outcomeCaptureBusEngine.record`). No `Math.random`, no not-implemented throws, no placeholder returns.
- It is **explicitly tagged** `// WIRE-EXEMPT:` (line 1) and `@WIRE-EXEMPT` (lines 6-7) as a middleware/instrumentation engine not intended for dispatcher exposure.
- It is **reachable** through dispatcher-wired parents. The runtime path: five SFC engines `import { captureSFC }` from `middleware/sfcOutcomeWire.ts` (`UltimateSpeedFeedEngine.ts:32`, `AutoSpeedFeedCalculatorEngine.ts:24`, `LatheSpeedFeedCalculatorFacadeEngine.ts:35`, `MachineAwareSpeedFeedEngine.ts:26`, `SFCCalculateEngine.ts:14`) → `captureSFC` calls `sfcOutcomeCaptureWireEngine.recordEmission(input)` at `middleware/sfcOutcomeWire.ts:34`. Those five caller engines are **all dispatcher-wired** (UltimateSpeedFeed=2 dispatchers, AutoSpeedFeed=2, SFCCalculate/MachineAware/LatheFacade=1 each — in `calcDispatcher.ts` / `camDispatcher.ts`). Every dispatched speed/feed calculation fires this engine as a side-effect.
- The two "engine consumers" the prompt counted (`SFCParameterRefinementEngine`, `SpeedFeedOrchestratorEngine`) reference it only in **doc comments / a string-literal `sink:` label** (`SpeedFeedOrchestratorEngine.ts:3509`), not runtime calls — but reachability is already established via the middleware path above, so that doesn't change the verdict.
- **Not superseded**: no archive sibling, no deprecated/superseded markers. There is a sibling `PpgOutcomeCaptureWireEngine` (separate PPG domain, U-PPG-SFC-02), which complements rather than replaces it.
- **R12**: this engine is pure DATA/deterministic (field extraction + JSON sanitization + append to an event bus). No NN/ML inference. R12-sa
... [+392 chars truncated]

### Assistant | 2026-06-11T19:36:35.763Z

[tool_use: StructuredOutput]

### User | 2026-06-11T19:36:39.110Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-11T19:36:44.906Z

Assessment complete. **WIRE_EXEMPT_INTERNAL** — no wiring needed.

The engine is real and valuable but is correctly self-tagged `// WIRE-EXEMPT:` and is already reachable at runtime: `middleware/sfcOutcomeWire.ts:34` calls `sfcOutcomeCaptureWireEngine.recordEmission()`, and that `captureSFC` wrapper is imported by five SFC engines (`UltimateSpeedFeedEngine.ts:32`, `AutoSpeedFeedCalculatorEngine.ts:24`, `SFCCalculateEngine.ts:14`, `MachineAwareSpeedFeedEngine.ts:26`, `LatheSpeedFeedCalculatorFacadeEngine.ts:35`) — all of which are dispatcher-wired via `calcDispatcher.ts`/`camDispatcher.ts`. So every dispatched speed/feed calculation already fires this engine as a side-effect. It's deterministic (R12-safe, no NN inference), not superseded, and exposes only a write-only `recordEmission` with no operator-useful query surface — so a dispatcher action would be redundant. No actions proposed.

---
type: "chat-session"
source: "claude-code-cli"
session_id: "3ddf0577-364b-4462-8405-7577878d7264"
title: "Per-file scrutiny review (PRISM PER-FILE SCRUTINY GATE, arm A — content speciali"
date: "2026-05-18"
first_ts: "2026-05-18T01:14:00.350Z"
last_ts: "2026-05-18T01:15:58.686Z"
cwd: "H:\\prism\\mcp-server"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/3ddf0577-364b-4462-8405-7577878d7264/subagents/agent-af1249e81fdab5df3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Per-file scrutiny review (PRISM PER-FILE SCRUTINY GATE, arm A — content speciali

> **claude-code-cli** | 2026-05-18 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/3ddf0577-364b-4462-8405-7577878d7264/subagents/agent-af1249e81fdab5df3.jsonl`

## Transcript

### User | 2026-05-18T01:14:00.350Z

Per-file scrutiny review (PRISM PER-FILE SCRUTINY GATE, arm A — content specialist).

Files to review END-TO-END (read both fully):
1. H:\prism\mcp-server\src\engines\CadCamHandoffEngine.ts
2. H:\prism\mcp-server\src\__tests__\CadCamHandoffEngine.test.ts

Unit: U-BRIDGE-CAD-CAM-HANDOFF (FEATURE-GAP-AUDIT-MS0). Intent: a deep-integration bridge that takes an autonomously-generated CAD-gen feature list (FeatureSpec[] = {type, params}) + target_cam + material + cad_confidence, synthesizes a CAM part_hint per feature, delegates strategy ranking to the EXISTING production `camStrategyRecommenderEngine` (mcp-server/src/engines/CAMStrategyRecommenderEngine.ts — recommend({target_cam, part_hint?, material?, max_alternatives?}) → StrategyRecResult), sequences operations rough→finish→drill→other, and wraps the plan in an UNCONDITIONAL operator gate (PRISM invariant: operator-in-the-loop is unconditional; the bridge must NEVER auto-execute CAM).

Verify rigorously and flag P0/P1 issues, then grade PASS or FAIL:
- Correctness of the orchestration: does it actually call the real recommender per feature and aggregate correctly? Is the phase-ordering sort stable/correct?
- The load-bearing safety invariant: is requires_operator_approval ALWAYS true and auto_executed ALWAYS false on EVERY code path including both refusal paths? Any path that could violate it = P0.
- Refusal-path correctness (empty features; cad_confidence < min_cad_confidence) — are they returned before any handoff work, with operations:[] and blocked:true?
- handoff_confidence math: clamp01(cad_confidence × mean(positive feature scores)) — correct? Division-by-zero guarded?
- Adversarial robustness: NaN/Infinity params, injection-y feature type strings reaching part_hint, runaway feature count (MAX_HANDOFF_FEATURES cap), empty/whitespace type. Does the sanitization actually hold?
- Engine conventions (H:\.claude\rules\engines.md): static-method class, Zod input schema, typed result object never raw primitive, JSDo
... [+565 chars truncated]

### Assistant | 2026-05-18T01:14:07.928Z

I'll review both files end-to-end against the unit spec and engine conventions.

### Assistant | 2026-05-18T01:14:08.260Z

[tool_use: Read]

### Assistant | 2026-05-18T01:14:08.588Z

[tool_use: Read]

### User | 2026-05-18T01:14:11.481Z

[tool_result] 1	/**
2	 * CadCamHandoffEngine — autonomous CAD-AI → CAM-AI handoff bridge
3	 * =============================================================================
4	 *
5	 * Deep-integration bridge (U-BRIDGE-CAD-CAM-HANDOFF, FEATURE-GAP-AUDIT-MS0 /
6	 * ROADMAP-CONSOLIDATED DEEP_INTEGRATION_BRIDGES). Autonomously-generated CAD
7	 * geometry (NeuralCADGenerationEngine / TextToCADGenerationEngine /
8	 * B
... [+12461 chars truncated]

### User | 2026-05-18T01:14:11.937Z

[tool_result] 1	/**
2	 * CadCamHandoffEngine — CAD-AI → CAM-AI handoff bridge tests.
3	 *
4	 * U-BRIDGE-CAD-CAM-HANDOFF (FEATURE-GAP-AUDIT-MS0, slot delta).
5	 *
6	 * Real-value assertions against the production CAMStrategyRecommenderEngine
7	 * corpus (CAM-EXHAUST-MS0). No mocking — the bridge delegates to the real
8	 * recommender, so these tests exercise the genuine end-to-end contract.
9	 *
10	 * Invariants
... [+11415 chars truncated]

### Assistant | 2026-05-18T01:14:21.109Z

Now I'll verify the dependency contract — the real recommender's API shape — since the orchestration's correctness depends on it.

### Assistant | 2026-05-18T01:14:21.758Z

[tool_use: Read]

### User | 2026-05-18T01:14:23.042Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CAMStrategyRecommenderEngine.ts' was already read 11m ago in this session and is unchanged (mtime 1778079514793). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-05-18T01:14:26.802Z

The dependency file was already read earlier in this session. Let me extract the exact contract signature to verify the orchestration.

### Assistant | 2026-05-18T01:14:28.606Z

[tool_use: Grep]

### User | 2026-05-18T01:14:30.717Z

[tool_result] 18: * rationale; empty hint returns the highest-prior cross-CAM default.
19- *
20- * Lifted from CAMPhase5Stubs.ts under U-CAM73 to satisfy U-CAM79's deliverable
21- * that every CAM-function engine ship as its own file with a 1:1 test surface.
--
39:  /** Cap returned alternatives. Defaults to 5. */
40:  max_alternatives?: number;
41-}
42-
43:export interface StrategyCandidate {
44-  strategy: st
... [+5322 chars truncated]

### Assistant | 2026-05-18T01:14:35.224Z

Now let me verify how `camStrategyRecommenderEngine` is exported (it's a singleton instance, used as `camStrategyRecommenderEngine.recommend(...)`), and confirm the `recommend` method is an instance method (line 262 shows `recommend(req)` without `static`).

### Assistant | 2026-05-18T01:14:37.116Z

[tool_use: Grep]

### User | 2026-05-18T01:14:43.496Z

[tool_result] 31:import { isCAMSlug } from "../registries/CAMSystemRegistry.js";
32-
33-export interface StrategyRecRequest {
--
56:  recommended_strategy: string | null;
57:  recommended_score: number;
58-  rationale: string;
59-  alternatives: StrategyCandidate[];
--
256:export class CAMStrategyRecommenderEngine {
257-  constructor(
258-    private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine,
--
2
... [+392 chars truncated]

### Assistant | 2026-05-18T01:15:58.686Z

I now have the full contract verified. The dependency contract is confirmed:

- `camStrategyRecommenderEngine` is a singleton instance (line 355), `.recommend()` is an instance method (line 262) — the bridge calls it correctly at CadCamHandoffEngine.ts:254.
- `StrategyRecResult` has `recommended_strategy: string|null`, `recommended_score: number`, `rationale: string`, `alternatives: StrategyCandidate[]` — all consumed correctly at lines 264-268.
- `recommend()` never throws on bad input: unknown CAM slug returns `recommended_strategy:null, recommended_score:0` (lines 281-284); no-match returns the same (lines 321-326). So the bridge's no-mock test claims hold.

Here are my findings.

---

## Findings

### P1-1 — `clamp01` is double-fed for `cad_confidence`, but the schema allows out-of-range `cad_confidence` while the engine clamps it — silent acceptance of invalid input (engines.md: "Use Zod schemas for input validation")

`CadCamHandoffInputSchema` (CadCamHandoffEngine.ts:111) declares `cad_confidence: z.number().optional()` with **no `.min(0).max(1)`**, unlike `min_cad_confidence` which *is* bounded `.min(0).max(1)` (line 114). The engine then silently `clamp01`s it (line 177-179). A caller passing `cad_confidence: 5` or `-3` or `NaN` is silently coerced rather than rejected at the validation boundary. This is an inconsistency with the sibling field and a spec deviation — the spec describes `cad_confidence` as `[0,1]` (line 48 JSDoc says "CAD-gen confidence [0,1]"). Either bound it in the schema like `min_cad_confidence`, or document the clamp as intentional defense-in-depth. The clamp itself is correct defense; the schema gap is the P1. Not a P0 because `clamp01` makes it safe, just not validated-loud.

### P1-2 — `min_cad_confidence` is read from `input` BEFORE `clamp01`/range enforcement; the engine path does not re-validate it

CadCamHandoffEngine.ts:180-181: `const minConf = input.min_cad_confidence ?? DEFAULT_MIN_CAD_CONFIDENCE;`. The Zod schema bounds it t
... [+11253 chars truncated]

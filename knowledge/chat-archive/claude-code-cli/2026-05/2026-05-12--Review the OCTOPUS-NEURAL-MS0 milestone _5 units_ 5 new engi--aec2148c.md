---
type: "chat-session"
source: "claude-code-cli"
session_id: "aec2148c-c55a-49c5-a648-da9d4a0da0c0"
title: "Review the OCTOPUS-NEURAL-MS0 milestone (5 units, 5 new engines, 75 vitest cases"
date: "2026-05-12"
first_ts: "2026-05-12T19:17:08.342Z"
last_ts: "2026-05-12T19:21:18.305Z"
cwd: "H:\\prism"
messages: 71
user_msgs: 30
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/aec2148c-c55a-49c5-a648-da9d4a0da0c0/subagents/agent-af4963b04dd6a37fc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Review the OCTOPUS-NEURAL-MS0 milestone (5 units, 5 new engines, 75 vitest cases

> **claude-code-cli** | 2026-05-12 | 71 msgs (30 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/aec2148c-c55a-49c5-a648-da9d4a0da0c0/subagents/agent-af4963b04dd6a37fc.jsonl`

## Transcript

### User | 2026-05-12T19:17:08.342Z

Review the OCTOPUS-NEURAL-MS0 milestone (5 units, 5 new engines, 75 vitest cases) in the worktree at `H:/prism-octopus-neural-ms0`. The work is on branch `work/octopus-neural-ms0-v2`, 5 commits ahead of `cad-fusion-live-ms0`. Files to review (all in `H:/prism-octopus-neural-ms0/`):

ENGINES (5 new + 1 enhanced):
- mcp-server/src/engines/MoonshotClientEngine.ts (enhanced: added stream + retry/backoff to existing 170-LOC engine — U-OCN01)
- mcp-server/src/engines/MoaLayer2Engine.ts (NEW — U-OCN02, MoA-Layer-2 aggregator over N proposer outputs)
- mcp-server/src/engines/NeuralRoutingEngine.ts (NEW — U-OCN03, k-NN over scrutiny ledger; cold-start hardcoded rules)
- mcp-server/src/engines/CascadeCalibrationEngine.ts (NEW — U-OCN04, FrugalGPT-style cost-quality probe calibration)
- mcp-server/src/engines/ConsensusQuorumEngine.ts (NEW — U-OCN05, pure-function diff classifier → dynamic N-of-M)

TESTS (5 new files, 75 it() cases):
- mcp-server/src/__tests__/MoonshotClientEngine.test.ts (14 cases)
- mcp-server/src/__tests__/MoaLayer2Engine.test.ts (17 cases)
- mcp-server/src/__tests__/NeuralRoutingEngine.test.ts (15 cases)
- mcp-server/src/__tests__/CascadeCalibrationEngine.test.ts (13 cases)
- mcp-server/src/__tests__/ConsensusQuorumEngine.test.ts (16 cases)

DISPATCHER WIRING:
- mcp-server/src/schemas/aiReasoningActionSchemas.ts (added 4 actions: moonshot_invoke, moa_aggregate, neural_route_decision, cascade_calibrate)
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts (added 4 case blocks for the above)
- mcp-server/src/schemas/safetyActionSchemas.ts (added quorum_required schema)
- mcp-server/src/tools/dispatchers/safetyDispatcher.ts (added QUORUM_ACTIONS Set + handler branch)

CONTEXT: PRISM is a CNC manufacturing intelligence MCP server. The 5 OCN engines are back-end infra for multi-LLM coordination (NOT physics — but ConsensusQuorumEngine's safety-critical classification IS load-bearing for the scrutiny gate that guards physics edits).

Reviewer mandate — ind
... [+1504 chars truncated]

### Assistant | 2026-05-12T19:17:14.704Z

I'll perform an independent second-pass review of the OCTOPUS-NEURAL-MS0 milestone. Let me systematically examine each file.

### Assistant | 2026-05-12T19:17:15.486Z

[tool_use: Bash]

### Assistant | 2026-05-12T19:17:17.341Z

[tool_use: Bash]

### User | 2026-05-12T19:17:21.735Z

[tool_result] 4d0f6881b [OCTOPUS-NEURAL-MS0]/U-OCN05: ConsensusQuorumEngine — dynamic N-of-M from diff classification (milestone 5/5)
7495e794d [OCTOPUS-NEURAL-MS0]/U-OCN04: CascadeCalibrationEngine — probe-based cost-quality frontier
9f4eba57c [OCTOPUS-NEURAL-MS0]/U-OCN03: NeuralRoutingEngine — k-NN router over scrutiny ledger
23818d22e [OCTOPUS-NEURAL-MS0]/U-OCN02: MoaLayer2Engine — distill N proposer verdict
... [+116 chars truncated]

### User | 2026-05-12T19:17:28.085Z

[tool_result] H:/prism-octopus-neural-ms0/mcp-server/src/engines/CascadeCalibrationEngine.ts
H:/prism-octopus-neural-ms0/mcp-server/src/engines/ConsensusQuorumEngine.ts
H:/prism-octopus-neural-ms0/mcp-server/src/engines/MoaLayer2Engine.ts
H:/prism-octopus-neural-ms0/mcp-server/src/engines/MoonshotClientEngine.ts
H:/prism-octopus-neural-ms0/mcp-server/src/engines/NeuralRoutingEngine.ts

### Assistant | 2026-05-12T19:17:30.578Z

Acknowledged. I'll route through prism_session dispatchers where appropriate and continue the review using direct file reads.

### Assistant | 2026-05-12T19:17:30.946Z

[tool_use: Read]

### Assistant | 2026-05-12T19:17:31.443Z

[tool_use: Read]

### User | 2026-05-12T19:17:36.360Z

[tool_result] 1	/**
2	 * MoonshotClientEngine — HTTP client for Moonshot AI's Kimi API.
3	 *
4	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS / MOONSHOT.
5	 *
6	 * Wraps the OpenAI-compatible /v1/chat/completions endpoint at api.moonshot.ai.
7	 * Default model: kimi-k2 (1T-param MoE, 32B activated, ~Sept 2025).
8	 *
9	 * Why this exists: Kimi-K2 is a ~1T-param MoE model — physically too large to
10
... [+16000 chars truncated]

### User | 2026-05-12T19:17:38.399Z

[tool_result] 1	/**
2	 * MoaLayer2Engine — Mixture-of-Agents Layer-2 aggregator over N proposer outputs.
3	 *
4	 * Milestone: OCTOPUS-NEURAL-MS0 / U-OCN02.
5	 *
6	 * Reference: Wang et al. "Mixture-of-Agents Enhances Large Language Model
7	 * Capabilities" (2406.04692). MoA-Layer-2 takes a set of "proposer" outputs
8	 * (independent answers from heterogeneous models) and distills them via a
9	 * "senior aggrega
... [+16518 chars truncated]

### Assistant | 2026-05-12T19:17:42.367Z

[tool_use: Read]

### Assistant | 2026-05-12T19:17:42.879Z

[tool_use: Read]

### User | 2026-05-12T19:17:46.909Z

[tool_result] 1	/**
2	 * NeuralRoutingEngine — Learned routing decisions over the scrutiny ledger.
3	 *
4	 * Milestone: OCTOPUS-NEURAL-MS0 / U-OCN03.
5	 *
6	 * Reference: Feng et al. "GraphRouter: A Graph-based Router for LLM Selections"
7	 * (2410.03834). Replaces hardcoded if/else routing chains ("if engine-edit then
8	 * 3-of-3, else…") with a learned topology over historical scrutiny outcomes.
9	 *
10	 * De
... [+17571 chars truncated]

### User | 2026-05-12T19:17:48.045Z

[tool_result] 1	/**
2	 * CascadeCalibrationEngine — Probe-based cost-quality frontier calibration.
3	 *
4	 * Milestone: OCTOPUS-NEURAL-MS0 / U-OCN04.
5	 *
6	 * References:
7	 *   - FrugalGPT (Chen 2305.05176): cascading LLM calls from cheap → strong with
8	 *     deferral thresholds cuts inference cost ~98% on benchmarks vs always-strong.
9	 *   - GATEKEEPER (2502.19335): probe-based deferral with calibration l
... [+12046 chars truncated]

### Assistant | 2026-05-12T19:17:54.816Z

[tool_use: Read]

### User | 2026-05-12T19:17:59.729Z

[tool_result] 1	/**
2	 * ConsensusQuorumEngine — Dynamic N-of-M quorum from change classification.
3	 *
4	 * Milestone: OCTOPUS-NEURAL-MS0 / U-OCN05.
5	 *
6	 * Job: classify a diff (file paths + commit subject + optional patch content)
7	 * into one of six categories and emit the right scrutiny quorum.
8	 *
9	 *   safety-critical → 5-of-5 (all 5 tentacles, no exceptions)
10	 *   major           → 3-of-3 (the ex
... [+13448 chars truncated]

### Assistant | 2026-05-12T19:18:02.447Z

Now let me check the test files.

### Assistant | 2026-05-12T19:18:03.227Z

[tool_use: Read]

### Assistant | 2026-05-12T19:18:03.852Z

[tool_use: Read]

### User | 2026-05-12T19:18:13.802Z

[tool_result] 1	/**
2	 * MoonshotClientEngine — U-OCN01 test suite (OCTOPUS-NEURAL-MS0).
3	 *
4	 * Mocks `global.fetch` to exercise the 7 cases the atomized spec calls out:
5	 *   1. happy path        — 200 + valid OpenAI-shape JSON → answer surfaces, tokens populated
6	 *   2. 401 unauthorized  — fatal, no retry, error message contains the 401 text
7	 *   3. 429 rate-limited  — retryable; 1st 429 then 200 → ok
... [+16174 chars truncated]

### User | 2026-05-12T19:18:16.114Z

[tool_result] 1	/**
2	 * MoaLayer2Engine — U-OCN02 test suite (OCTOPUS-NEURAL-MS0).
3	 *
4	 * Mixture-of-Agents Layer-2 aggregator. Tests the 6 cases the atomized spec
5	 * calls out plus invariants for the Self-MoA dilution flag and collusion check.
6	 *
7	 *   1. happy           — 3 proposers all PASS → verdict=pass, dissent=[], majority_vote
8	 *   2. single proposer — degenerate: only 1 live proposer → verd
... [+14852 chars truncated]

### Assistant | 2026-05-12T19:18:21.182Z

I'll continue the review without creating new tasks (the existing closeout task #13 already covers this work).

### Assistant | 2026-05-12T19:18:21.966Z

[tool_use: Read]

### Assistant | 2026-05-12T19:18:22.212Z

[tool_use: Read]

### User | 2026-05-12T19:18:27.145Z

[tool_result] 1	/**
2	 * NeuralRoutingEngine — U-OCN03 test suite (OCTOPUS-NEURAL-MS0).
3	 *
4	 * Covers:
5	 *   1. cold_start (empty ledger)               — engine-edit → 3-of-3 hardcoded
6	 *   2. cold_start (< 50 entries)               — safety-critical → 5-of-5
7	 *   3. cold_start: test-only                    — 1-of-1 (claude-a) hardcoded
8	 *   4. cold_start: docs-only                    — 1-of-1 hardcod
... [+13969 chars truncated]

### User | 2026-05-12T19:18:27.824Z

[tool_result] 1	/**
2	 * CascadeCalibrationEngine — U-OCN04 test suite (OCTOPUS-NEURAL-MS0).
3	 *
4	 * Covers the 5 cases the atomized spec calls out plus extras:
5	 *   1. happy: 3 tiers × 5 probes pass → frontier sorted by cost, thresholds populated
6	 *   2. all-tiers-fail: every probe scores 0 → alarm, no cheapestQualifying, fallback still set
7	 *   3. oversized probe set: 100 probes but maxProbesPerTier=1
... [+13874 chars truncated]

### Assistant | 2026-05-12T19:18:31.057Z

[tool_use: Read]

### User | 2026-05-12T19:18:34.601Z

[tool_result] 1	/**
2	 * ConsensusQuorumEngine — U-OCN05 test suite (OCTOPUS-NEURAL-MS0).
3	 *
4	 * Covers the 6 cases the atomized spec calls out plus the two adversarial
5	 * scenarios (mislabeled safety-critical, oversized 1000-file diff).
6	 *
7	 *   1. minor: 1 small config file → 2-of-3
8	 *   2. major: src/engines/Foo.ts + dispatcher edit → 3-of-3
9	 *   3. safety-critical: physics/constants.ts touched →
... [+11633 chars truncated]

### Assistant | 2026-05-12T19:18:38.706Z

Now let me check the dispatcher wiring.

### Assistant | 2026-05-12T19:18:40.503Z

[tool_use: Bash]

### Assistant | 2026-05-12T19:18:41.790Z

[tool_use: Bash]

### User | 2026-05-12T19:18:44.750Z

[tool_result] H:/prism-octopus-neural-ms0/mcp-server/src/schemas/aiReasoningActionSchemas.ts:447:  "moonshot_invoke",                // MoonshotClientEngine.exec
H:/prism-octopus-neural-ms0/mcp-server/src/schemas/aiReasoningActionSchemas.ts:449:  "moa_aggregate",                  // MoaLayer2Engine.aggregate
H:/prism-octopus-neural-ms0/mcp-server/src/schemas/aiReasoningActionSchemas.ts:451:  "neural_route_decis
... [+2133 chars truncated]

### User | 2026-05-12T19:18:46.766Z

[tool_result] H:/prism-octopus-neural-ms0/mcp-server/src/schemas/safetyActionSchemas.ts:678:  quorum_required: z.object({
H:/prism-octopus-neural-ms0/mcp-server/src/schemas/safetyActionSchemas.ts:686:  }).passthrough().describe("Classify a diff and return the recommended scrutiny quorum (1-of-1 to 5-of-5) — engine: ConsensusQuorumEngine"),
H:/prism-octopus-neural-ms0/mcp-server/src/tools/dispatchers/safetyDispa
... [+488 chars truncated]

### Assistant | 2026-05-12T19:18:50.371Z

[tool_use: Read]

### Assistant | 2026-05-12T19:18:50.905Z

[tool_use: Read]

### User | 2026-05-12T19:18:56.368Z

[tool_result] 2130	        const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
2131	        result = memoryPressureMonitorEngine.trend();
2132	        break;
2133	      }
2134	
2135	      // ─────────────────────────────────────────────────────────────────────
2136	      // OCTOPUS-NEURAL-MS0/U-OCN01: moonshot_invoke — mid-tier Kimi-K2 tentacle
2137	      // ───
... [+4988 chars truncated]

### User | 2026-05-12T19:18:57.345Z

[tool_result] 2050	  // OCTOPUS-NEURAL-MS0/U-OCN04: probe-based cost-quality calibration
2051	  // NOTE: This action's true input shape has function-typed fields (tier.invoke,
2052	  // probe.score) which can't cross the MCP/JSON boundary. The dispatcher path
2053	  // is reserved for in-process callers (CLI scripts that already hold the
2054	  // engine singleton); over MCP, the schema accepts a pre-calibrated
... [+3592 chars truncated]

### Assistant | 2026-05-12T19:19:01.003Z

[tool_use: Read]

### Assistant | 2026-05-12T19:19:01.650Z

[tool_use: Read]

### User | 2026-05-12T19:19:07.397Z

[tool_result] 670	  validate_workholding_setup,
671	  check_pullout_resistance,
672	  analyze_liftoff_moment,
673	  calculate_part_deflection,
674	  validate_vacuum_fixture,
675	  // Workholding Intelligence (1)
676	  recommend_workholding,
677	  // OCTOPUS-NEURAL-MS0/U-OCN05: dynamic N-of-M quorum from diff classification
678	  quorum_required: z.object({
679	    files: z.array(z.object({
680	      path: z.str
... [+531 chars truncated]

### User | 2026-05-12T19:19:07.784Z

[tool_result] 75	  "analyze_liftoff_moment", "calculate_part_deflection", "validate_vacuum_fixture"
76	]);
77	// WorkholdingIntelligenceEngine — fixture recommendation + deflection/slip/safety analysis (R7-MS2)
78	const WORKHOLDING_INTELLIGENCE_ACTIONS = new Set(["recommend_workholding"]);
79	// OCTOPUS-NEURAL-MS0/U-OCN05: dynamic N-of-M quorum from diff classification
80	const QUORUM_ACTIONS = new Set(["quorum
... [+5812 chars truncated]

### Assistant | 2026-05-12T19:19:11.043Z

Now let me check for inlined physics constants and banned test patterns.

### Assistant | 2026-05-12T19:19:13.723Z

[tool_use: Bash]

### Assistant | 2026-05-12T19:19:16.198Z

[tool_use: Bash]

### Assistant | 2026-05-12T19:19:17.721Z

[tool_use: Bash]

### User | 2026-05-12T19:19:19.023Z

[tool_result] (Bash completed with no output)

### User | 2026-05-12T19:19:25.004Z

[tool_result] H:/prism-octopus-neural-ms0/mcp-server/src/__tests__/NeuralRoutingEngine.test.ts:295:    expect(data.recommendedTentacles.length).toBeGreaterThan(0);
H:/prism-octopus-neural-ms0/mcp-server/src/__tests__/CascadeCalibrationEngine.test.ts:244:    expect(r.frontier[0].scoreVariance).toBeGreaterThan(0);
H:/prism-octopus-neural-ms0/mcp-server/src/__tests__/ConsensusQuorumEngine.test.ts:218:    expect(d.
... [+35 chars truncated]

### User | 2026-05-12T19:19:25.215Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-12T19:19:28.276Z

Let me check the context of these `toBeGreaterThan(0)` assertions more carefully.

### Assistant | 2026-05-12T19:19:29.790Z

[tool_use: Read]

### Assistant | 2026-05-12T19:19:30.275Z

[tool_use: Read]

### Assistant | 2026-05-12T19:19:32.661Z

[tool_use: Read]

### User | 2026-05-12T19:19:34.986Z

[tool_result] 281	describe("prism_ai:neural_route_decision — dispatcher round-trip (U-OCN03 wiring)", () => {
282	  it("dispatches through executeAIReasoningAction → success:true with routing decision", async () => {
283	    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
284	    const out = await executeAIReasoningAction("neural_route_decision" as never, {
28
... [+559 chars truncated]

### User | 2026-05-12T19:19:36.543Z

[tool_result] 229	  it("variance: tier scoring [0,1,0,1] reports nonzero variance", async () => {
230	    const eng = new CascadeCalibrationEngine();
231	    // Alternating right/wrong probes.
232	    const probes: Probe[] = [
233	      exactProbe("p1", "q1", "right"),
234	      exactProbe("p2", "q2", "right"),
235	      exactProbe("p3", "q3", "right"),
236	      exactProbe("p4", "q4", "right"),
237	    ];
238	
... [+410 chars truncated]

### User | 2026-05-12T19:19:39.739Z

[tool_result] 212	  // 15. rationale + signals are non-empty
213	  it("rationale: always populated; signals[] documents the classification trail", () => {
214	    const eng = new ConsensusQuorumEngine();
215	    const d = eng.classify({ files: [f("mcp-server/src/physics/constants.ts")] });
216	    expect(d.rationale).toContain("Classification:");
217	    expect(d.rationale).toContain("safety-critical");
218	   
... [+68 chars truncated]

### Assistant | 2026-05-12T19:19:45.450Z

These three `toBeGreaterThan(0)` assertions are paired with concrete checks (`.toBe("cold_start")`, `.toBeCloseTo(0.5, 5)`, `.toContain("Classification:")`) — they are not load-bearing fake assertions. Fine.

Let me now check the build state and verify the engines/tests actually run.

### Assistant | 2026-05-12T19:19:47.369Z

[tool_use: Bash]

### User | 2026-05-12T19:19:52.536Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
npm error Missing script: "vitest"
npm error
npm error Did you mean this?
npm error   npm test # Test a package
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error A complete log of this run can be found in: C:\Users\Mark Villanueva\AppData\Local\npm-cache\_logs\2026-05-12T19_19_50_609Z-debug-0
... [+4 chars truncated]

### Assistant | 2026-05-12T19:19:57.844Z

Acknowledged. The existing task #13 covers this review; no new tasks needed. Let me retry the test runner with the correct path (vitest is in mcp-server's node_modules).

### Assistant | 2026-05-12T19:19:59.562Z

[tool_use: Bash]

### User | 2026-05-12T19:20:03.020Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
npm error Missing script: "vitest"
npm error
npm error Did you mean this?
npm error   npm test # Test a package
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error A complete log of this run can be found in: C:\Users\Mark Villanueva\AppData\Local\npm-cache\_logs\2026-05-12T19_20_01_167Z-debug-0
... [+4 chars truncated]

### Assistant | 2026-05-12T19:20:05.961Z

The shell appears to alias `npx vitest` to `npm vitest`. Let me try a different invocation approach.

### Assistant | 2026-05-12T19:20:07.559Z

[tool_use: Bash]

### User | 2026-05-12T19:20:12.239Z

[tool_result]  DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework

⎯⎯⎯⎯⎯⎯⎯ Startup Error ⎯⎯⎯⎯⎯⎯⎯⎯
Error: Failed to load custom Reporter from basic
    at loadCustomReporterModule (file:///H:/prism/mcp-server/node_modules/vitest/dist/chunks/cli-api.Cjt90eJu.js:11346:9)
 
... [+3029 chars truncated]

### Assistant | 2026-05-12T19:20:15.564Z

[tool_use: Bash]

### User | 2026-05-12T19:20:21.941Z

[tool_result]  DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework

 RUN  v4.1.5 H:/prism-octopus-neural-ms0/mcp-server

 ✓ src/__tests__/ConsensusQuorumEngine.test.ts (16 tests) 430ms
     ✓ dispatches through prism_safety dispatcher → returns quorum decision  411ms

 T
... [+164 chars truncated]

### Assistant | 2026-05-12T19:20:26.185Z

Acknowledged the budget warning. I have enough information to render a verdict. Running the other 4 test files in parallel as a single batched call to stay efficient.

### Assistant | 2026-05-12T19:20:27.774Z

[tool_use: Bash]

### User | 2026-05-12T19:20:40.129Z

[tool_result] stderr | src/__tests__/NeuralRoutingEngine.test.ts > prism_ai:neural_route_decision — dispatcher round-trip (U-OCN03 wiring) > dispatches through executeAIReasoningAction → success:true with routing decision
[INFO] [prism_ai] neural_route_decision completed in 3ms

 ✓ src/__tests__/NeuralRoutingEngine.test.ts (15 tests) 470ms
     ✓ dispatches through executeAIReasoningAction → success:true with r
... [+2615 chars truncated]

### Assistant | 2026-05-12T19:21:18.305Z

All 75 tests pass across the 5 files (16 + 14 + 17 + 15 + 13 = 75). Wiring round-trips through both dispatchers succeed. I have everything needed for the verdict.

---

# REVIEW VERDICT

**VERDICT: PASS**

One-line summary: OCTOPUS-NEURAL-MS0 delivers 5 well-bounded engines + 75 passing tests with concrete-value assertions, clean dispatcher wiring on both `prism_ai` and `prism_safety`, no inlined physics constants, and a load-bearing safety-net in `ConsensusQuorumEngine` that correctly over-escalates rather than under-escalates.

## Critical findings (P0 — block the merge): **0**

## Important findings (P1 — fix before merge but mergeable): **0**

## Minor findings (P2 — nice-to-have, do NOT block merge): **3**

1. **`ConsensusQuorumEngine` safety-net has one ambiguous-rationale edge** — when `rawCategory === "unknown"` AND a `subjectSafetyHint` ALSO fires, both branches set `escalated=true` but `category` ends up as `safety-critical` (subject wins). The rationale string then reports "(escalated from unknown)" — which is technically true but misleading; "(escalated from unknown via subject hint)" would help debugging. Cosmetic only — the quorum decision (5-of-5) is correct.
   - File: `H:/prism-octopus-neural-ms0/mcp-server/src/engines/ConsensusQuorumEngine.ts` (Stage 5, lines 185–203)

2. **`NeuralRoutingEngine.distance` weights are magic numbers** — `1.0` (changeClass), `0.5` (jaccard), `0.3` (peer), `0.2` (files), `-0.8` (fingerprint) are inline in `distance()`. The engine is internally consistent and the values are defensible, but extracting them as module-scope `DISTANCE_WEIGHTS` would make calibration via a future ledger-replay easier. NOT a physics-constants violation (these are routing hyperparameters, not load-bearing physics).
   - File: `H:/prism-octopus-neural-ms0/mcp-server/src/engines/NeuralRoutingEngine.ts:288-313`

3. **`CascadeCalibrationEngine` dispatcher path is documented as read-only** but the `case "cascade_calibrate"` returns `result.ok: true`
... [+5654 chars truncated]

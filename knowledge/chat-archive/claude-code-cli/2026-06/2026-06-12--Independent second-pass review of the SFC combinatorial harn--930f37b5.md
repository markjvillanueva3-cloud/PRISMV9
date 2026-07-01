---
type: "chat-session"
source: "claude-code-cli"
session_id: "930f37b5-d5cf-4924-8d86-d7713730da3d"
title: "Independent second-pass review of the SFC combinatorial harness DRIVER + test. D"
date: "2026-06-12"
first_ts: "2026-06-12T00:27:10.426Z"
last_ts: "2026-06-12T00:31:16.596Z"
cwd: "H:\\prism-slot-oscar"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a2c0a82d496e9da2a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Independent second-pass review of the SFC combinatorial harness DRIVER + test. D

> **claude-code-cli** | 2026-06-12 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/930f37b5-d5cf-4924-8d86-d7713730da3d/subagents/agent-a2c0a82d496e9da2a.jsonl`

## Transcript

### User | 2026-06-12T00:27:10.426Z

Independent second-pass review of the SFC combinatorial harness DRIVER + test. Do NOT assume a prior reviewer caught everything. Weight your attention on: integration with the already-built CSFH modules (sampler/gates/datasource/axes), hidden coupling, the never-fabricate contract, naming/convention conformance, inlined constants, and test-integrity (stub/weak assertions per R9).

Files (read each end-to-end):
- H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-driver.ts
- H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-driver.test.ts

Supporting modules it integrates with (read as needed to verify the contracts line up):
- H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-sampler.ts (SampledCell, SamplerOptions, CombinatorialCellSamplerEngine.sample)
- H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-gates.ts (gateCell, CellGateVerdict, GateableResult, GateStatus)
- H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-datasource.ts (SpeedFeedCombinatorialDataSourceEngine, CitedDataRow, DataSourceCellQuery, resolveCell, withRealProviders)
- H:\prism-slot-oscar\mcp-server\src\engines\UltimateSpeedFeedEngine.ts (UltimateSpeedFeedInput @~89, UltimateSpeedFeedResult, ultimateSpeedFeedEngine singleton, calculate())

Context: the driver runs each sampled cell through the SFC engine (injected -- real engine is ~2.5s/call so DI + maxCells lets tests use a fast fake; a real-data E2E drives a tiny capped N through the real ultimateSpeedFeedEngine). It applies gateCell, attaches a citation, emits DrivenCell records. Already verified live: tsx eval drove 8/8 real cells gate-passed; tsc --noEmit clean on all CSFH files; gateCell(result) compiles with NO cast (UltimateSpeedFeedResult structurally assignable to GateableResult).

Specifically verify:
- Does `toInput` correctly + completely map SampledCell -> UltimateSpeedFeedInput? Cross-check the SampledCell field names against the actual UltimateSpeedFeedInput interface -- any field mi
... [+1518 chars truncated]

### Assistant | 2026-06-12T00:27:19.803Z

I'll read the driver, its test, and all supporting modules end-to-end before forming any verdict.

### Assistant | 2026-06-12T00:27:20.324Z

[tool_use: Read]

### Assistant | 2026-06-12T00:27:20.975Z

[tool_use: Read]

### User | 2026-06-12T00:27:43.759Z

[tool_result] 1	/**
2	 * SFC combinatorial harness DRIVER -- the run loop that ties the harness together.
3	 * For each sampled cell (U-CSFH-04) it: maps the cell to an UltimateSpeedFeedInput,
4	 * runs the SFC engine, applies the per-cell GATES (U-CSFH-05), attaches a cited
5	 * vendor row (U-CSFH-03), and emits one DrivenCell record. The output is the
6	 * dataset U-CSFH-07/08 compare + derive baseline params
... [+7449 chars truncated]

### User | 2026-06-12T00:27:43.898Z

[tool_result] 1	/**
2	 * Tests for the SFC combinatorial harness DRIVER (U-CSFH-06-DRIVER).
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
5	 *
6	 * Two layers (pure-core + injected-readers rule):
7	 *   1. DI unit tests with a fast FAKE calculator + fake vendor provider -- pin the
8	 *      driven/error/gate-tally/citation paths + the cell->input mapping + the
9	 *      NEVER-FABRICATE contract (engin
... [+8220 chars truncated]

### Assistant | 2026-06-12T00:27:48.764Z

Now read the supporting modules to verify contracts:

### Assistant | 2026-06-12T00:27:51.093Z

[tool_use: Read]

### Assistant | 2026-06-12T00:27:51.311Z

[tool_use: Read]

### User | 2026-06-12T00:28:06.193Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-gates.ts' was already read 43s ago in this session and is unchanged (mtime 1781151366719). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRIS
... [+15 chars truncated]

### User | 2026-06-12T00:28:09.984Z

[tool_result] 1	/**
2	 * SFC combinatorial DOE SAMPLER -- generates the sampled cell space the harness
3	 * driver runs through the SFC engine. Full-enumerates the discrete validity cells
4	 * (U-CSFH-02) and stratified-samples the continuous axes (diameter / flutes /
5	 * power / hardness / coolant) x the ISO-group axis, with a per-regime coverage
6	 * floor so even sparse operations (tapping has 2 valid cells
... [+7082 chars truncated]

### Assistant | 2026-06-12T00:28:13.311Z

[tool_use: Read]

### Assistant | 2026-06-12T00:28:14.072Z

[tool_use: Read]

### User | 2026-06-12T00:28:20.769Z

[tool_result] 1	/**
2	 * SFC combinatorial CITED-DATA source -- resolves a real, provenance-bearing
3	 * (vc, fz) reference for a combinatorial cell, or returns UNRESOLVED. It NEVER
4	 * fabricates a value: every number it emits came from a provider and carries its
5	 * source; a miss is `resolved:false` with `vc_mpm/fz_mm = null`, never a silent
6	 * default. (Pairs with the U-CSFH-05 gates' silent-default det
... [+8091 chars truncated]

### User | 2026-06-12T00:28:20.892Z

[tool_result] 1	/**
2	 * UltimateSpeedFeedEngine — AI-Powered Unified Speed & Feed Optimization
3	 *
4	 * The most comprehensive speed/feed calculator in existence. Accepts ANY subset
5	 * of inputs and infers all missing parameters using physics-based models,
6	 * material databases, and empirical lookup tables.
7	 *
8	 * Capabilities far exceeding Harvey Tool / Kennametal / Sandvik calculators:
9	 *   - Parti
... [+6815 chars truncated]

### Assistant | 2026-06-12T00:28:25.208Z

Let me continue reading the UltimateSpeedFeedEngine to get the full result type, then read the gates file from cache:

### Assistant | 2026-06-12T00:28:25.906Z

[tool_use: Read]

### User | 2026-06-12T00:28:32.316Z

[tool_result] 150	  regrind_cost_usd?: number;
151	
152	  // Optimization goal
153	  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced";
154	
155	  // Coolant
156	  coolant?: CoolantType;
157	
158	  // Edge geometry (for ploughing force analysis)
159	  edge_radius_mm?: number;           // cutting edge radius (0.005–0.05mm typical)
160	
161	  // Runout / TIR (for quality impact analysis
... [+6668 chars truncated]

### Assistant | 2026-06-12T00:28:36.197Z

[tool_use: Read]

### User | 2026-06-12T00:28:40.555Z

[tool_result] 348	  // Statistical analysis
349	  uncertainty: {
350	    cutting_speed: { ci_95_low: number; ci_95_high: number; cv_pct: number };
351	    feed_per_tooth: { ci_95_low: number; ci_95_high: number; cv_pct: number };
352	    tool_life: { ci_95_low: number; ci_95_high: number; cv_pct: number };
353	    force: { ci_95_low: number; ci_95_high: number; cv_pct: number };
354	    surface_finish: { ci_95_
... [+4717 chars truncated]

### Assistant | 2026-06-12T00:28:43.293Z

Now I have enough of the engine type. Let me check the gates file content from the earlier read (it was already in context), and verify the axes file for the union types:

### Assistant | 2026-06-12T00:28:44.150Z

[tool_use: Read]

### User | 2026-06-12T00:28:55.339Z

[tool_result] 1	/**
2	 * SFC combinatorial input axes — single canonical source of truth.
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-01-AXES-EXTRACT (slot:oscar, 2026-06-04).
5	 *
6	 * These are the variability axes the SFC accepts, extracted verbatim from
7	 * `__tests__/UltimateSpeedFeedEngine.variability.test.ts` so that the 103-case
8	 * variability matrix, the 401-assert gauntlet, AND the runtime combinatorial
... [+3492 chars truncated]

### Assistant | 2026-06-12T00:28:57.584Z

Now let me check the gates file that was already read (from prior session context) to verify the GateableResult contract:

### Assistant | 2026-06-12T00:28:59.359Z

[tool_use: Grep]

### User | 2026-06-12T00:29:12.748Z

[tool_result] 42- * pass a real result and tests can build a tiny fixture.
43- */
44:export interface GateableResult {
45:  cutting_speed: Pick<OptimizedValue, "value" | "unit" | "source">;
46:  spindle_rpm: Pick<OptimizedValue, "value" | "unit" | "source">;
47-  feed_rate: Pick<OptimizedValue, "value" | "unit" | "source">;
48-  mrr: Pick<OptimizedValue, "value" | "unit" | "source">;
49-  forces: { resultant_fo
... [+3236 chars truncated]

### Assistant | 2026-06-12T00:29:18.449Z

Now I have all necessary information. Let me do one final check on the `citedCount` logic and the citation-before-try ordering, and verify the `dsOk/dsNull` test paths for the `vendorContext` tests:

### Assistant | 2026-06-12T00:29:19.910Z

[tool_use: Grep]

### User | 2026-06-12T00:29:25.635Z

[tool_result] No matches found

### Assistant | 2026-06-12T00:29:27.745Z

The grep pattern was too restrictive. Let me search more broadly:

### Assistant | 2026-06-12T00:29:28.894Z

[tool_use: Grep]

### User | 2026-06-12T00:29:52.367Z

[tool_result] 6- * Two layers (pure-core + injected-readers rule):
7- *   1. DI unit tests with a fast FAKE calculator + fake vendor provider -- pin the
8: *      driven/error/gate-tally/citation paths + the cell->input mapping + the
9- *      NEVER-FABRICATE contract (engine throw => driven:false, summary null).
10- *   2. A real-data E2E through `withRealEngine()` driving a tiny capped N of cells
--
60-const 
... [+2687 chars truncated]

### Assistant | 2026-06-12T00:31:16.596Z

I now have everything needed for a complete verdict. Here is the full review.

---

## Code Review: SFC Combinatorial Harness DRIVER + Test

### Review scope

Files examined end-to-end:
- `H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-driver.ts`
- `H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-driver.test.ts`

Supporting contracts verified against:
- `sfc-combinatorial-sampler.ts` (SampledCell fields)
- `sfc-combinatorial-axes.ts` (union literal types)
- `sfc-combinatorial-gates.ts` (GateableResult, gateCell)
- `sfc-combinatorial-datasource.ts` (DataSourceCellQuery, CitedDataRow)
- `UltimateSpeedFeedEngine.ts` (UltimateSpeedFeedInput lines 89-173, UltimateSpeedFeedResult lines 248-402)

---

### 1. toInput mapping: SampledCell -> UltimateSpeedFeedInput

Every field in the driver's `toInput` is verified against the actual interface:

| Driver maps | SampledCell field | Input field | Match |
|---|---|---|---|
| `material` | `representative_material: string` | `material?: string` | correct |
| `iso_group` | `iso_group: ISOGroup` | `iso_group?: ISOGroup` | correct |
| `hardness_hb` | `hardness_hb: number` | `hardness_hb?: number` | correct |
| `tool_diameter_mm` | `diameter_mm: number` | `tool_diameter_mm?: number` | correct -- the rename is right |
| `flutes` | `flutes: number` | `flutes?: number` | correct |
| `tool_material` | `tool_material: ToolMaterial` | `tool_material?: ToolMaterial` | correct |
| `operation` | `operation: Operation` | `operation?: Operation` | correct |
| `cut_type` | `cut_type: CutType` | `cut_type?: CutType` | correct |
| `strategy` | `strategy: Strategy` | `strategy?: "conventional"\|"adaptive"\|"trochoidal"\|"hsm"\|"hpc"\|"plunge"\|"slot"` | see below |
| `machine_power_kw` | `machine_power_kw: number` | `machine_power_kw?: number` | correct |
| `coolant` | `coolant: CoolantType` | `coolant?: CoolantType` | correct |

**Strategy union alignment**: `Strategy` in `sfc-combinatorial-axes.ts` is defined independentl
... [+11834 chars truncated]

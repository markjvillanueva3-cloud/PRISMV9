---
type: "chat-session"
source: "claude-code-cli"
session_id: "fee91401-5f86-4444-8674-45a388dac493"
title: "Review a dispatcher-wiring change in the PRISM MCP server. This is a quality gat"
date: "2026-05-22"
first_ts: "2026-05-22T17:43:26.415Z"
last_ts: "2026-05-22T17:45:04.424Z"
cwd: "H:\\prism\\mcp-server"
messages: 33
user_msgs: 14
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/fee91401-5f86-4444-8674-45a388dac493/subagents/agent-a2b815a4e729276ea.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Review a dispatcher-wiring change in the PRISM MCP server. This is a quality gat

> **claude-code-cli** | 2026-05-22 | 33 msgs (14 user / 19 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/fee91401-5f86-4444-8674-45a388dac493/subagents/agent-a2b815a4e729276ea.jsonl`

## Transcript

### User | 2026-05-22T17:43:26.415Z

Review a dispatcher-wiring change in the PRISM MCP server. This is a quality gate — read each named file end to end.

UNIT: KILO-P2P-RECONCILE-MS0 / U-KP2P-01. Goal: re-wire millDispatcher's print-to-program "program" bucket from the MillPrintToProgramEngine STUB (which returned {ok:false,stub:true} — never a real program) to the real MillingPrintToProgramEngine (81K, entry method `runFullPipeline(input): MillingProgramResult`).

CHANGED FILES (review all):
1. H:/prism/mcp-server/src/tools/dispatchers/millDispatcher.ts — (a) new `toMillingInput(params)` adapter function placed after `callOrThrow`; (b) the `case "program":` branch of getEngine() now lazy-imports `MillingPrintToProgramEngine.js` / `millingPrintToProgramEngine` instead of the stub; (c) the `mill_print_to_program` and `mill_generate_gcode` action cases now call `callOrThrow(getEngine("program"), ["runFullPipeline"], toMillingInput(params), "MillingPrintToProgramEngine")`.
2. H:/prism/mcp-server/src/schemas/millActionSchemas.ts — the `mill_generate_gcode` schema was changed from requiring `operations[]` (a stub-era contract) to a features-based shape mirroring `mill_print_to_program`.
3. H:/prism/mcp-server/src/engines/MillPrintToProgramEngine.ts — header comment annotated SUPERSEDED; the stub file is intentionally KEPT (still imported by MillMasterOrchestratorFacadeEngine).
4. H:/prism/mcp-server/src/__tests__/millDispatcher.printToProgram.test.ts — new 12-case dispatcher round-trip test (currently all green; `tsc --noEmit` is clean for all 4 files).

VERIFY (wiring correctness + regression):
1. The `case "program":` rewire is correct — engine name, singleton name, `.js` import path all match the real engine file. `_program` cache var still works.
2. `callOrThrow` semantics: it calls the FIRST method in the candidate list that exists. `["runFullPipeline"]` — confirm `runFullPipeline` is a real PUBLIC method on MillingPrintToProgramEngine.
3. The `toMillingInput` adapter correctly bridges the dispatcher 
... [+723 chars truncated]

### Assistant | 2026-05-22T17:43:39.766Z

I'll read all four changed files end to end before issuing findings.

### Assistant | 2026-05-22T17:43:40.327Z

[tool_use: Read]

### Assistant | 2026-05-22T17:43:40.331Z

[tool_use: Read]

### User | 2026-05-22T17:43:50.251Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1204 of 2053 total (36233 tokens, cap 25000). Call Read with offset=1205 limit=1204 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * Mill Dispatcher Action Schemas
3	 * ===============================
4	 * Per-action Zod schem
... [+51800 chars truncated]

### User | 2026-05-22T17:43:50.271Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1090 of 1756 total (34212 tokens, cap 25000). Call Read with offset=1091 limit=1090 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * prism_mill — Mill-Specific Dispatcher
3	 * MILL-MASTER/P1-U01-MILL-DISP, P1-U04-SA-INTEG
4	 *
... [+60409 chars truncated]

### Assistant | 2026-05-22T17:43:53.669Z

Now I need to read the engine file and the test file.

### Assistant | 2026-05-22T17:43:54.601Z

[tool_use: Read]

### Assistant | 2026-05-22T17:43:55.011Z

[tool_use: Read]

### User | 2026-05-22T17:43:58.872Z

[tool_result] 1	// @ts-nocheck
2	// WIRE-EXEMPT: consumed by mcp-server/src/routes/milling.ts (wizard-submit
3	// HTTP handler), not via MCP dispatcher action. Companion test file is
4	// MILLING-PRINT-TO-PROGRAM.test.ts (kebab — 50+ cases). Hook can't match
5	// the kebab name to the PascalCase engine; both wirings are real.
6	/**
7	 * MillingPrintToProgramEngine — Milling Operations Pipeline
8	 *
9	 * Generat
... [+5257 chars truncated]

### User | 2026-05-22T17:43:58.915Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\millDispatcher.printToProgram.test.ts' was already read 12s ago in this session and is unchanged (mtime 1779471559728). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-05-22T17:44:01.714Z

I need to read the `runFullPipeline` method signature from the engine, and also check the stub file and the test file content.

### Assistant | 2026-05-22T17:44:02.751Z

[tool_use: Grep]

### Assistant | 2026-05-22T17:44:03.761Z

[tool_use: Grep]

### Assistant | 2026-05-22T17:44:04.168Z

[tool_use: Read]

### User | 2026-05-22T17:44:11.711Z

[tool_result] 1	// WIRE-EXEMPT: U-EFF25 stub — SUPERSEDED for millDispatcher; still imported by MillMasterOrchestratorFacadeEngine.
2	/**
3	 * MillPrintToProgramEngine — stub (U-EFF25). SUPERSEDED 2026-05-22.
4	 *
5	 * KILO-P2P-RECONCILE-MS0/U-KP2P-01: millDispatcher's "program" bucket now wires
6	 * to the real MillingPrintToProgramEngine (runFullPipeline). This stub is
7	 * RETAINED — not deleted (feedback_ne
... [+525 chars truncated]

### User | 2026-05-22T17:44:12.304Z

[tool_result] 2164:export const millingPrintToProgramEngine = new MillingPrintToProgramEngine();

### User | 2026-05-22T17:44:12.593Z

[tool_result] 953:        return this.runFullPipeline(params as unknown as MillingInput);
955:        return this.runFullPipeline(params as unknown as MillingInput);
957:        return this.runFullPipeline(params as unknown as MillingInput);
2005:  runFullPipeline(input: MillingInput): MillingProgramResult {

### Assistant | 2026-05-22T17:44:15.888Z

Now I need to read the `runFullPipeline` signature and the `MillingInput` type, plus the test file content.

### Assistant | 2026-05-22T17:44:16.373Z

[tool_use: Read]

### Assistant | 2026-05-22T17:44:17.234Z

[tool_use: Read]

### User | 2026-05-22T17:44:19.943Z

[tool_result] 120	export type MillingFeatureType =
121	  // 2.5D standard
122	  | "face"
123	  | "pocket_open" | "pocket_closed" | "pocket_island"
124	  | "slot_open" | "slot_closed" | "t_slot" | "dovetail_slot"
125	  | "hole_through" | "hole_blind" | "hole_counterbore" | "hole_countersink"
126	  | "thread_internal" | "thread_external"
127	  | "bore_rough" | "bore_finish"
128	  | "contour_outside" | "contour_in
... [+3907 chars truncated]

### User | 2026-05-22T17:44:19.959Z

[tool_result] 1995	   * Run the complete 5-stage milling print-to-program pipeline.
1996	   *
1997	   * Side effect (INFRA-NEURAL-LEDGER-MS1/P0-U02): emits a fire-and-forget
1998	   * `cross_process_stage_complete` event to the OutcomeCaptureBus JSONL
1999	   * ledger before returning. The emission is non-blocking and never throws;
2000	   * a ledger failure cannot break the pipeline. See utils/p2pOutcomeEmissi
... [+2824 chars truncated]

### Assistant | 2026-05-22T17:44:22.648Z

Now I need to see the `MillingInput` type definition and the test file.

### Assistant | 2026-05-22T17:44:24.128Z

[tool_use: Grep]

### Assistant | 2026-05-22T17:44:25.124Z

[tool_use: Grep]

### User | 2026-05-22T17:44:26.284Z

[tool_result] 5: * MillPrintToProgramEngine STUB (returns {ok:false,stub:true} — never a real
7: * (runFullPipeline) and adds the toMillingInput param adapter (the dispatcher
14: *   - feature_count === N (matches the inputs) — the stub never reports this.
16: *     internally-consistent process plan. The stub has no operations array.
17: *   - program_text is a non-empty G-code string — the stub emits none.
20
... [+1504 chars truncated]

### User | 2026-05-22T17:44:27.421Z

[tool_result] 254:export interface MillingInput {

### Assistant | 2026-05-22T17:44:29.715Z

[tool_use: Read]

### Assistant | 2026-05-22T17:44:30.382Z

[tool_use: Read]

### User | 2026-05-22T17:44:31.961Z

[tool_result] 254	export interface MillingInput {
255	  part_number?: string;
256	  material: MillingMaterial;
257	  stock_size?: { x: number; y: number; z: number };
258	  features: MillingFeature[];
259	  machine?: "haas_vf2" | "hurco_vm10i" | "hurco_vmx30i" | "roku_roku_hsm5" | "okuma_mu4000v";
260	  controller?: MillingController;
261	  taper?: MillingTaper;
262	  max_spindle_rpm?: number;
263	  max_power_k
... [+847 chars truncated]

### User | 2026-05-22T17:44:33.169Z

[tool_result] 1	/**
2	 * KILO-P2P-RECONCILE-MS0 / U-KP2P-01 — mill print-to-program wire test (slot:kilo, 2026-05-22)
3	 *
4	 * Before this unit, millDispatcher's "program" bucket lazy-imported the
5	 * MillPrintToProgramEngine STUB (returns {ok:false,stub:true} — never a real
6	 * program). U-KP2P-01 re-points the bucket to the real MillingPrintToProgramEngine
7	 * (runFullPipeline) and adds the toMillingInput
... [+8865 chars truncated]

### Assistant | 2026-05-22T17:45:04.424Z

I have all the data needed. Here is the complete review.

---

**Check 1 — case "program": rewire correctness**

`H:/prism/mcp-server/src/tools/dispatchers/millDispatcher.ts` line 146:

```ts
return _program ??= (await import("../../engines/MillingPrintToProgramEngine.js")).millingPrintToProgramEngine;
```

- Import path: `../../engines/MillingPrintToProgramEngine.js` — matches the `.ts` source file at `src/engines/MillingPrintToProgramEngine.ts`. Correct.
- Named export used: `millingPrintToProgramEngine` — confirmed at line 2164 of the engine file: `export const millingPrintToProgramEngine = new MillingPrintToProgramEngine();`. Correct.
- Cache variable: `_program` — declared in the module-level `let` block at line 64, same variable used in both the getter and the two call sites. No aliasing issue. Correct.

**Check 2 — callOrThrow / runFullPipeline existence and visibility**

`runFullPipeline` is declared at line 2005 as a non-static, non-private instance method: `runFullPipeline(input: MillingInput): MillingProgramResult`. It is a plain public method on the class. `callOrThrow` iterates the candidate list with `typeof engine?.[method] === "function"` and calls the first match. With `["runFullPipeline"]` as the sole candidate, it will find and invoke the method. No P0/P1 issue.

**Check 3 — toMillingInput adapter: null/undefined hazards and shape correctness**

```ts
function toMillingInput(params: any): any {
  const p = params ?? {};
  const material =
    p.material && typeof p.material === "object"
      ? p.material
      : { material_name: typeof p.material === "string" ? p.material : "unspecified",
          iso_group: p.iso_group ?? "P" };
  return { ...p, material, features: Array.isArray(p.features) ? p.features : [] };
}
```

`MillingInput.material` is typed as `MillingMaterial` — an object with `material_name: string` and `iso_group: ISOGroup`. The adapter correctly builds that object from a string, passes it through if already an object, and defaults
... [+3042 chars truncated]

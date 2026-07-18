---
type: "chat-session"
source: "claude-code-cli"
session_id: "8347ba23-a479-47f7-8ee0-b6014bc5e610"
title: "Review a single dispatcher wire for correctness + security. Read these end-to-en"
date: "2026-06-11"
first_ts: "2026-06-11T23:26:19.162Z"
last_ts: "2026-06-11T23:27:23.111Z"
cwd: "H:\\prism-slot-bravo"
messages: 29
user_msgs: 11
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-a11825c3aa45aea2f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Review a single dispatcher wire for correctness + security. Read these end-to-en

> **claude-code-cli** | 2026-06-11 | 29 msgs (11 user / 18 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-a11825c3aa45aea2f.jsonl`

## Transcript

### User | 2026-06-11T23:26:19.162Z

Review a single dispatcher wire for correctness + security. Read these end-to-end:
1. `H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts` — the new z.enum entry `"sfc_parameter_refinement_compute"` (around line 1068-1082) AND its case handler (around line 9544-9578, just after `case "sfc_ranker_stats"`).
2. `H:/prism/mcp-server/src/engines/SFCParameterRefinementEngine.ts` — the engine being wired (export `sfcParameterRefinementEngine`, method `computeRefinement(input)`).

Verify ALL of:
- The action name appears in BOTH the z.enum action list AND the switch (no orphan/typo mismatch).
- The case dynamic-imports the engine and calls `computeRefinement` correctly; the engine signature (input shape: `{context, sinceDays?, minSamples?, maxFactor?, iqrScale?, fullConfidenceSamples?, bus?, clock?}`) matches what the case forwards.
- **SECURITY (load-bearing):** the case must forward ONLY validated tuning fields and must NOT forward `params.bus` or `params.clock` (forwarding them would let an MCP caller swap the engine's data source / clock). Confirm `bus`/`clock` are NOT threaded through.
- `computeRefinement` never throws (returns ok:false on error) → confirm no unnecessary try/catch is missing AND no unhandled-throw path.
- R12: the action exposes deterministic median/IQR + safety-clamp DATA only, never NN inference.
- The `context`-required guard returns a usable error for missing/non-object context.

Report P0/P1 findings only. End with a single line: `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-06-11T23:26:21.991Z

I'll read both files end-to-end, focusing on the specific sections mentioned.

### Assistant | 2026-06-11T23:26:22.493Z

[tool_use: Read]

### Assistant | 2026-06-11T23:26:22.872Z

[tool_use: Read]

### User | 2026-06-11T23:26:23.412Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\SFCParameterRefinementEngine.ts' was already read 8m ago in this session and is unchanged (mtime 1779262622654). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-06-11T23:26:23.465Z

[tool_result] 1060	  // deterministic stats() (query counts, capability inventory, episodic/KG sizes), NOT NN inference (L3 has 13
1061	  // Math.random() sites; inference output is untrained until U-AITRAIN-SPEEDFEED ships).
1062	  "speedfeed_advanced_ai_stats", "speedfeed_ultimate_ai_stats",
1063	  // OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): SpeedFeedOutcomeFeedbackBridgeEngine was built + consumed by th
... [+2610 chars truncated]

### Assistant | 2026-06-11T23:26:27.117Z

Let me read the case handler section and the engine content from context.

### Assistant | 2026-06-11T23:26:27.443Z

[tool_use: Read]

### User | 2026-06-11T23:26:29.108Z

[tool_result] 9530	            const { sfcMultiHypothesisRankerEngine } = await import("../../engines/SFCMultiHypothesisRankerEngine.js");
9531	            if (!Array.isArray(params.candidates) || params.candidates.length === 0) {
9532	              result = { success: false, error: "candidates must be a non-empty array of { source, sfm, fpt, doc } speed/feed hypotheses" };
9533	              break;
9534	      
... [+4316 chars truncated]

### Assistant | 2026-06-11T23:26:31.666Z

Good. Now let me read the engine itself — the read-once-guard said it was already read earlier. Let me grep key sections to verify the signature and throw behavior.

### Assistant | 2026-06-11T23:26:33.603Z

[tool_use: Grep]

### Assistant | 2026-06-11T23:26:34.362Z

[tool_use: Grep]

### User | 2026-06-11T23:26:35.016Z

[tool_result] 15: *   computeRefinement(context) → multiplicative correction factors
75: *   - Never throws (matches OutcomeCaptureBus + SFCOutcomeCaptureWireEngine
174:      ok: false;
176:        | "no_evidence"
177:        | "below_min_samples"
178:        | "invalid_context"
179:        | "bus_error";
362:  computeRefinement(input: SFCRefinementInput): SFCRefinementResult {
374:        ok: false,
375:      
... [+476 chars truncated]

### User | 2026-06-11T23:26:35.569Z

[tool_result] 394:    const bus = input.bus ?? this.bus;
395:    const clock = input.clock ?? (() => Date.now());

### Assistant | 2026-06-11T23:26:38.017Z

Critical finding. Let me read the engine's `computeRefinement` method around the `input.bus` / `input.clock` usage to understand the full exposure surface.

### Assistant | 2026-06-11T23:26:38.660Z

[tool_use: Read]

### Assistant | 2026-06-11T23:26:39.221Z

[tool_use: Read]

### User | 2026-06-11T23:26:39.557Z

[tool_result] 360	   * @returns result object — caller MUST inspect `ok` and `confidence`.
361	   */
362	  computeRefinement(input: SFCRefinementInput): SFCRefinementResult {
363	    // 1. Validate input.
364	    const parsed = SFCInputSchema.safeParse({
365	      context: input.context,
366	      sinceDays: input.sinceDays,
367	      minSamples: input.minSamples,
368	      maxFactor: input.maxFactor,
369	     
... [+3679 chars truncated]

### User | 2026-06-11T23:26:40.252Z

[tool_result] 155	}
156	
157	export type SFCRefinementResult =
158	  | {
159	      ok: true;
160	      factors: SFCRefinementFactors;
161	      confidence: number;
162	      sampleSize: number;
163	      evidenceLineageIds: string[];
164	      /** True when the surfaced `evidenceLineageIds` list was truncated for size. */
165	      evidenceLineageIdsTruncated: boolean;
166	      dispersion: SFCRefinementDispers
... [+1398 chars truncated]

### Assistant | 2026-06-11T23:26:42.807Z

Now I have everything I need. Let me read the `SFCRefinementInput` type definition to confirm whether `bus` and `clock` are typed fields that the schema accepts.

### Assistant | 2026-06-11T23:26:43.796Z

[tool_use: Read]

### User | 2026-06-11T23:26:44.679Z

[tool_result] 80	 */
81	
82	import { z } from "zod";
83	import {
84	  outcomeCaptureBusEngine,
85	  type OutcomeCaptureBusEngine,
86	} from "./OutcomeCaptureBusEngine.js";
87	import type { OutcomeEvent } from "../schemas/outcomeEventSchema.js";
88	
89	/**
90	 * Canonical correction factors emitted by this engine. Each is a
91	 * MULTIPLICATIVE scalar — caller multiplies the corresponding SFC output
92	 * field 
... [+2371 chars truncated]

### Assistant | 2026-06-11T23:26:59.076Z

I have all the information needed. Here is the complete finding.

---

**Engine reviewed:** `SFCParameterRefinementEngine`
**File:** `H:/prism/mcp-server/src/engines/SFCParameterRefinementEngine.ts`
**Dispatcher:** `calcDispatcher`

---

**z.enum entry**

`"sfc_parameter_refinement_compute"` appears at line 1080 of `calcDispatcher.ts`, inside the z.enum action array. Confirmed present.

**Case statement**

`case "sfc_parameter_refinement_compute":` appears at line 9562. It follows immediately after `case "sfc_ranker_stats"` (line 9543), consistent with the stated location. The action string in the enum and the case label are byte-identical — no orphan/typo mismatch.

**Lazy import**

Line 9568: `const { sfcParameterRefinementEngine } = await import("../../engines/SFCParameterRefinementEngine.js");` — dynamic import, no top-level static import. Correct.

**Method call and input shape**

The case builds `refineInput` as `{ context, sinceDays?, minSamples?, maxFactor?, iqrScale?, fullConfidenceSamples? }` (lines 9569–9574) and passes it to `sfcParameterRefinementEngine.computeRefinement(...)` (line 9575). This matches the typed `SFCRefinementInput` fields exactly.

---

**P0 — SECURITY: `bus`/`clock` injection path is open at the type level but correctly NOT forwarded by the dispatcher**

`SFCRefinementInput` declares `bus?: OutcomeCaptureBusEngine` and `clock?: () => number` as first-class typed fields (lines 147 and 154). The engine uses them at lines 394–395:

```
const bus = input.bus ?? this.bus;
const clock = input.clock ?? (() => Date.now());
```

The dispatcher case (lines 9569–9574) constructs `refineInput` by explicit field enumeration and does **not** include `params.bus` or `params.clock`. The security requirement is met — an MCP caller cannot inject a substitute bus or clock through this action.

However, the `SFCInputSchema` (used at line 364) must also not accept `bus`/`clock` as pass-through fields, otherwise a `safeParse`-then-spread pattern could rein
... [+52 chars truncated]

### Assistant | 2026-06-11T23:27:00.287Z

[tool_use: Grep]

### User | 2026-06-11T23:27:01.790Z

[tool_result] 206:const SFCInputSchema = z
364:    const parsed = SFCInputSchema.safeParse({

### Assistant | 2026-06-11T23:27:04.162Z

I need to read the SFCInputSchema definition to confirm it does not pass through `bus`/`clock`.

### Assistant | 2026-06-11T23:27:04.594Z

[tool_use: Read]

### User | 2026-06-11T23:27:05.557Z

[tool_result] 206	const SFCInputSchema = z
207	  .object({
208	    context: z
209	      .object({
210	        customer: z.string().min(1).optional(),
211	        material: z.string().min(1).optional(),
212	        machine_id: z.string().min(1).optional(),
213	        tool_id: z.string().min(1).optional(),
214	        operation: z.string().min(1).optional(),
215	      })
216	      .describe("Context filter — ref
... [+2009 chars truncated]

### Assistant | 2026-06-11T23:27:23.111Z

Now I have the complete picture. Here is the full verdict.

---

**All checks complete.**

**z.enum / case name match:** `"sfc_parameter_refinement_compute"` appears at line 1080 in the enum and at line 9562 as the case label. Byte-identical. No orphan or typo.

**Lazy import:** Dynamic `await import(...)` at line 9568. No static top-level import. Correct.

**Input shape forwarded:** The dispatcher explicitly enumerates `context`, `sinceDays`, `minSamples`, `maxFactor`, `iqrScale`, `fullConfidenceSamples` — exactly the five tuning fields of `SFCRefinementInput` — and nothing else.

**SECURITY — `bus`/`clock` not forwarded (CONFIRMED PASS):**
The dispatcher case does not include `params.bus` or `params.clock` in `refineInput`. Additionally, `SFCInputSchema` at lines 206–223 is a plain `z.object({...})` with no `.passthrough()` call and no `bus`/`clock` keys. Zod's default strip mode means even if a caller somehow injected those keys into the `params` object, the schema parse at line 364 only materializes the five declared fields. `parsed.data` never carries `bus` or `clock`. The `input.bus ?? this.bus` line (394) can only receive `undefined` from any MCP call path, falling back to the singleton bus unconditionally. The injection surface is fully closed at two independent layers: (1) explicit field enumeration in the case, (2) schema strip on `safeParse`.

**Never-throws guarantee:** The comment at lines 9555–9556 states `computeRefinement NEVER throws`. The engine confirms this: every failure path (`invalid_context` at line 374, `bus_error` at lines 414 and 461, `no_evidence` at lines 441 and 517, `below_min_samples` at line 526) returns an `ok: false` object. The two `try/catch` blocks at lines 404 and 452 wrap the only external calls (`bus.query()`), catching all thrown errors and converting them to `ok:false, reason:"bus_error"`. No unhandled-throw path exists. No unnecessary additional try/catch is needed in the dispatcher.

**context-required guard:** Lines 9563
... [+574 chars truncated]

---
type: "chat-session"
source: "claude-code-cli"
session_id: "fee91401-5f86-4444-8674-45a388dac493"
title: "Independent second-pass review of a PRISM roadmap milestone envelope JSON. Weigh"
date: "2026-05-22"
first_ts: "2026-05-22T17:19:42.068Z"
last_ts: "2026-05-22T17:20:35.886Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/fee91401-5f86-4444-8674-45a388dac493/subagents/agent-a823bd52d5805848d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Independent second-pass review of a PRISM roadmap milestone envelope JSON. Weigh

> **claude-code-cli** | 2026-05-22 | 11 msgs (5 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fee91401-5f86-4444-8674-45a388dac493/subagents/agent-a823bd52d5805848d.jsonl`

## Transcript

### User | 2026-05-22T17:19:42.068Z

Independent second-pass review of a PRISM roadmap milestone envelope JSON. Weighted toward what a completeness reviewer would miss: duplication risk, scope invention, internal inconsistency, doctrine violations. Read the whole file end to end.

FILE: H:/prism/mcp-server/data/milestones/KILO-P2P-RECONCILE-MS0.json

CONTEXT: RGS-generated milestone for the "kilo" slot (print-to-program). PRISM doctrine: NEVER propose building an engine that already exists (cite existing engines instead); NEVER delete superseded envelopes/files (annotate/disable only — `feedback_never_delete_only_disable`); tests must validate real behavior not stubs.

KEY GROUND TRUTH to check the envelope's claims against:
- `mcp-server/src/engines/MillPrintToProgramEngine.ts` IS a real file — a 542-byte explicit stub (returns `{ok:false,stub:true}`, tagged `// WIRE-EXEMPT: U-EFF25 stub`).
- `mcp-server/src/engines/MillingPrintToProgramEngine.ts` IS a real 81K engine — `export class MillingPrintToProgramEngine`, singleton `millingPrintToProgramEngine`, entry method `runFullPipeline(input): MillingProgramResult` at line ~2005.
- `mcp-server/src/tools/dispatchers/millDispatcher.ts` line 126 lazy-imports the STUB for the `program` bucket; line 497 (`mill_print_to_program`) and line 509 (`mill_generate_gcode`) call it via `callOrThrow(getEngine("program"), [...methods], ...)`.

VERIFY:
1. No unit proposes building a NEW engine — this milestone should be wiring/reconciliation/dev-tooling only. Confirm `codebase_audit.no_new_engines` claim holds across all 4 units.
2. U-KP2P-01's spec is internally consistent with the ground truth above (line numbers, method names, engine names). Flag any contradiction.
3. The milestone does NOT delete DOMAIN-PIPELINE-MS0 / PIPE-MS0 / MS-TRAIN-DEEP envelopes — it should reconcile/annotate only. Check U-KP2P-04.
4. U-KP2P-05 does NOT exist (an E2E-harness unit was intentionally dropped to avoid duplicating the existing `PrintToProgramRegressionHarnessEngine` + MS-TRAIN-DEEP
... [+369 chars truncated]

### Assistant | 2026-05-22T17:20:03.446Z

I'll read the envelope file and verify against ground truth.

### Assistant | 2026-05-22T17:20:03.957Z

[tool_use: Read]

### Assistant | 2026-05-22T17:20:04.173Z

[tool_use: Read]

### Assistant | 2026-05-22T17:20:04.690Z

[tool_use: Read]

### Assistant | 2026-05-22T17:20:05.527Z

[tool_use: Read]

### User | 2026-05-22T17:20:21.314Z

[tool_result] 1	// WIRE-EXEMPT: U-EFF25 stub — real engine never existed; millDispatcher pulls it lazily via dynamic import
2	/**
3	 * MillPrintToProgramEngine — stub (U-EFF25).
4	 *
5	 * millDispatcher "program" bucket. Real print-to-program engine never
6	 * existed on any branch; stub satisfies TS2307 until a real one is wired.
7	 */
8	class MillPrintToProgramEngine {
9	  generate(input: Record<string, unkno
... [+174 chars truncated]

### User | 2026-05-22T17:20:21.325Z

[tool_result] 490	        }
491	
492	        switch (action) {
493	          // ============================================================
494	          // PRINT-TO-PROGRAM PIPELINE
495	          // ============================================================
496	          case "mill_print_to_program": {
497	            result = await callOrThrow(await getEngine("program"), ["process", "generate"], params, "M
... [+1133 chars truncated]

### User | 2026-05-22T17:20:21.363Z

[tool_result] 115	    case "toolpath":
116	      return _toolpath ??= (await import("../../engines/ToolpathStrategyEngine.js")).toolpathStrategyEngine;
117	    case "toolsel":
118	      return _toolsel ??= (await import("../../engines/ToolSelectionRecommenderEngine.js")).toolSelectionRecommenderEngine;
119	    case "kinematics":
120	      return _kinematics ??= (await import("../../engines/MillKinematicsCollisi
... [+746 chars truncated]

### User | 2026-05-22T17:20:21.808Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "id": "KILO-P2P-RECONCILE-MS0",
4	  "version": "1.0.0",
5	  "title": "Kilo Print-to-Program Reconcile & Gap-Closure",
6	  "brief": "The kilo (print-to-program) slot queue surfaced 138 units that are not autonomous-loop-buildable: DOMAIN-PIPELINE-MS0 print2prog stages carry spec='pending-generator' (no real spec), FEATURE-GAP-AUDIT-MS0 U-GAP-P2P-* units are adv
... [+19005 chars truncated]

### Assistant | 2026-05-22T17:20:35.886Z

Verified against ground truth. All four file reads confirm the envelope's claims.

**Findings:**

**P1 — U-KP2P-01 spec line-number contradiction with ground truth (millDispatcher.ts:497).** The unit summary says line 497 "therefore return {stub:true} or throw method-not-found." Ground truth: line 497 calls `callOrThrow(getEngine("program"), ["process","generate"], ...)`. The stub class exports only `generate(input)` — so line 497 today does NOT throw; it successfully resolves `generate` and returns `{ok:false,stub:true,input}`. Only line 509 (`generateGcode`) throws method-not-found (the stub has no `generateGcode`). The spec's "return {stub:true} OR throw" is accurate as a disjunction, but the per-line attribution is sloppy. More material: spec step 2 instructs "extend the callOrThrow method list to include the real entry method... keep process/generate as fallbacks." `MillingPrintToProgramEngine` has NO `generate` method (entry is `runFullPipeline`); leaving `generate` in the list is harmless (callOrThrow falls through) but the instruction to "keep" it as a fallback implies it exists on the real engine — it does not. Minor, but the builder should be told the real method list is `["runFullPipeline"]`, full stop. Not a blocker — acceptance criterion 3 forces a real round-trip assertion that would catch a wrong method name.

**Non-findings confirmed (no P0/P1):**
1. `no_new_engines` holds — all 4 units are rewire/audit/picker-fix/reconcile. Zero engine-creation language. PASS.
2. U-KP2P-04 explicitly preserves PIPE-MS0 / DOMAIN-PIPELINE-MS0 envelopes (note pointers, not deletion); `supersedes_note` and acceptance criterion 3 reinforce `feedback_never_delete_only_disable`. PASS.
3. No U-KP2P-05. The brief explicitly states E2E functional-equivalence is "intentionally OUT OF SCOPE... owned by the existing PrintToProgramRegressionHarnessEngine.ts + ... MS-TRAIN-DEEP U-TRAIN-P2P-04/05." Duplication correctly avoided and explained. PASS.
4. `track:KILO-P2P`, `domain:prin
... [+629 chars truncated]

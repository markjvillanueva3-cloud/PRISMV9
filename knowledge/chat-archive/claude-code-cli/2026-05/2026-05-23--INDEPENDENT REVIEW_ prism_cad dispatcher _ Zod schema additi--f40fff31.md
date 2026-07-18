---
type: "chat-session"
source: "claude-code-cli"
session_id: "f40fff31-cb37-49ea-9b03-5d4d750b18f3"
title: "INDEPENDENT REVIEW: prism_cad dispatcher + Zod schema additions for CADTransacti"
date: "2026-05-23"
first_ts: "2026-05-23T01:25:21.161Z"
last_ts: "2026-05-23T01:36:46.320Z"
cwd: "H:\\prism\\mcp-server"
messages: 33
user_msgs: 15
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-adf3e5f94bfe5dc8f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# INDEPENDENT REVIEW: prism_cad dispatcher + Zod schema additions for CADTransacti

> **claude-code-cli** | 2026-05-23 | 33 msgs (15 user / 18 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-adf3e5f94bfe5dc8f.jsonl`

## Transcript

### User | 2026-05-23T01:25:21.161Z

INDEPENDENT REVIEW: prism_cad dispatcher + Zod schema additions for CADTransactionEngine (U-AI-08).

DO NOT trust a prior reviewer caught everything — fresh independent pass weighted toward integration risks the wiring-specialist may miss.

Files to read FULLY:
1. H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts (enum at ~line 472, case cluster at ~line 4986)
2. H:/prism/mcp-server/src/schemas/cadActionSchemas.ts (new schemas after ~line 1611)
3. H:/prism/mcp-server/src/engines/CADTransactionEngine.ts (engine being wired)
4. H:/prism/mcp-server/src/engines/CADWorldModelEngine.ts (downstream dependency — confirm contract)

8 new actions wired. Per-file scrutiny on the engine + test files already PASSED both reviewers with P1 fixes applied (defensive baseline copy, applyAll restoredState=baseline, computeDiff delegates to CADWorldModelEngine.diff, tightened test assertions). 60 tests pass. tsc clean on my code (2 pre-existing peer errors at lines 3188 + 4606 unrelated to this commit).

WEIGHTED FOCUS — flag P0/P1:
- **Cross-tenant isolation hole:** cad_txn_apply_all + cad_txn_list operate on the singleton cadTransactionEngine which is shared across every Claude chat in the fleet. Is there ANY way for chat A's transaction to be visible / committable / rollback-able by chat B via these actions? Compare to how cad_trace_from_tracer added a tenantId filter.
- **DoS / resource exhaustion:** cad_txn_apply_all accepts an unbounded `ops` array — could a malicious caller submit a 1M-op array and exhaust memory? Should there be a cap parallel to cad_trace_from_tracer's maxTraces?
- **cad_txn_reset is destructive across the fleet** — it drops every txn including peer-chat in-flight transactions. The dispatcher gates it behind no flag. Should it require an explicit confirmation parameter?
- **Schema-engine mismatch hazards:** schema uses z.number().finite() on op.value but engine accepts via op.value: z.number().finite().optional(). What if the engine then receives a va
... [+1487 chars truncated]

### Assistant | 2026-05-23T01:25:44.719Z

I'll perform an independent review of the prism_cad dispatcher and Zod schema additions for U-AI-08, weighted toward integration risks.

### Assistant | 2026-05-23T01:25:46.286Z

[tool_use: Read]

### Assistant | 2026-05-23T01:25:47.318Z

[tool_use: Read]

### Assistant | 2026-05-23T01:25:47.588Z

[tool_use: Read]

### User | 2026-05-23T01:26:00.981Z

[tool_result] 460	  "cad_fallback_reset",            // clear the CAD app routing registry
461	  // CAD-COMPLETE-MS0/U-AI-02 — CADWorldModelEngine (CAD agent's document belief-state)
462	  "cad_world_apply_op",            // apply one operation to a document's world model
463	  "cad_world_state",               // current believed state of a document
464	  "cad_world_checkpoint",          // save the document's 
... [+2569 chars truncated]

### User | 2026-05-23T01:26:00.992Z

[tool_result] 4970	                    totalTraceCount: assembled.traceCount,
4971	                    fromTracer: true,
4972	                    otelSpanCount: otelSpans.length,
4973	                    totalOtelSpanCount: totalOtelSpans,
4974	                    tenantFilterApplied: tenantApplied,
4975	                    truncated,
4976	                    maxTraces,
4977	                  },
4978	          
... [+6210 chars truncated]

### User | 2026-05-23T01:26:01.040Z

[tool_result] 1	/**
2	 * CADTransactionEngine — CAD-COMPLETE-MS0 / U-AI-08
3	 * ==================================================
4	 *
5	 * Atomic transaction wrapper over `CADWorldModelEngine`. Composes the
6	 * world-model's `getOrCreate()` + `applyOp()` + `restore()` primitives
7	 * into ACID-style begin / apply / commit / rollback semantics so the CAD
8	 * agent can group multiple operations into a single,
... [+20027 chars truncated]

### Assistant | 2026-05-23T01:26:15.513Z

[tool_use: Read]

### Assistant | 2026-05-23T01:26:16.393Z

[tool_use: Bash]

### User | 2026-05-23T01:26:48.790Z

[tool_result] 1590	    traceId: z
1591	      .string()
1592	      .optional()
1593	      .describe(
1594	        "Optional trace id to filter the live OpenTelemetryTracingEngine output to one trace; omit to assemble every completed trace",
1595	      ),
1596	    tenantId: z
1597	      .string()
1598	      .min(1)
1599	      .optional()
1600	      .describe(
1601	        "Optional tenant id — when set, only OTel
... [+10687 chars truncated]

### User | 2026-05-23T01:28:13.717Z

[tool_result] 1811

### Assistant | 2026-05-23T01:28:23.001Z

[tool_use: Bash]

### Assistant | 2026-05-23T01:28:25.063Z

[tool_use: Bash]

### Assistant | 2026-05-23T01:28:25.950Z

[tool_use: Read]

### User | 2026-05-23T01:28:51.463Z

[tool_result] 488	  server.tool(
489	    "prism_cad",
490	    `CAD/Geometry dispatcher — geometry operations, meshing, feature recognition, stock modeling, WCS setup, DfM checking.
491	Actions: ${ACTIONS.join(", ")}.
492	Params vary by action — pass relevant fields in params object.`,
493	    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
494	    async ({ action, params: rawParam
... [+1134 chars truncated]

### User | 2026-05-23T01:30:29.858Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
6 matches in 4 files:

4840:0:
4886:0:{
4896:0:{
src/tools/dispatchers/cadDispatcher.ts:462:"cad_world_apply_op",            // apply one operation to a document's world...
src/tools/dispatchers/cadDispatcher.ts:467:"cad_world_reset",               // reset one document (or all) to a fresh em...
src/to
... [+76 chars truncated]

### User | 2026-05-23T01:30:30.221Z

[tool_result] 1
---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'validate.*params\|safeParse\|z.parse'
---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
1 matches in 1 files:

493:0:z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },

### Assistant | 2026-05-23T01:30:38.592Z

Good — Zod IS enforced at the MCP edge via `validateActionParams(action, params, ACTION_CAD_SCHEMAS)` at line 505. Schema validation is real. Now let me cross-check the trace_from_tracer sibling for tenant filtering + cap precedent, and verify enum/case alignment + the pre-existing tsc lines.

### Assistant | 2026-05-23T01:30:40.325Z

[tool_use: Read]

### Assistant | 2026-05-23T01:30:42.933Z

[tool_use: Bash]

### Assistant | 2026-05-23T01:30:44.049Z

[tool_use: Bash]

### Assistant | 2026-05-23T01:30:44.996Z

[tool_use: Read]

### User | 2026-05-23T01:30:57.869Z

[tool_result] 4880	                );
4881	              }
4882	              result = { success: true, data: cadWorldModelEngine.detectDrift(docId, observed) };
4883	            }
4884	            break;
4885	          }
4886	          case "cad_world_reset": {
4887	            const { cadWorldModelEngine } = await import("../../engines/CADWorldModelEngine.js");
4888	            const docId = params.doc_id ?? 
... [+5025 chars truncated]

### User | 2026-05-23T01:31:39.158Z

[tool_result] 447
---enum-count---
278
---txn-cases---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
8 matches in 8 files:

4989:0:
4990:0:
4991:0:
4992:0:
4993:0:
4994:0:
4995:0:
4996:0:{

### User | 2026-05-23T01:33:48.627Z

[tool_result] src/tools/dispatchers/cadDispatcher.ts(3188,90): error TS2344: Type '((confidenceTier: "operator_verified" | "ensemble_consensus" | "single_backend") => Promise<LoRATrainingPair[]>) | undefined' does not satisfy the constraint '(...args: any) => any'.
src/tools/dispatchers/cadDispatcher.ts(4606,96): error TS2345: Argument of type 'Record<string, any>' is not assignable to parameter of type 'DrawAn
... [+12 chars truncated]

### User | 2026-05-23T01:34:08.985Z

[tool_result] 1	/**
2	 * CADWorldModelEngine — CAD-COMPLETE-MS0 / U-AI-02
3	 * =================================================
4	 *
5	 * The CAD agent's belief-state of a live CAD document. The agent cannot
6	 * see the CAD application's document tree directly between calls, so it
7	 * keeps a world model: the bodies, sketches, features, parameters,
8	 * selection and active units it *believes* the document c
... [+2763 chars truncated]

### Assistant | 2026-05-23T01:34:23.074Z

Pre-existing tsc errors confirmed at lines 3188 + 4606 — both unrelated to U-AI-08 insertion zone (4983-5086). Enum count 278 is total dispatcher actions (not just txn).

Let me verify the exact 8-txn enum entries match 8 case clauses character-by-character, and check the world model's `restore()` contract for the deep-copy interaction.

### Assistant | 2026-05-23T01:34:25.098Z

[tool_use: Bash]

### Assistant | 2026-05-23T01:34:25.858Z

[tool_use: Bash]

### User | 2026-05-23T01:35:23.766Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
6 matches in 4 files:

163:0:string, units: CADUnits = "mm"): CADWorldState {
319:0:string, state: CADWorldState): CADWorldState {
322:0:restore requires a valid CADWorldState");
src/engines/CADWorldModelEngine.ts:217:let state = this.getOrCreate(docId);
src/engines/CADWorldModelEngine.ts:325:// restor
... [+178 chars truncated]

### User | 2026-05-23T01:35:35.313Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
8 matches in 1 files:

src/tools/dispatchers/cadDispatcher.ts:473:"cad_txn_begin",                 // open a transaction for a docId; snapshots...
src/tools/dispatchers/cadDispatcher.ts:474:"cad_txn_apply",                 // apply one op inside the txn; throws + aut...
src/tools/dispatchers/cadDispatc
... [+908 chars truncated]

### Assistant | 2026-05-23T01:36:46.320Z

Confirmed: 8 enum entries match 8 case clauses character-by-character (`cad_txn_begin/apply/commit/rollback/status/list/apply_all/reset`). Now I have enough — let me deliver the verdict.

---

## INDEPENDENT REVIEW — U-AI-08 prism_cad wiring + cadActionSchemas

**Files reviewed in full:**
- H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts (lines 472-481, 4983-5086, plus framing at 488-513, 4886-4980)
- H:/prism/mcp-server/src/schemas/cadActionSchemas.ts (lines 1611-1678)
- H:/prism/mcp-server/src/engines/CADTransactionEngine.ts (full, 514 lines)
- H:/prism/mcp-server/src/engines/CADWorldModelEngine.ts (1-80 + restore/getOrCreate refs)

## VERDICT: **FAIL** (P0 — cross-tenant isolation hole)

Per-file scrutiny on the engine passed. The wiring layer ships material gaps the sibling `cad_trace_from_tracer` already accounts for.

---

### P0 — Cross-tenant isolation hole (cad_txn_list, cad_txn_apply_all, cad_txn_reset)
**File:** H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts:5051-5083
**Engine:** H:/prism/mcp-server/src/engines/CADTransactionEngine.ts:332-346, 174-187, 421-424

`cadTransactionEngine` is a module-level process singleton (engine line 513: `export const cadTransactionEngine = new CADTransactionEngine();`). The fleet runs up to 26 concurrent Claude chats sharing this MCP server. Three actions leak / mutate cross-tenant state:

1. **`cad_txn_list` (5051-5055)** — `list(filter?)` iterates `this.txns.values()` across the whole registry. Any chat can enumerate every other chat's pending+terminal transactions including `txnId`, `docId`, `state`, `startedAt`, `endedAt`, `errorCount`, `opsApplied`. The sibling `cad_trace_from_tracer` (4929-4938) explicitly admits a `tenant_id` filter against `prism.tenant_id` to prevent exactly this; the txn engine has no such notion.
2. **`cad_txn_apply_all` / `cad_txn_begin` / `cad_txn_apply` / `cad_txn_commit` / `cad_txn_rollback`** — any chat with a `txnId` returned to another chat can drive its lifecycle.
... [+8426 chars truncated]

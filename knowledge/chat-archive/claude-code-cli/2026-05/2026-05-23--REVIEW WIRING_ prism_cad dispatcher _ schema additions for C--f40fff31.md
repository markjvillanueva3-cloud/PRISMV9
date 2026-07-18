---
type: "chat-session"
source: "claude-code-cli"
session_id: "f40fff31-cb37-49ea-9b03-5d4d750b18f3"
title: "REVIEW WIRING: prism_cad dispatcher + schema additions for CADTransactionEngine "
date: "2026-05-23"
first_ts: "2026-05-23T01:25:21.169Z"
last_ts: "2026-05-23T01:29:51.744Z"
cwd: "H:\\prism\\mcp-server"
messages: 35
user_msgs: 15
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-a810814d369e00b8f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# REVIEW WIRING: prism_cad dispatcher + schema additions for CADTransactionEngine 

> **claude-code-cli** | 2026-05-23 | 35 msgs (15 user / 20 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-a810814d369e00b8f.jsonl`

## Transcript

### User | 2026-05-23T01:25:21.169Z

REVIEW WIRING: prism_cad dispatcher + schema additions for CADTransactionEngine (CAD-COMPLETE-MS0 / U-AI-08).

Files:
1. H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts — read enum (~line 472) AND case cluster (~line 4986)
2. H:/prism/mcp-server/src/schemas/cadActionSchemas.ts — read new schemas (~line 1612)
3. H:/prism/mcp-server/src/engines/CADTransactionEngine.ts — the engine the dispatcher consumes

8 new actions: cad_txn_begin, cad_txn_apply, cad_txn_commit, cad_txn_rollback, cad_txn_status, cad_txn_list, cad_txn_apply_all, cad_txn_reset. Both enum entries AND case-cluster handler MUST exist; both pre-shift dispatcher-test action-count (count must not decrease).

REVIEW CHECKLIST — flag P0/P1:
- **Enum-to-case completeness:** every entry in the const ACTIONS enum has a matching `case "..."` in the switch; vice versa no orphan case. Count the 8 entries against the 8 case clauses.
- **Schema-to-action completeness:** every new action has a corresponding Zod schema entry in cadActionSchemas.ts.
- **Snake_case param normalisation:** dispatcher accepts both `txn_id`/`txnId` and `doc_id`/`docId` BEFORE Zod validation (per the H1-MS2 normaliser pattern already used by cad_world_* actions). Verify each input branch.
- **Engine API match:** does each case actually call the engine method with the right signature? Read CADTransactionEngine.ts to confirm `begin(docId, units)`, `apply(txnId, op)`, `commit(txnId)`, `rollback(txnId)`, `status(txnId)`, `list(docId?)`, `applyAll(docId, ops, units)`, `reset()`.
- **Tenant / docId leak:** cad_txn_apply_all and cad_txn_list could be cross-tenant leaks if there's no isolation. Is there one? Should there be?
- **maxTraces / bounded payloads:** cad_txn_list returns the entire txn registry — should it be capped like cad_trace_from_tracer is? What's the realistic upper bound?
- **Schema strictness:** schemas use .min(1) on ids (good). Are there any optional fields the engine treats as required (or vice versa) that would caus
... [+716 chars truncated]

### Assistant | 2026-05-23T01:25:40.787Z

I'll systematically read all three files to perform the wiring review.

### Assistant | 2026-05-23T01:25:41.620Z

[tool_use: Read]

### Assistant | 2026-05-23T01:25:42.061Z

[tool_use: Read]

### User | 2026-05-23T01:25:55.149Z

[tool_result] 1600	      .describe(
1601	        "Optional tenant id — when set, only OTel spans tagged with this prism.tenant_id are admitted. PRIVILEGED: omitting in a multi-tenant deployment reads the global completed-span buffer.",
1602	      ),
1603	    maxTraces: z
1604	      .number()
1605	      .int()
1606	      .min(1)
1607	      .optional()
1608	      .describe(
1609	        "Cap on traces returned wh
... [+6557 chars truncated]

### User | 2026-05-23T01:25:55.154Z

[tool_result] 460	  "cad_fallback_reset",            // clear the CAD app routing registry
461	  // CAD-COMPLETE-MS0/U-AI-02 — CADWorldModelEngine (CAD agent's document belief-state)
462	  "cad_world_apply_op",            // apply one operation to a document's world model
463	  "cad_world_state",               // current believed state of a document
464	  "cad_world_checkpoint",          // save the document's 
... [+3462 chars truncated]

### Assistant | 2026-05-23T01:26:05.070Z

Now let me read the case cluster for the 8 new actions and the engine file.

### Assistant | 2026-05-23T01:26:05.888Z

[tool_use: Read]

### Assistant | 2026-05-23T01:26:06.455Z

[tool_use: Read]

### User | 2026-05-23T01:26:31.099Z

[tool_result] 1	/**
2	 * CADTransactionEngine — CAD-COMPLETE-MS0 / U-AI-08
3	 * ==================================================
4	 *
5	 * Atomic transaction wrapper over `CADWorldModelEngine`. Composes the
6	 * world-model's `getOrCreate()` + `applyOp()` + `restore()` primitives
7	 * into ACID-style begin / apply / commit / rollback semantics so the CAD
8	 * agent can group multiple operations into a single,
... [+20027 chars truncated]

### User | 2026-05-23T01:26:34.385Z

[tool_result] 4980	            }
4981	            break;
4982	          }
4983	          // CAD-COMPLETE-MS0/U-AI-08 — CADTransactionEngine
4984	          // Atomic begin/apply/commit/rollback over CADWorldModelEngine. Lazy
4985	          // import so the singleton + its 2 internal maps only initialise when
4986	          // someone actually opens a transaction. Snake_case aliases for every
4987	          // id
... [+5780 chars truncated]

### Assistant | 2026-05-23T01:26:43.646Z

Now let me verify the normalizer pattern handles both `txn_id`/`txnId` and `doc_id`/`docId`, and check the export barrel and the schema registration.

### Assistant | 2026-05-23T01:26:44.918Z

[tool_use: Grep]

### Assistant | 2026-05-23T01:26:45.744Z

[tool_use: Grep]

### Assistant | 2026-05-23T01:26:46.326Z

[tool_use: Grep]

### User | 2026-05-23T01:27:09.107Z

[tool_result] No matches found

### User | 2026-05-23T01:27:09.202Z

[tool_result] 1617:  cad_txn_begin: z.object({
1624:  cad_txn_apply: z.object({
1625:    txnId: z.string().min(1).describe("Transaction id returned by cad_txn_begin"),
1643:  cad_txn_commit: z.object({
1646:  cad_txn_rollback: z.object({
1649:  cad_txn_status: z.object({
1652:  cad_txn_list: z.object({
1659:  cad_txn_apply_all: z.object({
1678:  cad_txn_reset: z.object({}).describe("Drop every transaction + rel
... [+44 chars truncated]

### User | 2026-05-23T01:27:10.276Z

[tool_result] No matches found

### Assistant | 2026-05-23T01:27:12.679Z

[tool_use: Read]

### Assistant | 2026-05-23T01:27:13.329Z

[tool_use: Grep]

### User | 2026-05-23T01:27:26.385Z

[tool_result] 1	/**
2	 * PRISM Param Normalizer
3	 * ======================
4	 * Normalizes snake_case params to camelCase for safety/calc/thread dispatchers.
5	 * Applied at dispatcher entry before handler functions.
6	 * 
7	 * @version 1.0.0 — H1-MS2
8	 */
9	
10	/** Snake→camel alias map for manufacturing parameters */
11	const PARAM_ALIASES: Record<string, string> = {
12	  // Geometry
13	  tool_diameter: "to
... [+5952 chars truncated]

### User | 2026-05-23T01:27:27.972Z

[tool_result] No matches found

### Assistant | 2026-05-23T01:27:33.807Z

Now let me check the engines barrel file directly, look for cad_world_reset for comparison on the foot-gun pattern, and verify the schema registration in the dispatcher.

### Assistant | 2026-05-23T01:27:35.006Z

[tool_use: Grep]

### Assistant | 2026-05-23T01:27:36.187Z

[tool_use: Grep]

### Assistant | 2026-05-23T01:27:37.321Z

[tool_use: Grep]

### User | 2026-05-23T01:27:55.886Z

[tool_result] 459-  "cad_fallback_list",             // list registered CAD apps, ranked by priority
460-  "cad_fallback_reset",            // clear the CAD app routing registry
461-  // CAD-COMPLETE-MS0/U-AI-02 — CADWorldModelEngine (CAD agent's document belief-state)
462-  "cad_world_apply_op",            // apply one operation to a document's world model
463-  "cad_world_state",               // current beli
... [+2201 chars truncated]

### User | 2026-05-23T01:27:56.079Z

[tool_result] 1251- * Maps action name to Zod schema for validation.
1252- */
1253:export const ACTION_CAD_SCHEMAS: Record<string, z.ZodType<any>> = {
1254-  // U-PPL-D4 (echo) — sibling program-equivalent-index.json producer
1255-  program_equivalent_index_compose: programEquivalentIndexComposeSchema,
--
1615-  // engine's internal checks (docId / txnId .min(1)) — caller-supplied ids
1616-  // must be non-empt
... [+1096 chars truncated]

### User | 2026-05-23T01:27:56.108Z

[tool_result] No matches found

### Assistant | 2026-05-23T01:28:00.606Z

I now have everything needed. Let me also spot-check the `cad_txn_begin` schema field name against what the dispatcher reads, since the schema uses `docId` but the dispatcher reads both `params.doc_id` and `params.docId` before Zod validation.

### Assistant | 2026-05-23T01:28:01.819Z

[tool_use: Read]

### Assistant | 2026-05-23T01:28:06.243Z

[tool_use: Grep]

### User | 2026-05-23T01:28:19.911Z

[tool_result] 494	    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
495	      log.info(`[prism_cad] Action: ${action}`);
496	      let result: any;
497	      try {
498	        // H1-MS2: Auto-normalize snake_case → camelCase params
499	        let params = rawParams;
500	        try {
501	          const { normalizeParams } = await import("../.
... [+447 chars truncated]

### User | 2026-05-23T01:28:21.493Z

[tool_result] 14-import { z } from "zod";
15-import { log } from "../../utils/Logger.js";
16-import { slimResponse } from "../../utils/responseSlimmer.js";
17:import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
18-import { ACTION_CAD_SCHEMAS } from "../../schemas/cadActionSchemas.js";
19-
20-let _cad: any, _geometry: any, _mesh: any, _feature: any, _stock: any, _wcs: any
... [+497 chars truncated]

### Assistant | 2026-05-23T01:29:51.744Z

I have everything needed for a complete analysis. Here is the full wiring review.

---

## Dispatcher Wiring Review — CADTransactionEngine (CAD-COMPLETE-MS0 / U-AI-08)

---

### Enum-to-Case Completeness

All 8 enum entries are present at lines 473–480 of `H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts`.

All 8 case labels are present at lines 4989–4996, sharing a single `{ ... }` block with if/else-if/else branching that routes each action individually, terminated by `break` at line 5085.

No orphan cases exist. No enum entries are missing a case path.

Count: 8 enum entries, 8 case labels. PASS.

---

### Schema-to-Action Completeness

All 8 actions have corresponding Zod schema entries in `ACTION_CAD_SCHEMAS` starting at line 1253 of `H:/prism/mcp-server/src/schemas/cadActionSchemas.ts`:

- `cad_txn_begin` — line 1617
- `cad_txn_apply` — line 1624
- `cad_txn_commit` — line 1643
- `cad_txn_rollback` — line 1646
- `cad_txn_status` — line 1649
- `cad_txn_list` — line 1652
- `cad_txn_apply_all` — line 1659
- `cad_txn_reset` — line 1678

PASS.

---

### P0/P1 Findings

**P1 — Snake_case normalizer does NOT cover `txn_id` or `doc_id`**

Severity: P1

The dispatcher reads both aliases manually at lines 4998–4999:

```
const rawTxnId = params.txn_id ?? params.txnId;
const rawDocId = params.doc_id ?? params.docId;
```

This manual alias read happens AFTER `validateActionParams()` at line 505 runs the Zod schema against the already-normalizer-processed `params`. The normalizer (`paramNormalizer.ts`) has no entries for `txn_id` → `txnId` or `doc_id` → `docId` in its `PARAM_ALIASES` map. The normalizer only runs the pre-registered alias table — it cannot produce `txnId` or `docId` from their snake_case forms.

The consequence: if a caller sends `{ txn_id: "txn-1" }`, the Zod schema for e.g. `cad_txn_apply` requires `txnId: z.string().min(1)` — validation runs against the normalizer-processed params object which still has only `txn_id` (not `txnId`), so `validateA
... [+12541 chars truncated]

---
type: "chat-session"
source: "claude-code-cli"
session_id: "2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde"
title: "Review a dispatcher-wiring changeset that wires CohortBridgeShimEngine into the "
date: "2026-06-15"
first_ts: "2026-06-15T14:57:11.028Z"
last_ts: "2026-06-15T14:59:32.876Z"
cwd: "H:\\prism-slot-papa"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-af8be32bbda6d1319.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:06"
---

# Review a dispatcher-wiring changeset that wires CohortBridgeShimEngine into the 

> **claude-code-cli** | 2026-06-15 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism-slot-papa
> Raw: `H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-af8be32bbda6d1319.jsonl`

## Transcript

### User | 2026-06-15T14:57:11.028Z

Review a dispatcher-wiring changeset that wires CohortBridgeShimEngine into the prism_dev dispatcher (PRISM, slot:papa, unit U-WIRE-COHORTSHIM). Read these files END-TO-END (ABSOLUTE paths — the repo lives at H:/prism, NOT the cwd):

1. ENGINE (source of truth for the API): H:/prism/mcp-server/src/engines/CohortBridgeShimEngine.ts
   - Exports singleton `cohortBridgeShimEngine` with 4 methods: applyNodeNextSuffix(spec, opts?), rewriteSourceImports(source), buildShapeCoerceShim(fromShape,toShape,methodMap), recommendShimsForTopBridges(topK?, matrixPath?).
2. DISPATCHER: H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts
   - ACTIONS list: 4 new entries near the `] as const;` after `erp_field_mappings` (search "cohort_shim").
   - switch cases: 4 new `case "cohort_shim_*"` blocks before `default:` (search "U-WIRE-COHORTSHIM").
3. SCHEMAS: H:/prism/mcp-server/src/schemas/devActionSchemas.ts
   - 4 new Zod entries in ACTION_DEV_SCHEMAS (search "cohort_shim").

VERIFY (grade each, then overall PASS/FAIL):
- WIRING TRIPLE-MATCH: every action name appears in ALL THREE places (ACTIONS list, ACTION_DEV_SCHEMAS, switch case) with byte-identical spelling. List any name present in one but missing in another (that is a P0 orphan/dead-action).
- CALL CORRECTNESS: each switch case calls the correct engine method with params matching the Zod schema field names AND the engine's parameter order/types. e.g. cohort_shim_build_shape_coerce must pass (fromShape, toShape, methodMap) in that order. Flag any mismatch P0.
- RESULT HANDLING: result is returned via the dispatcher's slimResponse wrap (bottom of the switch) and errors via dispatcherError. recommendShimsForTopBridges returns an ARRAY and reads a file (throws on missing matrix) — confirm the throw is caught by the try/catch -> dispatcherError (fail-loud, not silent). Flag if any case swallows errors or returns a stub.
- SCHEMA SANITY: schemas use z.record(z.string(), z.string()) (2-arg, zod-v4 correct) for methodMap; requi
... [+414 chars truncated]

### Assistant | 2026-06-15T14:57:16.176Z

I'll read all three files end-to-end before forming any conclusions.

### Assistant | 2026-06-15T14:57:16.585Z

[tool_use: Read]

### Assistant | 2026-06-15T14:57:16.739Z

[tool_use: Read]

### User | 2026-06-15T14:57:17.577Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CohortBridgeShimEngine.ts' was already read 9m ago in this session and is unchanged (mtime 1779681908009). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CAC
... [+5 chars truncated]

### User | 2026-06-15T14:57:34.524Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-893 of 4344 total (103298 tokens, cap 25000). Call Read with offset=894 limit=893 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * Dev Action Schemas - Zod schemas for prism_dev dispatcher actions
3	 */
4	import { z } from "zo
... [+56309 chars truncated]

### Assistant | 2026-06-15T14:57:38.505Z

I need to read the engine file (from cache context), then the dispatcher, and the remaining schema sections. Let me get the dispatcher and the rest of the schema file now.

### Assistant | 2026-06-15T14:57:39.124Z

[tool_use: Read]

### Assistant | 2026-06-15T14:57:39.945Z

[tool_use: Grep]

### User | 2026-06-15T14:57:43.566Z

[tool_result] 893	  // result row asynchronously. Read modes (pending/results/stats/available) are
894	  // pure projections over the two JSONLs; write modes (enqueue/purge) mutate.
895	  async_dispatch: z.object({
896	    mode: z.enum([
897	      "enqueue", "pending", "results", "stats", "available", "purge",
898	    ]).default("pending").describe(
899	      "enqueue = append a job + spawn the detached runner;
... [+14943 chars truncated]

### User | 2026-06-15T14:57:43.749Z

[tool_result] 676-  "erp_list_work_orders",
677-  "erp_validate_work_order",
678-  "erp_field_mappings",
679-  \ U-WIRE-COHORTSHIM \ WIRE-UNWIRED-PAPA: CohortBridgeShimEngine NodeNext/shape-coerce shim primitives (4 actions; applyNodeNextSuffix/rewriteSourceImports/buildShapeCoerceShim pure, recommend reads COHORT-COMPAT-MATRIX). slot:papa 2026-06-15.
680:  "cohort_shim_nodenext_suffix",
681:  "cohort_shim_rewr
... [+2487 chars truncated]

### Assistant | 2026-06-15T14:57:49.794Z

I need to see the rest of the dispatcher case (the recommend_bridges case is cut off) and verify the result handling pattern and try/catch structure.

### Assistant | 2026-06-15T14:57:50.909Z

[tool_use: Grep]

### Assistant | 2026-06-15T14:57:52.219Z

[tool_use: Grep]

### User | 2026-06-15T14:57:59.757Z

[tool_result] 668-  \ U-WIRE-FORMAL \ WIRE-UNWIRED-PAPA: FormalVerificationEngine (Z3 SAT/SMT) compute surfaces (3 actions, slot:papa 2026-06-13).
669-  "formal_prove",
670-  "formal_satisfy",
671-  "formal_ready",
672-  \ U-WIRE-ERP-IMPORT \ WIRE-UNWIRED-PAPA: ERPImportEngine work-order import surfaces (6 actions, slot:papa 2026-06-14).
673-  "erp_import_work_order",
674-  "erp_import_batch",
675-  "erp_get_wo
... [+3734 chars truncated]

### User | 2026-06-15T14:57:59.789Z

[tool_result] 7-import * as fs from "fs";
8-import * as path from "path";
9-import { execSync, execFileSync } from "child_process";
10:import { slimResponse } from "../../utils/responseSlimmer.js";
11-import { safeRegex } from "../../utils/SafetyValidator.js";
12:import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
13-import { ACTION_DEV_SCHEMAS } from "../../schemas/devA
... [+2203 chars truncated]

### Assistant | 2026-06-15T14:58:04.753Z

Now I need to read the engine file directly since the read-cache guard indicates it was read 9 minutes ago. Let me get it via grep to verify the method signatures.

### Assistant | 2026-06-15T14:58:07.063Z

[tool_use: Grep]

### User | 2026-06-15T14:58:08.332Z

[tool_result] 43-}
44-
45-export interface NodeNextShimSpec {
46-  kind: "nodenext-path";
47-  description: string;
48:  rewriteHelper: "applyNodeNextSuffix";
49-  mustHumanVerify: true;
50-}
51-
52-export interface CohortBridgeSpec {
53-  fromCohort: string;
--
70- *   - bare specifiers (no `./` or `../`) are left alone (package imports)
71- *   - directory imports (`./dir`) become `./dir/index.js` only if the
... [+3509 chars truncated]

### Assistant | 2026-06-15T14:58:08.702Z

[tool_use: Grep]

### User | 2026-06-15T14:58:09.978Z

[tool_result] 672-  \ U-WIRE-ERP-IMPORT \ WIRE-UNWIRED-PAPA: ERPImportEngine work-order import surfaces (6 actions, slot:papa 2026-06-14).
673:  "erp_import_work_order",
674:  "erp_import_batch",
675:  "erp_get_work_order",
676:  "erp_list_work_orders",
677:  "erp_validate_work_order",
678:  "erp_field_mappings",
679-  \ U-WIRE-COHORTSHIM \ WIRE-UNWIRED-PAPA: CohortBridgeShimEngine NodeNext/shape-coerce shim pr
... [+1158 chars truncated]

### Assistant | 2026-06-15T14:58:16.371Z

Now I need to verify the `erp_field_mappings` case in the switch to confirm it was not disturbed, and check the `recommendShimsForTopBridges` throw path more carefully.

### Assistant | 2026-06-15T14:58:18.471Z

[tool_use: Grep]

### Assistant | 2026-06-15T14:58:20.593Z

[tool_use: Grep]

### User | 2026-06-15T14:58:24.207Z

[tool_result] 673-  "erp_import_work_order",
674-  "erp_import_batch",
675-  "erp_get_work_order",
676-  "erp_list_work_orders",
677-  "erp_validate_work_order",
678:  "erp_field_mappings",
679-  \ U-WIRE-COHORTSHIM \ WIRE-UNWIRED-PAPA: CohortBridgeShimEngine NodeNext/shape-coerce shim primitives (4 actions; applyNodeNextSuffix/rewriteSourceImports/buildShapeCoerceShim pure, recommend reads COHORT-COMPAT-MATRIX
... [+904 chars truncated]

### User | 2026-06-15T14:58:24.288Z

[tool_result] 58-  mustHumanVerify: true;
59-}
60-
61:const COHORT_MATRIX_PATH_DEFAULT =
62-  "H:/prism/state/shared/specs/COHORT-COMPAT-MATRIX.json";
63-
64-/**
--
101-  rewrites: NodeNextRewriteResult[];
102-} {
103-  if (typeof source !== "string") {
104:    throw new TypeError("rewriteSourceImports: source must be a string");
105-  }
106-  // Match `import ... from "X"` and `import("X")` and `export ... fro
... [+1209 chars truncated]

### Assistant | 2026-06-15T14:58:27.651Z

I now have all the information needed. Let me also verify one final detail — that the `recommendShimsForTopBridges` case result is not awaited (the function is synchronous, not async) and check the `methodMap` schema type precisely.

### Assistant | 2026-06-15T14:58:29.235Z

[tool_use: Grep]

### Assistant | 2026-06-15T14:58:30.213Z

[tool_use: Grep]

### User | 2026-06-15T14:58:36.020Z

[tool_result] 77-const _formalLinearConstraint = z.object({
78:  terms: z.record(z.string(), z.number()),
79-  op: z.enum(["<=", ">=", "="]),
--
137-  loki_query: z.object({
138:    labels: z.record(z.string(), z.string()).optional(),
139-    levelMin: z.enum(["debug", "info", "warn", "error", "fatal"]).optional(),
--
191-    toShape: z.string().min(1).describe("Target API shape name (e.g. 'calculate')"),
192: 
... [+751 chars truncated]

### User | 2026-06-15T14:58:36.150Z

[tool_result] No matches found

### Assistant | 2026-06-15T14:59:32.876Z

I have all the evidence I need. Here is the complete wiring review.

---

## Dispatcher Wiring Review — U-WIRE-COHORTSHIM

**Engine:** `CohortBridgeShimEngine`
**File:** `H:/prism/mcp-server/src/engines/CohortBridgeShimEngine.ts`
**Dispatcher:** `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts`
**Schema file:** `H:/prism/mcp-server/src/schemas/devActionSchemas.ts`

---

### Check 1 — WIRING TRIPLE-MATCH

Every action name must appear in (a) the `ACTIONS as const` array, (b) `ACTION_DEV_SCHEMAS`, and (c) a `case` statement.

| Action name | ACTIONS array (line) | ACTION_DEV_SCHEMAS (line) | switch case (line) | Triple match |
|---|---|---|---|---|
| `cohort_shim_nodenext_suffix` | 680 | 182 | 11562 | PASS |
| `cohort_shim_rewrite_imports` | 681 | 186 | 11570 | PASS |
| `cohort_shim_build_shape_coerce` | 682 | 189 | 11575 | PASS |
| `cohort_shim_recommend_bridges` | 683 | 194 | 11584 | PASS |

All four names are byte-identical across all three surfaces. No orphan or dead-action found.

---

### Check 2 — CALL CORRECTNESS

**`cohort_shim_nodenext_suffix` (devDispatcher.ts:11562-11568)**

Engine signature (`CohortBridgeShimEngine.ts:75-78`):
```
applyNodeNextSuffix(spec: string, opts: { assumeDirectoryIndex?: boolean } = {})
```

Dispatcher call:
```typescript
cohortBridgeShimEngine.applyNodeNextSuffix(
  params.spec as string,
  { assumeDirectoryIndex: params.assumeDirectoryIndex as boolean | undefined },
)
```

Schema fields: `spec` (required string), `assumeDirectoryIndex` (optional boolean).

Assessment: Parameter order matches. Field names `spec` / `assumeDirectoryIndex` align exactly with both the schema and the engine signature. The opts object is correctly constructed inline rather than passed as `params` directly, which is correct because the engine signature expects `opts: { assumeDirectoryIndex?: boolean }`. PASS.

---

**`cohort_shim_rewrite_imports` (devDispatcher.ts:11570-11573)**

Engine signature (`CohortBridgeShimEngine.ts:99`):
```
rewriteSo
... [+7370 chars truncated]

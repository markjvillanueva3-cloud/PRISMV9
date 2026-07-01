---
type: "chat-session"
source: "claude-code-cli"
session_id: "f40fff31-cb37-49ea-9b03-5d4d750b18f3"
title: "Review the U-AI-11 wiring additions to H:\\prism\\mcp-server\\src\\tools\\dispatchers"
date: "2026-05-23"
first_ts: "2026-05-23T04:28:30.394Z"
last_ts: "2026-05-23T04:30:31.084Z"
cwd: "H:\\prism\\mcp-server"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-a64e1ef0d47fb5128.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Review the U-AI-11 wiring additions to H:\prism\mcp-server\src\tools\dispatchers

> **claude-code-cli** | 2026-05-23 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-a64e1ef0d47fb5128.jsonl`

## Transcript

### User | 2026-05-23T04:28:30.394Z

Review the U-AI-11 wiring additions to H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts:

1. Enum entries at lines ~484-490 (cad_consensus_score, cad_consensus_pick, cad_consensus_parameter_clusters)
2. Case cluster at ~lines 5210-5275 (`case "cad_consensus_score": case "cad_consensus_pick": case "cad_consensus_parameter_clusters"`)

Verify per dispatcher conventions in:
- H:\prism\mcp-server\src\tools\dispatchers\CLAUDE.md
- H:\prism\mcp-server\src\tools\.claude\CLAUDE.md
- The sibling cad_preview_apply/cad_preview_apply_all cluster at lines 5147-5210 (U-AI-07, which my cluster mirrors)

WIRING CONTRACT CHECKS:
- Action enum names match the case labels exactly (3 actions, snake_case, no typos)
- Lazy import pattern: `const { cadConsensusEngine } = await import("../../engines/CADConsensusEngine.js")` — matches the sibling cad_preview pattern
- Input validation BEFORE engine calls (predictions array check, length cap 100, dissentThreshold type check)
- All paths return `{ success: true, data: ... }` or `dispatcherError(...)` — no raw engine output, no undefined fallthrough
- Default case unchanged (still `Unknown action: ${action}`)
- Defense-in-depth cap (100 predictions) matches the schema's .max(100); both layers enforced (a code path bypassing the schema cannot poison the engine)
- snake_case alias (`dissent_threshold` → `dissentThreshold`) — does this match the pattern from cad_preview's `doc_id → docId` alias?

INTEGRATION HAZARDS:
- The cad_consensus_pick branch passes `opts.dissentThreshold = rawThreshold` only when defined — does this preserve the engine's default-0.5 behavior? Trace through CADConsensusEngine.pick() at lines ~220-285.
- Could a malformed prediction (wrong shape) bypass dispatcher checks and reach engine validation? That's the desired behavior (engine validates the inner shape), but is the OUTER wrap correct?
- Memory: predictions could be very large diffs — does the 100-cap protect against memory exhaustion? Compare with sibling c
... [+421 chars truncated]

### Assistant | 2026-05-23T04:29:05.980Z

I'll read the relevant files to verify the wiring.

### Assistant | 2026-05-23T04:29:07.435Z

[tool_use: Read]

### Assistant | 2026-05-23T04:29:07.622Z

[tool_use: Read]

### User | 2026-05-23T04:29:17.981Z

[tool_result] 480	  "cad_txn_apply_all",             // begin + apply each op + commit-or-rollback in one call
481	  "cad_txn_reset",                 // drop every txn + release every doc lock (test / hygiene hook)
482	  // CAD-COMPLETE-MS0/U-AI-07 — CADPreviewEngine (pure dry-run preview over CADTransactionEngine; real world is NEVER mutated, even on success)
483	  "cad_preview_apply",             // project a
... [+1076 chars truncated]

### User | 2026-05-23T04:29:18.004Z

[tool_result] 5140	              result = {
5141	                success: true,
5142	                data: {
5143	                  reset: true,
5144	                  txnsDropped: prior.length,
5145	                  docsUnlocked: new Set(prior.filter((s) => s.state === "pending").map((s) => s.docId)).size,
5146	                },
5147	              };
5148	            }
5149	            break;
5150	          
... [+6752 chars truncated]

### Assistant | 2026-05-23T04:29:21.487Z

Now let me read the CADConsensusEngine to verify the pick() signature and default threshold:

### Assistant | 2026-05-23T04:29:22.692Z

[tool_use: Grep]

### Assistant | 2026-05-23T04:29:23.362Z

[tool_use: Grep]

### User | 2026-05-23T04:29:40.783Z

[tool_result] 197-      predictionCount: n,
198-      addedEntityAgreement: addedAgreement,
199-      removedEntityAgreement: removedAgreement,
200-      parameterChangeAgreement: parameterAgreement,
201-      selectionChangedAgreement,
202-      unitsChangedAgreement,
203-      pairwiseSimilarity,
204-      meanAgreement,
205-      unanimousIdentical,
206-    };
207-  }
208-
209-  /** Pick the medoid predictio
... [+853 chars truncated]

### User | 2026-05-23T04:29:40.847Z

[tool_result] 133-  /** The picked prediction's diff (verbatim from input). */
134-  pickedDiff: CADWorldDiff;
135-  /** Mean Jaccard of the picked prediction with the rest. For N=1
136-   *  returns 1.0. Range [0,1]. */
137-  pickedScore: number;
138:  /** Predictions whose agreement with the pick is < `dissentThreshold`. */
139-  dissenters: CADConsensusDissenter[];
140-  /** True when every prediction has Ja
... [+1613 chars truncated]

### Assistant | 2026-05-23T04:29:44.937Z

Now check the schema file and whether the `dispatcherError` call in the 100-cap block is missing the `action, "prism_cad"` args:

### Assistant | 2026-05-23T04:29:46.586Z

[tool_use: Grep]

### Assistant | 2026-05-23T04:29:47.267Z

[tool_use: Read]

### User | 2026-05-23T04:29:54.818Z

[tool_result] H:\prism\mcp-server\src\schemas\cadActionSchemas.ts-1737-    })
H:\prism\mcp-server\src\schemas\cadActionSchemas.ts-1738-    .describe("Pure dry-run preview of an ordered batch — returns projected diff WITHOUT mutating cadWorldModelEngine; inherits atomicity from CADTransactionEngine.applyAll"),
H:\prism\mcp-server\src\schemas\cadActionSchemas.ts-1739-  // CAD-COMPLETE-MS0/U-AI-11 — CADConsensusEn
... [+1728 chars truncated]

### User | 2026-05-23T04:29:55.300Z

[tool_result] 5235	            // a consensus pool), so 100 is generous + safe.
5236	            if (params.predictions.length > 100) {
5237	              return dispatcherError(
5238	                new Error(
5239	                  `${action} rejects predictions array of length ${params.predictions.length} (cap 100 — DoS guard)`,
5240	                ),
5241	                action, "prism_cad",
5242	         
... [+91 chars truncated]

### Assistant | 2026-05-23T04:30:31.084Z

I have all the data needed. Here is the review.

---

**VERDICT: PASS with 1 P2 and 2 P3 findings. No P0 or P1 issues.**

---

**Wiring contract checks**

Action enum names (lines 486-488) match the three case labels at lines 5221-5223 exactly — `cad_consensus_score`, `cad_consensus_pick`, `cad_consensus_parameter_clusters` — no typos, all snake_case. PASS.

Lazy import at line 5224 uses `../../engines/CADConsensusEngine.js` with the `.js` extension required for nodenext. The destructured name `cadConsensusEngine` matches the singleton export. PASS.

Input validation fires before any engine call: `Array.isArray` guard at line 5227, 100-cap at line 5236, `dissentThreshold` type check at lines 5253-5259. PASS.

All paths return `{ success: true, data: ... }` or `dispatcherError(...)`. The `default` case at line 5273 is unchanged (`Unknown action: ${action}`). No undefined fallthrough. PASS.

The 100-cap `dispatcherError` call at lines 5237-5242 correctly passes both `action` and `"prism_cad"` — no missing arguments (the concern was founded; the code has them). PASS.

Schema file `H:\prism\mcp-server\src\schemas\cadActionSchemas.ts` defines all three actions (lines 1740, 1774, 1812) with `.max(100)` on the predictions array. Both layers (schema + dispatcher code) enforce the cap — a caller bypassing the schema still hits the dispatcher guard. The 100-cap rationale (number of LLM voices in a consensus pool) is sound; the sibling `cad_preview_apply_all` uses 1000 for ops, a different cardinality that is not a precedent violation here. PASS.

**Integration hazard checks**

`dissentThreshold` default-preservation: the dispatcher sets `opts.dissentThreshold = rawThreshold` only when `rawThreshold !== undefined` (line 5252 guard), leaving `opts` as an empty object otherwise. The engine's `pick(preds, opts = {})` then applies `opts.dissentThreshold ?? 0.5` (line 217 of `CADConsensusEngine.ts`). The default-0.5 behavior is fully preserved. PASS.

Malformed prediction shape: th
... [+2407 chars truncated]

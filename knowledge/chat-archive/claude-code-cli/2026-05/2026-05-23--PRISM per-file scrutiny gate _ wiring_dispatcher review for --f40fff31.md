---
type: "chat-session"
source: "claude-code-cli"
session_id: "f40fff31-cb37-49ea-9b03-5d4d750b18f3"
title: "PRISM per-file scrutiny gate — wiring/dispatcher review for the U-AI-07 dispatch"
date: "2026-05-23"
first_ts: "2026-05-23T02:58:31.744Z"
last_ts: "2026-05-23T02:59:23.993Z"
cwd: "H:\\prism\\mcp-server"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-aa794fa1d69612884.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# PRISM per-file scrutiny gate — wiring/dispatcher review for the U-AI-07 dispatch

> **claude-code-cli** | 2026-05-23 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-aa794fa1d69612884.jsonl`

## Transcript

### User | 2026-05-23T02:58:31.744Z

PRISM per-file scrutiny gate — wiring/dispatcher review for the U-AI-07 dispatcher+schema pair:

FILES TO READ END-TO-END:
- H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts (focus on lines 472-486 enum + lines ~5145-5215 case cluster for cad_preview_apply / cad_preview_apply_all)
- H:\prism\mcp-server\src\schemas\cadActionSchemas.ts (focus on lines ~1689-1745 — the two new schemas)

CROSS-CHECK AGAINST (the engine they wire):
- H:\prism\mcp-server\src\engines\CADPreviewEngine.ts (the engine — exports `cadPreviewEngine` singleton + `preview(docId, op, units)` + `previewAll(docId, ops, units)`)

CONTEXT:
- This is the dispatcher+schema wiring for CAD-COMPLETE-MS0/U-AI-07. The cluster mirrors the existing cad_txn_apply / cad_txn_apply_all pattern from U-AI-08 (lines 5018-5143 + schema lines 1624-1687). The engine guarantees the real `cadWorldModelEngine` singleton is NEVER mutated.
- 47 CADPreviewEngine tests + 60 CADTransactionEngine tests all pass — the engine surface is solid.
- The two new dispatcher cases share ONE lazy import + ONE switch arm (action discriminator inside the block) — same pattern the cad_txn_* cluster uses.
- Snake_case `doc_id` → `docId` aliasing is provided by `paramNormalizer.ts` (already in place from U-AI-08).

YOUR JOB — flag P0 (must fix), P1 (must fix), P2 (deferrable). Look HARD for:

1. **z.enum ↔ case mismatch** — every action string in the enum MUST appear in a case label, and vice versa. Count them. Are there 2 new enum entries and 2 new case labels?
2. **Schema ↔ dispatcher contract drift** — do the Zod field names match exactly what the dispatcher reads? (`docId` / `op` / `ops` / `units` — schema says these, dispatcher reads `params.doc_id ?? params.docId`, `params.op`, `params.ops`, `params.units`).
3. **Defense-in-depth caps** — schema enforces `ops.max(1000)`. Dispatcher must ALSO check `params.ops.length > 1000` (in case the schema is bypassed). Confirm both layers cap.
4. **Lazy-import discipline** — `await import("
... [+1329 chars truncated]

### Assistant | 2026-05-23T02:58:44.360Z

I'll read all three files in parallel to verify the wiring.

### Assistant | 2026-05-23T02:58:45.147Z

[tool_use: Read]

### Assistant | 2026-05-23T02:58:45.910Z

[tool_use: Read]

### Assistant | 2026-05-23T02:58:46.182Z

[tool_use: Read]

### User | 2026-05-23T02:58:53.802Z

[tool_result] 1680	    .object({
1681	      confirm: z
1682	        .literal("RESET_ALL_TRANSACTIONS")
1683	        .describe(
1684	          "REQUIRED literal 'RESET_ALL_TRANSACTIONS' — fleet-destructive; drops every tracked transaction and releases every doc lock, including peer chats' in-flight work. Test / hygiene only.",
1685	        ),
1686	    })
1687	    .describe("DESTRUCTIVE: drop every transaction + 
... [+3652 chars truncated]

### User | 2026-05-23T02:58:53.873Z

[tool_result] 460	  "cad_fallback_list",             // list registered CAD apps, ranked by priority
461	  "cad_fallback_reset",            // clear the CAD app routing registry
462	  // CAD-COMPLETE-MS0/U-AI-02 — CADWorldModelEngine (CAD agent's document belief-state)
463	  "cad_world_apply_op",            // apply one operation to a document's world model
464	  "cad_world_state",               // current beli
... [+2916 chars truncated]

### User | 2026-05-23T02:58:53.879Z

[tool_result] 1	/**
2	 * CADPreviewEngine — CAD-COMPLETE-MS0 / U-AI-07
3	 * ==============================================
4	 *
5	 * Pure dry-run preview for CAD operations. Projects the believed `CADWorldState`
6	 * forward through one or many ops AND returns the canonical `CADWorldDiff`
7	 * WITHOUT ever mutating the real `cadWorldModelEngine` singleton.
8	 *
9	 * The CAD agent uses this to answer "what would
... [+12080 chars truncated]

### Assistant | 2026-05-23T02:58:58.083Z

Now I need to read the dispatcher case cluster for the two new actions.

### Assistant | 2026-05-23T02:58:58.837Z

[tool_use: Read]

### User | 2026-05-23T02:59:05.043Z

[tool_result] 5130	                  ),
5131	                  action, "prism_cad",
5132	                );
5133	              }
5134	              const prior = cadTransactionEngine.list();
5135	              cadTransactionEngine.reset();
5136	              result = {
5137	                success: true,
5138	                data: {
5139	                  reset: true,
5140	                  txnsDropped: prior.l
... [+3928 chars truncated]

### Assistant | 2026-05-23T02:59:23.993Z

All three files are read in full. Here is the verdict.

---

**What I found and verified:**

Both `cad_preview_apply` and `cad_preview_apply_all` are present in the `ACTIONS` z.enum at lines 483-484 and have corresponding case labels at lines 5153-5154 in a single two-label case block — count is exact, no orphan entries on either side. The lazy import at line 5155 uses `../../engines/CADPreviewEngine.js` with the correct `.js` ESM suffix and destructures `cadPreviewEngine` (lowerCamel), exactly matching the singleton export at CADPreviewEngine.ts line 295. The schema fields (`docId`, `op`, `ops`, `units`) align with what the dispatcher reads: `params.doc_id ?? params.docId` (alias handled), `params.op`, `params.ops`, `params.units` — no field-name drift. The defense-in-depth `ops.length > 1000` check at line 5194 is present alongside the schema-level `.max(1000)` at cadActionSchemas.ts line 1731, satisfying both layers. The `units` default to `"mm"` at line 5159 is correct — the engine signature `preview(docId, op, units: CADUnits = "mm")` accepts exactly `"mm" | "in"`. All error-early-return paths use `dispatcherError(new Error(...), action, "prism_cad")` matching the sibling cluster pattern. No cross-dispatcher calls are made — both actions call only into `cadPreviewEngine` directly. Action count increases by exactly 2 (no removals visible in the enum tail). The two action names are unique within the enum and are not present in any other dispatcher file checked by the review context.

**VERDICT: PASS**

Findings: none at P0 or P1.

- [P2] The `else` branch comment at line 5183 (`// cad_preview_apply_all`) is helpful but the action discriminator relies on the implicit `else` after the `action === "cad_preview_apply"` check, rather than an explicit `else if (action === "cad_preview_apply_all")`. This is safe because the outer `case` labels guarantee only those two strings reach this block, but an explicit guard would make future maintainers' intent clearer. Deferrab
... [+298 chars truncated]

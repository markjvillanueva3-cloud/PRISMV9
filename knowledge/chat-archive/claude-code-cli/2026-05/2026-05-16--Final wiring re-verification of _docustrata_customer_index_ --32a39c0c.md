---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Final wiring re-verification of `docustrata_customer_index` on `prism_cad` after"
date: "2026-05-16"
first_ts: "2026-05-16T20:05:39.683Z"
last_ts: "2026-05-16T20:06:18.668Z"
cwd: "H:\\prism\\mcp-server"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-af17348c594123884.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Final wiring re-verification of `docustrata_customer_index` on `prism_cad` after

> **claude-code-cli** | 2026-05-16 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-af17348c594123884.jsonl`

## Transcript

### User | 2026-05-16T20:05:39.683Z

Final wiring re-verification of `docustrata_customer_index` on `prism_cad` after fixes. Read:
- `H:/prism/mcp-server/src/schemas/cadActionSchemas.ts` (the `docustrataCustomerIndexSchema` near line 746 and the `ACTION_CAD_SCHEMAS` map entry near line 778)
- `H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts` (the `"docustrata_customer_index"` entry in `ACTIONS` near line 361 and the `case "docustrata_customer_index"` near line 3855)

Prior round flagged two P1s, now fixed:
- Snake_case `part_number` / `sort_by` were silently undefined (the `normalizeParams` alias map doesn't cover them). The case now reads `params.partNumber ?? params.part_number` for `find_pn` and `params.sortBy ?? params.sort_by` for `list`.
- The schema `limit: z.number().int().positive()` rejected `limit:0` even though the engine supports it (`cleanLimit` clamps to `max(0, floor)`, 0 → empty list). Schema changed to `.nonnegative()`.

VERIFY:
1. Both fixes are present in the code, syntactically correct, and applied at the right sites only (no over-broad rewrites elsewhere).
2. The full wiring is still consistent: action string matches across `ACTIONS` array / case label / schema map key; lazy import path + symbol match; every `mode` enum value handled; `result = {success:true, data}` shape correct.
3. No NEW issue introduced — e.g. did the `?? params.part_number` reintroduce any precedence ambiguity, did the `.nonnegative()` widen the schema unsafely (negative integers, NaN)?
4. Any remaining P0/P1 in the wiring.

Report P0/P1 findings with line numbers, then end with exactly `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-16T20:05:42.547Z

I'll read both files in parallel, focusing on the specific areas mentioned.

### Assistant | 2026-05-16T20:05:42.995Z

[tool_use: Read]

### Assistant | 2026-05-16T20:05:43.714Z

[tool_use: Read]

### User | 2026-05-16T20:05:43.805Z

[tool_result] 730	    .optional()
731	    .describe(
732	      "When true, reject CAD entries whose machineCategory is not in {mill, hurco, hypermill}. Default false (include all categories).",
733	    ),
734	  formats: z
735	    .array(z.string())
736	    .optional()
737	    .describe(
738	      "Optional override of the format allowlist. Defaults to MILL_PROGRAM_FORMATS (.ipt/.iam/.f3d/.f3z/.sldprt/.sldasm)."
... [+3656 chars truncated]

### User | 2026-05-16T20:05:44.514Z

[tool_result] 350	  "macro_place_template",              // MacroLibraryEngine.placeMacroTemplate — copy the matching macro as _MACRO-TEMPLATE_*.min into <part>/CNC PROGRAM/ with a DO-NOT-RUN-AS-IS header
351	  "macro_fanout_dry_run",              // MacroLibraryEngine.fanoutDryRun — scan _PART LIBRARY/, report matchable parts per macro family
352	  // TRAINING-LEARNING-MS0/U1: CAD-domain alias for macro_place_
... [+1705 chars truncated]

### Assistant | 2026-05-16T20:05:46.102Z

I'll read the case statement in the dispatcher now.

### Assistant | 2026-05-16T20:05:46.904Z

[tool_use: Read]

### User | 2026-05-16T20:05:47.698Z

[tool_result] 3845	                      : undefined,
3846	                limit:
3847	                  typeof params.limit === "number" ? params.limit : undefined,
3848	              });
3849	              result = { success: true, data: composeResult };
3850	            } catch (err) {
3851	              result = dispatcherError(err, action, "prism_cad");
3852	            }
3853	            break;
3854	     
... [+2481 chars truncated]

### Assistant | 2026-05-16T20:05:50.262Z

Now I have all the material I need. Let me also verify the `ACTIONS` z.enum array includes the action string, and confirm the `normalizeParams` alias coverage claim.

### Assistant | 2026-05-16T20:05:51.103Z

[tool_use: Read]

### User | 2026-05-16T20:05:51.973Z

[tool_result] 379	        // H1-MS2: Auto-normalize snake_case → camelCase params
380	        let params = rawParams;
381	        try {
382	          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
383	          params = normalizeParams(rawParams);
384	        } catch { /* normalizer not available */ }
385	        // SYS-MS6: Validate params against per-action Zod schema
386	        
... [+1564 chars truncated]

### Assistant | 2026-05-16T20:06:18.668Z

I have all the information needed. Here is the full verification.

---

## Wiring Re-Verification: `docustrata_customer_index` on `prism_cad`

### Fix 1 — Snake_case alias reads (`part_number` / `sort_by`)

**`case "find_pn"` (cadDispatcher.ts line 3886-3888):**
```ts
dci = docustrataCustomerIndexEngine.findByPartNumber(
  params.partNumber ?? params.part_number,
);
```
Present. Syntactically correct. The `??` operator is the right choice here: `normalizeParams` will have already converted `part_number` → `partNumber` when the normalizer is available (line 383), so the left-hand side wins on a camelCase caller; the right-hand side catches a raw snake_case caller if the normalizer import fails (the `catch {}` at line 384 leaves `params = rawParams`). No precedence ambiguity — `??` binds lower than property access, behaves identically to an explicit `( params.partNumber !== null && params.partNumber !== undefined ) ? params.partNumber : params.part_number`. No issue.

**`case "list"` (cadDispatcher.ts line 3870-3873):**
```ts
dci = docustrataCustomerIndexEngine.listCustomers({
  sortBy: params.sortBy ?? params.sort_by,
  limit: params.limit,
});
```
Present. Same analysis applies. No issue.

**Scope correctness:** both reads are confined to their respective `case` blocks. No other `case` branches were modified. The fix is surgical.

---

### Fix 2 — Schema `.nonnegative()` on `limit`

**`cadActionSchemas.ts` lines 762-767:**
```ts
limit: z
  .number()
  .int()
  .nonnegative()
  .optional()
  .describe("max rows for list/search (0 = empty list; omit = no limit)"),
```

`.nonnegative()` passes integers `>= 0`. Analysis of safety:

- **Negative integers:** rejected. Correct — the engine has no defined behaviour for a negative limit.
- **Zero:** now accepted. The describe string documents `0 = empty list`, which matches the engine's `cleanLimit` clamp (`max(0, floor)`, 0 → empty list). No unsafe widening.
- **NaN:** `z.number()` rejects `NaN` at the Zod boundary — `z.num
... [+1912 chars truncated]

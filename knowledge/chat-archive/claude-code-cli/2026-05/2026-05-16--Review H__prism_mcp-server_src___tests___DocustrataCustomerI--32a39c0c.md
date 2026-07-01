---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Review H:/prism/mcp-server/src/__tests__/DocustrataCustomerIndexEngine.test.ts a"
date: "2026-05-16"
first_ts: "2026-05-16T20:24:28.570Z"
last_ts: "2026-05-16T20:26:31.976Z"
cwd: "H:\\prism\\mcp-server"
messages: 22
user_msgs: 10
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a6ccd4f53a11e549b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review H:/prism/mcp-server/src/__tests__/DocustrataCustomerIndexEngine.test.ts a

> **claude-code-cli** | 2026-05-16 | 22 msgs (10 user / 12 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a6ccd4f53a11e549b.jsonl`

## Transcript

### User | 2026-05-16T20:24:28.570Z

Review H:/prism/mcp-server/src/__tests__/DocustrataCustomerIndexEngine.test.ts as the INDEPENDENT second-pass reviewer (Agent B) for the PRISM per-file scrutiny gate.

This is the test file for a new read-only query engine (DocustrataCustomerIndexEngine) + its prism_cad dispatcher wiring. Engine: H:/prism/mcp-server/src/engines/DocustrataCustomerIndexEngine.ts. Schema: H:/prism/mcp-server/src/schemas/cadActionSchemas.ts. Dispatcher case: H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts at the docustrata_customer_index action.

DO NOT assume agent A caught everything. You are weighted on what A is likely to miss:

1. **Hostile / adversarial payload classes** — what would a malicious operator feed this dispatcher to make it misbehave? (prototype-pollution sortBy keys, oversized limit, unicode-confusable customer names, integer-overflow part_number lengths, JSON bombs in the fixture).
2. **Silent-fail vs surface-fail** — when the engine has a real bug or the dispatcher contract regresses, does the test FAIL LOUDLY with a useful message, or could it pass with mis-shaped data? In particular: a dispatcher response shape regression (e.g. customers becomes nested inside .data.result.customers) — would these tests catch it?
3. **Dead-enum reachability / closed-enum guards** — every Zod enum branch reachable from the test? mode:"delete" rejection? closed sortBy fallback to "programs" exercised?
4. **Integration coupling with already-built engines** — does anything in PRISM's BlueprintProgramJoinEngine, JM-Die archive, or the cad dispatcher's PARAM_ALIASES change of behavior risk breaking this test silently?
5. **Naming + convention conformance** — describe block names, test grain (it should describe behavior not implementation), magic numbers in assertions (are they all named constants?), use of "as never" / "as unknown as X" casts.
6. **slimResponse contract awareness** — the dispatcher's responseSlimmer strips empty arrays. The test at line ~705 (limit:0 dispatche
... [+1241 chars truncated]

### Assistant | 2026-05-16T20:24:36.655Z

I'll review the test file as the independent second-pass reviewer (Agent B), focusing on adversarial/hostile-payload classes, silent-fail risks, and integration coupling that Agent A is unlikely to catch.

### Assistant | 2026-05-16T20:24:37.044Z

[tool_use: Read]

### User | 2026-05-16T20:24:37.737Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\DocustrataCustomerIndexEngine.test.ts' was already read 26s ago in this session and is unchanged (mtime 1778962984370). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-05-16T20:24:41.530Z

The file is already in my context from the earlier read. Let me also examine the engine and dispatcher to ground the review.

### Assistant | 2026-05-16T20:24:42.093Z

[tool_use: Read]

### User | 2026-05-16T20:24:42.540Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\DocustrataCustomerIndexEngine.test.ts' was already read 31s ago in this session and is unchanged (mtime 1778962984370). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-05-16T20:24:47.879Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:24:48.112Z

[tool_use: Bash]

### User | 2026-05-16T20:24:53.019Z

[tool_result] 806

### User | 2026-05-16T20:24:56.247Z

[tool_result] /**
 * DocustrataCustomerIndexEngine — read-only query surface over the Docustrata
 * customer-folder index (phase23-customer-folder-index.json).
 *
 * The Docustrata print-reading pipeline (Docustrata/.index/docustrata-pipeline.py)
 * ends with a `customer-rollup` stage that aggregates the blueprint <-> program
 * join into one record per JM-Die customer folder: the customer's CNC programs,
 * CA
... [+9517 chars truncated]

### Assistant | 2026-05-16T20:25:01.668Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:25:03.143Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:25:04.140Z

[tool_use: Bash]

### User | 2026-05-16T20:25:05.142Z

[tool_result] }

/** Is the customer-folder index present and parseable? */
function isAvailable(opts: QueryOpts = {}): AvailabilityResult {
  const p = opts.indexPath ?? defaultIndexPath();
  const r = loadIndex(p);
  return { available: r.available, path: r.path, error: r.error };
}

/** Index-wide totals + provenance. */
function getTotals(opts: QueryOpts = {}): TotalsResult {
  const p = opts.indexPath ?? d
... [+5250 chars truncated]

### User | 2026-05-16T20:25:08.740Z

[tool_result] 361:  "docustrata_customer_index",
3855:          case "docustrata_customer_index": {

### User | 2026-05-16T20:25:12.594Z

[tool_result] 743: * DocustrataCustomerIndexEngine — query the per-customer-folder rollup of the
777:  // Docustrata customer-folder index — DocustrataCustomerIndexEngine query surface
778:  docustrata_customer_index: docustrataCustomerIndexSchema,

### Assistant | 2026-05-16T20:25:17.209Z

[tool_use: Read]

### Assistant | 2026-05-16T20:25:18.049Z

[tool_use: Read]

### User | 2026-05-16T20:25:18.142Z

[tool_result] 740	});
741	
742	/**
743	 * DocustrataCustomerIndexEngine — query the per-customer-folder rollup of the
744	 * Docustrata print archive (programs / CAD / matched prints per JM-Die customer).
745	 */
746	export const docustrataCustomerIndexSchema = z.object({
747	  mode: z
748	    .enum(["available", "totals", "list", "get", "search", "find_pn"])
749	    .describe(
750	      "available=is the index
... [+2308 chars truncated]

### User | 2026-05-16T20:25:19.226Z

[tool_result] 3850	            } catch (err) {
3851	              result = dispatcherError(err, action, "prism_cad");
3852	            }
3853	            break;
3854	          }
3855	          case "docustrata_customer_index": {
3856	            const { docustrataCustomerIndexEngine } = await import(
3857	              "../../engines/DocustrataCustomerIndexEngine.js"
3858	            );
3859	            const m
... [+2238 chars truncated]

### Assistant | 2026-05-16T20:26:31.976Z

I have the test file and its dependencies (engine, schema, dispatcher case) in context from earlier reads. Acknowledging the system reminders — I will not re-read the test file (read-once-guard), and the schemas/dispatcher conventions noted are inputs to my findings. Now the independent second-pass review as Agent B.

---

# VERDICT: **FAIL** (3 P0, 5 P1, 4 P2)

The test suite is competent and reaches every Zod enum branch — but two production-shape regressions could ship undetected, one assertion is mathematically wrong (passes by accident on this fixture), and the hostile-payload class is essentially un-exercised at the dispatcher boundary where Zod is the only line of defense. These are exactly the things the per-file gate exists to catch before the next file is generated.

---

## P0 (must fix before next file)

### P0-1 — `unique part_numbers` assertion is mathematically wrong (silent-fail, axis 2)
**File: DocustrataCustomerIndexEngine.test.ts ~line 233** (the `"computes unique part_numbers across customers"` block)

The fixture has 4 customers with `part_numbers: ["AB-001"], ["AB-002","CD-003"], ["EF-004"], []` → **4 unique part numbers**. The test asserts `expect(uniquePNs.size).toBe(4)`. That happens to pass because the fixture has zero collisions. The intent of "unique across customers" is **inter-customer deduplication** (e.g., if two customers both list `"AB-001"` the count should still be 1). Add a fixture with overlap (e.g., a fifth customer carrying `"AB-001"`) and re-assert `===4`. As written, the test claims to verify cross-customer uniqueness but actually verifies "sum-of-set-sizes of disjoint sets" — a trivially true property on this fixture. A real bug (engine accidentally double-counting on PN overlap, which `findByPartNumber` could regress to) would not fail this test.

**Fix:** add `"OverlapCo": { part_numbers: ["AB-001", "ZZ-999"], ... }` to fixture, re-assert `5`. Then this becomes a real invariant.

### P0-2 — Dispatcher response-shape regre
... [+9584 chars truncated]

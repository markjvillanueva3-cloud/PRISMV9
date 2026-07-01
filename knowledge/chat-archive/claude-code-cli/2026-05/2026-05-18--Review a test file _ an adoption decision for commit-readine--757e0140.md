---
type: "chat-session"
source: "claude-code-cli"
session_id: "757e0140-b6cc-42c3-bb66-caa58c86b10b"
title: "Review a test file + an adoption decision for commit-readiness. Two untracked WI"
date: "2026-05-18"
first_ts: "2026-05-18T02:26:59.997Z"
last_ts: "2026-05-18T02:30:22.096Z"
cwd: "H:\\PRISM"
messages: 36
user_msgs: 14
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/757e0140-b6cc-42c3-bb66-caa58c86b10b/subagents/agent-ad198e65c48cffc3b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review a test file + an adoption decision for commit-readiness. Two untracked WI

> **claude-code-cli** | 2026-05-18 | 36 msgs (14 user / 22 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/757e0140-b6cc-42c3-bb66-caa58c86b10b/subagents/agent-ad198e65c48cffc3b.jsonl`

## Transcript

### User | 2026-05-18T02:26:59.997Z

Review a test file + an adoption decision for commit-readiness. Two untracked WIP files are being committed into the PRISM codebase (slot/bravo worktree): `DocustrataCustomerIndexEngine.ts` (a read-only customer-index query engine) and its test. The committed `cadDispatcher.ts` already has a `docustrata_customer_index` executor that imports the engine — but the engine source was never committed (latent broken runtime import). This commit closes that gap.

FILES (read end-to-end):
- TEST: H:/prism-slot-bravo/mcp-server/src/__tests__/DocustrataCustomerIndexEngine.test.ts
- ENGINE (for contract cross-check): H:/prism-slot-bravo/mcp-server/src/engines/DocustrataCustomerIndexEngine.ts

Already verified: tsc 0 errors, vitest 61/61 passing.

Check and report P0/P1/P2 + a PASS/FAIL verdict:
1. TEST INTEGRITY (most important): are the assertions real behavior checks against concrete expected values, or worthless placeholder/presence-only asserts (`toBeDefined()`, `toBeTruthy()` on everything)? A test that would still pass if the engine returned hardcoded values is a FAIL.
2. Does the test cover edge cases: empty/null inputs, malformed JSON, missing file, adversarial keys (__proto__), limit:0 / negative / NaN / fractional?
3. Does the dispatcher round-trip section actually drive the real `registerCadDispatcher` (not a fake), and does it verify the snake_case alias bridges (`sort_by`, `part_number`) and Zod-enum rejection?
4. Does the test's expected dispatcher contract (modes: available/totals/list/get/search/find_pn; envelope shape `data.*`) match what a real consumer would get? Flag any envelope-shape assumption that looks fragile.
5. ADOPTION SAFETY: is there any reason committing these 2 files verbatim is unsafe (e.g. they reference other uncommitted files, hardcode an absolute machine path, leave a side-effect)?

Be concise. Report only real issues. End with: VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-05-18T02:27:08.012Z

I'll review both files end-to-end.

### Assistant | 2026-05-18T02:27:08.864Z

[tool_use: Read]

### Assistant | 2026-05-18T02:27:09.128Z

[tool_use: Read]

### User | 2026-05-18T02:27:10.140Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\mcp-server\src\engines\DocustrataCustomerIndexEngine.ts' was already read 8s ago in this session and is unchanged (mtime 1779070849270). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disab
... [+23 chars truncated]

### User | 2026-05-18T02:27:11.443Z

[tool_result] 1	/**
2	 * DocustrataCustomerIndexEngine — read-only customer-folder index tests.
3	 * Covers 6 query methods + dispatcher round-trip with concrete-value
4	 * assertions against the seeded fixture's real numbers (no presence-only
5	 * placeholders). Hits every SortKey, the `__proto__` prototype-chain guard,
6	 * the `limit:0` Zod-nonnegative regression, snake/camel param-alias bridges
7	 * for `pa
... [+35537 chars truncated]

### Assistant | 2026-05-18T02:27:15.748Z

The engine read was cached but I don't have it in context. Let me read it fresh.

### Assistant | 2026-05-18T02:27:17.033Z

[tool_use: Bash]

### User | 2026-05-18T02:27:31.144Z

[tool_result] /**
 * DocustrataCustomerIndexEngine — read-only query surface over the Docustrata
 * customer-folder index (phase23-customer-folder-index.json).
 *
 * The Docustrata print-reading pipeline (Docustrata/.index/docustrata-pipeline.py)
 * ends with a `customer-rollup` stage that aggregates the blueprint <-> program
 * join into one record per JM-Die customer folder: the customer's CNC programs,
 * CA
... [+12979 chars truncated]

### Assistant | 2026-05-18T02:27:34.773Z

I have most of the engine. Let me get the rest (search, findByPartNumber, exports).

### Assistant | 2026-05-18T02:27:36.889Z

[tool_use: Bash]

### Assistant | 2026-05-18T02:27:39.010Z

[tool_use: Bash]

### User | 2026-05-18T02:27:41.984Z

[tool_result]     };
  }
  const r = loadIndex(p);
  if (!r.available || !r.index) {
    return { available: false, error: r.error, path: r.path, query: q };
  }
  const ql = q.toLowerCase();
  const matches = Object.entries(r.index.customers)
    .filter(([name, e]) => isPlainObject(e) && name.toLowerCase().includes(ql))
    .map(([name, e]) => summarize(name, e as CustomerEntry));
  const sorted = sortSummari
... [+1793 chars truncated]

### User | 2026-05-18T02:28:00.469Z

[tool_result] ?? mcp-server/src/__tests__/DocustrataCustomerIndexEngine.test.ts
?? mcp-server/src/engines/DocustrataCustomerIndexEngine.ts
---ALIASES---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
---EXECUTOR---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 2 files:

3950:0:{
mcp-server/src/tools
... [+62 chars truncated]

### Assistant | 2026-05-18T02:28:10.236Z

Now let me read the dispatcher executor block to verify the contract the test asserts against.

### Assistant | 2026-05-18T02:28:11.174Z

[tool_use: Read]

### User | 2026-05-18T02:28:12.199Z

[tool_result] 3900	
3901	              const joinPath: string | undefined =
3902	                typeof params.join_jsonl_path === "string"
3903	                  ? params.join_jsonl_path
3904	                  : typeof params.joinJsonlPath === "string"
3905	                    ? params.joinJsonlPath
3906	                    : undefined;
3907	              const inputProgramPaths: readonly string[] = Array.isAr
... [+5231 chars truncated]

### Assistant | 2026-05-18T02:28:15.356Z

Now let me check the Zod schema for the `docustrata_customer_index` action to verify the enum-rejection assertions.

### Assistant | 2026-05-18T02:28:17.746Z

[tool_use: Bash]

### User | 2026-05-18T02:28:22.729Z

[tool_result]   "macro_fanout_dry_run",              // MacroLibraryEngine.fanoutDryRun — scan _PART LIBRARY/, report matchable parts per macro family
  // TRAINING-LEARNING-MS0/U1: CAD-domain alias for macro_place_template, scoped explicitly to lathe families.
  // Same engine (MacroLibraryEngine.placeMacroTemplate), but the action name surfaces under the prism_cad
  // dispatcher so CAD/training-pipeline cons
... [+2263 chars truncated]

### Assistant | 2026-05-18T02:28:27.439Z

Critical finding. The dispatcher's params schema is `z.record(z.string(), z.any())` — completely open. There is per-action validation via `validateActionParams(action, params, ACTION_CAD_SCHEMAS)`, but my grep found zero `docustrata` references in a per-action schema. Let me verify whether `ACTION_CAD_SCHEMAS` has an entry for `docustrata_customer_index`.

### Assistant | 2026-05-18T02:28:29.766Z

[tool_use: Bash]

### User | 2026-05-18T02:28:48.686Z

[tool_result] ===ACTION_CAD_SCHEMAS def===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 1 files:

mcp-server/src/tools/dispatchers/cadDispatcher.ts:18:import { ACTION_CAD_SCHEMAS } from "../../schemas/cadActionSchemas.js";
mcp-server/src/tools/dispatchers/cadDispatcher.ts:393:const validation = validateActionParams(action, params, ACTION_CAD_SCHEM
... [+414 chars truncated]

### Assistant | 2026-05-18T02:28:52.955Z

`cadActionSchemas.ts` does have a `docustrata_customer_index` entry. Let me read it — this is the Zod schema the test's enum-rejection assertions actually depend on.

### Assistant | 2026-05-18T02:28:56.119Z

[tool_use: Bash]

### User | 2026-05-18T02:29:01.710Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
1 matches in 1 files:

791:0:docustrataCustomerIndexSchema,
===SCHEMA BLOCK===
791:   docustrata_customer_index: docustrataCustomerIndexSchema,
792:   // U-PPL-D4-EXT (delta) — bridge to extend existing v6 join with CAD entries
793:   cad_archive_join_augment: cadArchiveJoinAugmentSchema,
794:   cad_ar
... [+1691 chars truncated]

### Assistant | 2026-05-18T02:29:05.968Z

[tool_use: Bash]

### User | 2026-05-18T02:29:10.867Z

[tool_result] ===docustrataCustomerIndexSchema def===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 2 files:

791:0:docustrataCustomerIndexSchema,
mcp-server/src/schemas/cadActionSchemas.ts:759:export const docustrataCustomerIndexSchema = z.object({
---
export function validateActionParams(
  action: string,
  params: Record<string, unknown>,
  sch
... [+1251 chars truncated]

### Assistant | 2026-05-18T02:29:14.907Z

[tool_use: Bash]

### User | 2026-05-18T02:29:19.387Z

[tool_result] /**
 * DocustrataCustomerIndexEngine — query the per-customer-folder rollup of the
 * Docustrata print archive (programs / CAD / matched prints per JM-Die customer).
 */
export const docustrataCustomerIndexSchema = z.object({
  mode: z
    .enum(["available", "totals", "list", "get", "search", "find_pn"])
    .describe(
      "available=is the index present · totals=index-wide counts · "
      + "
... [+1149 chars truncated]

### Assistant | 2026-05-18T02:29:23.255Z

I now have the full contract chain. Let me verify two final concerns: the `sort_by` snake-case path and the `normalizeParams` behavior, since the test explicitly relies on `sort_by` reaching the engine despite the schema only declaring `sortBy`.

### Assistant | 2026-05-18T02:29:25.339Z

[tool_use: Bash]

### User | 2026-05-18T02:29:30.682Z

[tool_result] ===normalizeParams: does it strip unknown keys?===
4: * Normalizes snake_case params to camelCase for safety/calc/thread dispatchers.
10:/** Snake→camel alias map for manufacturing parameters */
11:const PARAM_ALIASES: Record<string, string> = {
69:/** Reverse map: camelCase → snake_case (for engines that expect snake_case) */
71:for (const [snake, camel] of Object.entries(PARAM_ALIASES)) {
80:  *
... [+272 chars truncated]

### Assistant | 2026-05-18T02:29:34.188Z

[tool_use: Bash]

### User | 2026-05-18T02:29:40.442Z

[tool_result] export function normalizeParams(params: Record<string, any>): Record<string, any> {
  if (!params || typeof params !== "object") return params;
  const result = { ...params };
  let remapped = 0;
  
  for (const [key, value] of Object.entries(params)) {
    const alias = PARAM_ALIASES[key];
    if (alias && !(alias in result)) {
      result[alias] = value;
      remapped++;
    }

    if (key ===
... [+1131 chars truncated]

### Assistant | 2026-05-18T02:30:22.096Z

I have everything I need to verify the full chain. Here is my review.

---

## Code Review: `DocustrataCustomerIndexEngine.test.ts` + adoption decision

### 1. TEST INTEGRITY — PASS (strong)

Assertions are real behavior checks against concrete seeded values, not presence-only stubs. The test seeds a fixture with hand-computed numbers (`OMG_PROGRAMS = 4054`, `OMG_CAD = 312`, `FONTANA_CAD = 410`, etc.) and reads them back exactly. A hardcoded-return engine would fail immediately:

- Sort ordering verified by **name + value** (`customers![0].name === "OMG INC"` AND `program_count === 4054`), and crucially the `sortBy:cad` test inverts the order (FONTANA 410 wins over OMG 312) — an engine returning a static list cannot satisfy both `sortBy:programs` and `sortBy:cad`.
- `findByPartNumber(SHARED_PN)` returns alpha-sorted `["ITW", "OMG INC"]` — verifies both the reverse-index join and the `localeCompare` sort.
- `getTotals` distinguishes `customerCount` (6, includes the 2 malformed) from `totals.customer_count` (4) — a real structural distinction the engine actually computes via `Object.keys().length` vs the seeded `totals` field.

The ``__proto__`` test (line 271) and `limit:0` (line 302) catch genuine logic that would be wrong under naive implementations. These are intent-encoding tests (R9-compliant).

### 2. EDGE CASES — PASS (thorough)

Covered: missing file, malformed JSON (`"this is not { json"`), missing `customers` key, array-rooted JSON, `__proto__` sort key, `sortBy:"foo"`, `limit:0`/`-5`/`NaN`/`2.7`, empty/whitespace/non-string name+query+PN, malformed-array and malformed-null customer entries exercised through every query method, case-insensitive + whitespace-trimmed matching, substring-vs-exact distinction for PN lookup, and mtime+size cache invalidation. This is broader than typical.

### 3. DISPATCHER ROUND-TRIP — PASS (real, not faked)

`captureCadHandler()` drives the **real** `registerCadDispatcher` with a minimal mock server that only captures the hand
... [+5011 chars truncated]

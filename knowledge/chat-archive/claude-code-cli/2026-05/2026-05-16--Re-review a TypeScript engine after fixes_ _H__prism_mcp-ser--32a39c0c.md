---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Re-review a TypeScript engine after fixes: `H:/prism/mcp-server/src/engines/Docu"
date: "2026-05-16"
first_ts: "2026-05-16T19:40:47.802Z"
last_ts: "2026-05-16T19:41:16.294Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-affffdd3e1ad5e40e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Re-review a TypeScript engine after fixes: `H:/prism/mcp-server/src/engines/Docu

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-affffdd3e1ad5e40e.jsonl`

## Transcript

### User | 2026-05-16T19:40:47.802Z

Re-review a TypeScript engine after fixes: `H:/prism/mcp-server/src/engines/DocustrataCustomerIndexEngine.ts` — read it end-to-end.

It is a read-only query engine over a JSON artifact (`phase23-customer-folder-index.json` — JM-Die customers -> their programs/CAD/matched-prints). The file is unversioned scratch (often absent → must return `{available:false}`, never throw). Wired to the `prism_cad` MCP dispatcher.

A prior review round raised 4 issues; fixes just applied:
1. `listCustomers` could crash on an invalid `sortBy` string (`?? "programs"` only guards null/undefined; `SORT_FIELD["foo"]` or `SORT_FIELD["__proto__"]` is not a function → TypeError). Fixed: `sortBy` is now validated with `Object.prototype.hasOwnProperty.call(SORT_FIELD, opts.sortBy)`.
2. `getCustomer` returned a structurally-wrong `customer` object when the entry value wasn't a plain object (array/primitive/null spread). Fixed: new `isPlainObject()` helper; `getCustomer` returns `found:false` with an error for malformed entries; `listCustomers`/`searchCustomers`/`findByPartNumber` skip non-object entries.
3. Cache could serve stale data when the file changed within the same mtime tick. Fixed: `CacheEntry` now also keys on `stat.size`.
4. `cleanLimit` turned `limit:0` / negative / fractional into "no limit" (unbounded response). Fixed: a present finite limit now clamps to `max(0, floor)` so `limit:0` → empty list.

VERIFY:
1. All 4 fixes are correct and complete — `hasOwnProperty` truly rejects `"__proto__"` and unknown keys; `isPlainObject` is used at every entry-iteration site; the `size` cache key is set in all 3 `_cache =` assignments and checked in the cache-hit branch; `cleanLimit` semantics are right (`undefined` = no limit, finite = clamp ≥0).
2. No NEW bug introduced by the fixes.
3. Any remaining P0/P1 in the file.

Report P0/P1 findings with line numbers, then end with exactly `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-16T19:40:51.601Z

I'll read the engine file end-to-end and verify the 4 fixes.

### Assistant | 2026-05-16T19:40:51.696Z

[tool_use: Read]

### User | 2026-05-16T19:40:53.388Z

[tool_result] 1	/**
2	 * DocustrataCustomerIndexEngine — read-only query surface over the Docustrata
3	 * customer-folder index (phase23-customer-folder-index.json).
4	 *
5	 * The Docustrata print-reading pipeline (Docustrata/.index/docustrata-pipeline.py)
6	 * ends with a `customer-rollup` stage that aggregates the blueprint <-> program
7	 * join into one record per JM-Die customer folder: the customer's CNC p
... [+16927 chars truncated]

### Assistant | 2026-05-16T19:41:16.294Z

I have the full file content. Verifying all 4 fixes end-to-end.

## Verification of the 4 fixes

**Fix 1 — `sortBy` validation (lines 338-342):**
```ts
const sortBy: SortKey =
  typeof opts.sortBy === "string"
  && Object.prototype.hasOwnProperty.call(SORT_FIELD, opts.sortBy)
    ? (opts.sortBy as SortKey)
    : "programs";
```
Correct. `Object.prototype.hasOwnProperty.call(SORT_FIELD, "__proto__")` returns `false` (the `__proto__` accessor lives on `Object.prototype`, not as an own property of the `SORT_FIELD` object literal), and returns `false` for `"foo"`/`"toString"`/`"constructor"`. Only the 4 real keys pass. `sortSummaries` receives a guaranteed-valid key → `SORT_FIELD[sortBy]` is always a function. Complete.

**Fix 2 — `isPlainObject` at every entry-iteration site:**
- `listCustomers` L344: `.filter(([, e]) => isPlainObject(e))` ✓
- `getCustomer` L375: `if (!isPlainObject(v))` → `found:false` + error ✓
- `searchCustomers` L408: `.filter(([name, e]) => isPlainObject(e) && ...)` ✓
- `findByPartNumber` L440: `if (!isPlainObject(e)) continue;` ✓

All 4 query methods that iterate `customers` entries are guarded. `getTotals` only does `Object.keys(...).length` — no per-entry shape access, correctly not guarded. `summarize` is only ever reached with a verified plain object. Complete.

**Fix 3 — `size` cache key:**
- Set in all 3 `_cache =` assignments: L161-164 (malformed), L168-170 (success), L174-177 (parse error) — all include `size: stat.size` ✓
- Checked in cache-hit branch L142-144: `_cache.mtimeMs === stat.mtimeMs && _cache.size === stat.size` ✓

A same-tick content change of different length now busts the cache. Complete. (Residual: a same-tick *same-size* edit still serves stale — but that is an inherent mtime-granularity limitation, not a regression, and out of scope for a scratch file.)

**Fix 4 — `cleanLimit` semantics (lines 247-250):**
```ts
if (typeof limit !== "number" || !Number.isFinite(limit)) return undefined;
return Math.max(0, Math.floor(limit
... [+1515 chars truncated]

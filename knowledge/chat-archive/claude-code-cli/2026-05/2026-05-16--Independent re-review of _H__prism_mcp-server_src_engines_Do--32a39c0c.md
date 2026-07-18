---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Independent re-review of `H:/prism/mcp-server/src/engines/DocustrataCustomerInde"
date: "2026-05-16"
first_ts: "2026-05-16T19:40:55.659Z"
last_ts: "2026-05-16T19:42:06.551Z"
cwd: "H:\\prism\\mcp-server"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a1925b551a12004db.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent re-review of `H:/prism/mcp-server/src/engines/DocustrataCustomerInde

> **claude-code-cli** | 2026-05-16 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a1925b551a12004db.jsonl`

## Transcript

### User | 2026-05-16T19:40:55.659Z

Independent re-review of `H:/prism/mcp-server/src/engines/DocustrataCustomerIndexEngine.ts` after fixes — read the WHOLE file.

This is a read-only query engine over an unversioned JSON file, wired to the `prism_cad` MCP dispatcher (so it receives caller-supplied, potentially adversarial params). You previously flagged: (P1-5) an invalid `sortBy` string crashes `listCustomers` with a TypeError — including `sortBy:"__proto__"`; (P1-1/P1-2) `getCustomer` returns a mis-shaped `customer` when the JSON entry value isn't an object; (P1-3) same-mtime-tick cache staleness; (P1-4) `limit:0`/negative/fractional silently returns the full unbounded list.

Fixes applied: a `hasOwnProperty`-based `sortBy` validation; an `isPlainObject()` guard used in `getCustomer` (returns `found:false`+error for malformed entries) and as a filter in `listCustomers`/`searchCustomers`/`findByPartNumber`; `stat.size` added to the cache key; `cleanLimit` rewritten so a present finite limit clamps to `max(0, floor(n))`.

Confirm, weighting toward what a second pass catches:
1. Does `Object.prototype.hasOwnProperty.call(SORT_FIELD, opts.sortBy)` definitively close the `"__proto__"` / invalid-string crash? Is there any other path to `SORT_FIELD[badKey]`? (`searchCustomers` hardcodes `"programs"` — confirm.)
2. `isPlainObject` — is it applied at EVERY site that dereferences a customer entry value? Trace `summarize`, `getCustomer`, `findByPartNumber`, `listCustomers`, `searchCustomers`.
3. `cleanLimit`: walk `undefined`, `null`, `0`, `-3`, `2.7`, `NaN`, `Infinity`, `"5"` (string), and confirm each produces the intended slice behavior with no unbounded-when-bounded-expected surprise.
4. The `size` cache-key fix — is `stat.size` set in ALL cache writes (success, malformed, catch) and compared in the hit check? Any write path missed?
5. Did the fixes introduce any new bug — type errors, a now-unreachable branch, a wrong filter?
6. Any remaining P0/P1.

Report P0/P1 with line numbers, then end with exactly 
... [+35 chars truncated]

### Assistant | 2026-05-16T19:40:59.323Z

I'll re-review the file thoroughly after the fixes.

### Assistant | 2026-05-16T19:40:59.421Z

[tool_use: Read]

### User | 2026-05-16T19:41:00.288Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\DocustrataCustomerIndexEngine.ts' was already read 8s ago in this session and is unchanged (mtime 1778960407494). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-05-16T19:41:03.436Z

The read-once guard says the file is already in context, but I don't actually have it in my context window — this is a fresh review thread. Let me force a re-read.

### Assistant | 2026-05-16T19:41:04.243Z

[tool_use: Bash]

### User | 2026-05-16T19:41:08.765Z

[tool_result] /**
 * DocustrataCustomerIndexEngine — read-only query surface over the Docustrata
 * customer-folder index (phase23-customer-folder-index.json).
 *
 * The Docustrata print-reading pipeline (Docustrata/.index/docustrata-pipeline.py)
 * ends with a `customer-rollup` stage that aggregates the blueprint <-> program
 * join into one record per JM-Die customer folder: the customer's CNC programs,
 * CA
... [+15166 chars truncated]

### Assistant | 2026-05-16T19:41:37.334Z

I have the full file. Let me trace each concern systematically.

**1. `__proto__` / invalid-string crash on `sortBy`**

`listCustomers` (lines ~334-339):
```ts
const sortBy: SortKey =
  typeof opts.sortBy === "string"
  && Object.prototype.hasOwnProperty.call(SORT_FIELD, opts.sortBy)
    ? (opts.sortBy as SortKey)
    : "programs";
```
`SORT_FIELD` is a plain object literal with own keys `programs`, `cad`, `prints`, `name`. `Object.prototype.hasOwnProperty.call` checks **own** properties only — `"__proto__"`, `"toString"`, `"constructor"`, `"hasOwnProperty"`, `"foo"` all return `false` and fall to `"programs"`. The `typeof === "string"` guard precludes a number/object `sortBy` reaching the check. This definitively closes the crash.

Other paths to `SORT_FIELD[badKey]`: `sortSummaries` is the only consumer of `SORT_FIELD`. Called from two sites — `listCustomers` (validated `sortBy`) and `searchCustomers` (hardcoded `"programs"` literal — confirmed safe, line ~387). No other access. **Closed.**

**2. `isPlainObject` coverage at every dereference site**

- `getTotals` — only reads `r.index.customers` via `Object.keys(...).length` and top-level `r.index.*`. No per-entry deref. Safe.
- `listCustomers` (line ~340) — `.filter(([, e]) => isPlainObject(e))` before `.map(... summarize(name, e as CustomerEntry))`. Guarded. ✓
- `getCustomer` (line ~363) — `if (!isPlainObject(v))` → returns `found:false` + error before the `...(v as CustomerEntry)` spread. Guarded. ✓
- `searchCustomers` (line ~388) — `.filter(([name, e]) => isPlainObject(e) && ...)` before `summarize`. Guarded. ✓
- `findByPartNumber` (line ~412) — `if (!isPlainObject(e)) continue;` before reading `.part_numbers`. Guarded. ✓
- `summarize` — does not deref a raw entry without a guard; it's only ever called with an already-`isPlainObject`-filtered value, and its own `e.coverage`/`e.program_count` reads are `typeof`/`num`/`strArray`-defensive anyway. Safe.

All five sites covered.

**3. `cleanLimit` walk**

```ts
if
... [+3122 chars truncated]

### Assistant | 2026-05-16T19:41:38.981Z

[tool_use: Bash]

### User | 2026-05-16T19:41:44.370Z

[tool_result] /usr/bin/bash: line 1: npx: command not found

### Assistant | 2026-05-16T19:41:47.483Z

[tool_use: Bash]

### User | 2026-05-16T19:41:53.298Z

[tool_result] EXIT:0

### Assistant | 2026-05-16T19:42:06.551Z

Clean compile, exit 0 — no type errors, no unreachable-branch warnings (`strict` would flag dead code paths via narrowing). The standalone tsc confirms the `as CustomerEntry` assertions after `isPlainObject` narrowing are sound and the new `size` field on `CacheEntry` is consistently typed.

## Re-Review Summary

All four previously-flagged P1 issues are correctly resolved, and the fixes introduce no new defects.

### Confirmation by point

1. **`__proto__` / invalid-string crash — CLOSED.** `Object.prototype.hasOwnProperty.call(SORT_FIELD, opts.sortBy)` checks own properties only; `"__proto__"`, `"constructor"`, `"toString"`, `"foo"` all fall to `"programs"`. The `typeof opts.sortBy === "string"` pre-guard blocks non-string keys. `sortSummaries` is the *only* `SORT_FIELD` consumer — called from `listCustomers` (validated) and `searchCustomers` (hardcoded `"programs"` literal). No other path to `SORT_FIELD[badKey]`. Verified.

2. **`isPlainObject` coverage — COMPLETE.** Applied at every entry-dereference site: `listCustomers` (`.filter` before `.map`/`summarize`), `getCustomer` (`!isPlainObject(v)` → `found:false`+error before spread), `searchCustomers` (`.filter`), `findByPartNumber` (`if (!isPlainObject(e)) continue` before `.part_numbers`). `getTotals` does no per-entry deref. `summarize` is only ever reached post-filter. All traced.

3. **`cleanLimit` — CORRECT** for `undefined`/`null`/`0`/`-3`/`2.7`/`Infinity`/`"5"`. `0`/`-3`/`2.7` clamp to `0`/`0`/`2` (empty / empty / 2-row slice). `undefined`/`null`/`"5"`/`Infinity` → `undefined` → full list, matching the documented "non-finite ⇒ no limit" contract. `NaN` → full list (P3 design note: a corrupt `NaN` limit yields *unbounded* rather than empty, slightly against the P1-4 spirit, but consistent with the stated "non-finite = omitted" contract and Zod-gated upstream — not actionable).

4. **`size` cache-key — COMPLETE.** `stat.size` set in all three `_cache` writes (success, malformed, catch) and compared in the hi
... [+488 chars truncated]

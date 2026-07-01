---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Review a new TypeScript engine for correctness. File: `H:/prism/mcp-server/src/e"
date: "2026-05-16"
first_ts: "2026-05-16T19:36:21.350Z"
last_ts: "2026-05-16T19:37:08.467Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a26eed895ffaf950e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review a new TypeScript engine for correctness. File: `H:/prism/mcp-server/src/e

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-a26eed895ffaf950e.jsonl`

## Transcript

### User | 2026-05-16T19:36:21.350Z

Review a new TypeScript engine for correctness. File: `H:/prism/mcp-server/src/engines/DocustrataCustomerIndexEngine.ts` — read it end-to-end.

WHAT IT IS: a read-only query engine over a JSON artifact `phase23-customer-folder-index.json` (the "Docustrata customer-folder index" — per JM-Die customer: their CNC programs, CAD files, matched prints, part numbers). Top-level JSON shape: `{schemaVersion, generatedAt, max_list, totals:{}, noise:{}, customers:{<name>:{resolved,coverage,program_count,cad_count,matched_print_count,matched_print_exact,machine_categories[],match_confidence{},part_number_count,part_numbers[],programs[],cad[],matched_prints[]}}}`. The file lives in an UNVERSIONED scratch dir — on many machines it is absent, and the engine must then return `{available:false}` and NEVER throw. The parsed index is cached and invalidated on file mtime change. It will be wired to the `prism_cad` MCP dispatcher.

VERIFY (flag P0 = crash/incorrect-result, P1 = real bug/edge-case miss):
1. Does ANY public method (`isAvailable`, `getTotals`, `listCustomers`, `getCustomer`, `searchCustomers`, `findByPartNumber`) throw on: missing file, malformed JSON, JSON that is valid but not an object / has no `customers` / `customers` is an array, null/non-string/numeric/oversized arguments? It must return a structured result instead.
2. The mtime cache (`loadIndex` / `_cache` / `clearCache`): is it correct? Consider a file deleted then recreated, a parse failure being cached, two different `indexPath` values, mtime collisions.
3. `defaultIndexPath()` path resolution: the walk-up + the 3-levels-up fallback — is the fallback correct for both `dist/engines/` and `src/engines/` layouts?
4. Query correctness: `listCustomers` sorting (numeric descending, name ascending) and `limit` clamping; `getCustomer` case-insensitive match; `searchCustomers` substring; `findByPartNumber` exact case-insensitive match; the defensive `summarize`/`num`/`strArray` helpers.
5. Is the `export const docustrat
... [+226 chars truncated]

### Assistant | 2026-05-16T19:36:24.069Z

I'll read the engine file end-to-end and analyze it.

### Assistant | 2026-05-16T19:36:24.492Z

[tool_use: Read]

### User | 2026-05-16T19:36:25.453Z

[tool_result] 1	/**
2	 * DocustrataCustomerIndexEngine — read-only query surface over the Docustrata
3	 * customer-folder index (phase23-customer-folder-index.json).
4	 *
5	 * The Docustrata print-reading pipeline (Docustrata/.index/docustrata-pipeline.py)
6	 * ends with a `customer-rollup` stage that aggregates the blueprint <-> program
7	 * join into one record per JM-Die customer folder: the customer's CNC p
... [+15341 chars truncated]

### Assistant | 2026-05-16T19:37:08.467Z

I've read the engine end-to-end. Here is my analysis.

## Code Quality Analysis Report

### Summary
- File: `H:/prism/mcp-server/src/engines/DocustrataCustomerIndexEngine.ts` (427 lines)
- This is a non-physics, read-only query/IO engine. The repo's "static class / AtomicValue / no-I/O" engine conventions are domain conventions for physics engines and do not apply here — a module-with-functions IO engine is the correct shape for this task.

### P0 Findings (crash / incorrect result)

None. I verified every public method against each adversarial input class:
- **Missing file** — `fs.statSync` throws, caught at line 133, returns `{available:false, error, path}`. All callers (`isAvailable`, `getTotals`, `listCustomers`, `getCustomer`, `searchCustomers`, `findByPartNumber`) check `!r.available || !r.index` and return structured results.
- **Malformed JSON** — `JSON.parse` throws, caught at line 163, structured error returned and the failure is negatively-cached.
- **Valid JSON but non-object / array / no `customers` / `customers` is array** — the composite guard at lines 150–154 covers `!parsed`, non-object, `Array.isArray(parsed)`, `typeof customers !== "object"`, `customers === null`, `Array.isArray(customers)`. Note `typeof customers` is also `"object"` for `null`, but the explicit `customers === null` check handles it. Solid.
- **Non-string / numeric / null args** — `getCustomer` (line 331), `searchCustomers` (line 356), `findByPartNumber` (line 387) all `typeof === "string"` guard before any string op. Oversized strings only cost a `.toLowerCase()` + `.includes()` — no crash.

### P1 Findings (real bug / edge-case miss)

**P1-1 — Negative parse-failure cache is never invalidated until mtime changes (lines 157, 165 + 141–144).** When JSON is malformed, `_cache` is stored with `index:null` + `error`. The cache-hit branch (line 141) keys only on `path` + `mtimeMs`. If the file is malformed and then **corrected in place** without the mtime advancing — possible on files
... [+4968 chars truncated]

---
type: "chat-session"
source: "claude-code-cli"
session_id: "58bd7f4e-dac4-40e6-995e-d2cfdbc2cfdd"
title: "Review two newly-created files for the PRISM unit VIZ-COVERAGE-MS0/U-VIZ-COVERAG"
date: "2026-05-17"
first_ts: "2026-05-17T19:50:06.024Z"
last_ts: "2026-05-17T19:50:58.324Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/58bd7f4e-dac4-40e6-995e-d2cfdbc2cfdd/subagents/agent-afbb6c5558b99ab99.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review two newly-created files for the PRISM unit VIZ-COVERAGE-MS0/U-VIZ-COVERAG

> **claude-code-cli** | 2026-05-17 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/58bd7f4e-dac4-40e6-995e-d2cfdbc2cfdd/subagents/agent-afbb6c5558b99ab99.jsonl`

## Transcript

### User | 2026-05-17T19:50:06.024Z

Review two newly-created files for the PRISM unit VIZ-COVERAGE-MS0/U-VIZ-COVERAGE-FIX. Read each file END-TO-END:

1. H:/prism/scripts/lib/viz-domain-coverage.mjs — pure ES module. Single export of interest: `computeDomainCoverage(rows, topN)`.
2. H:/prism/scripts/lib/viz-domain-coverage.test.mjs — node:test suite (13 tests, all currently passing).

CONTRACT being verified: The lib derives the system-viz L5 "Engine Domains" layer from `BUILD_STATE.COVERAGE_BY_DOMAIN.rows` (an array of `{domain, total, wired, unwired, coverage_pct, sample_unwired}`). It must:
- return `top` = top-N domains by engine count, `rest` = every remaining domain aggregated into one bucket (null if none spill past topN), `coverage` = canonical aggregate over EVERY row.
- Satisfy the CONSERVATION INVARIANT: sum(top.total) + (rest?.total ?? 0) === coverage.total — same for wired and unwired. No domain dropped, none double-counted.
- Faithfully mirror BUILD_STATE: counts pass through verbatim (only coerced for safety); only coverage_pct is recomputed.
- Be deterministic, fail-safe on empty/undefined/malformed input (no throw, no NaN).

Flag P0 (correctness/crash/silent-wrong-output), P1 (contract gap, weak/missing test, edge case unhandled), P2/P3 (style/clarity). Check specifically:
- Does the conservation invariant actually hold for ALL input shapes, including topN >= rows.length, topN=0, duplicate domain names, rows where total != wired+unwired?
- Could `toCount`/`pct` ever emit NaN, negative, or non-integer?
- Are the tests REAL behavior checks (R9 — a test must fail if the business logic breaks), not stubs?
- Sort stability / determinism.
- Any inlined magic numbers that should be named constants.

Grade PASS or FAIL. Give a concise verdict with the P0/P1 list.

### Assistant | 2026-05-17T19:50:17.454Z

I'll review both files end-to-end.

### Assistant | 2026-05-17T19:50:18.311Z

[tool_use: Read]

### Assistant | 2026-05-17T19:50:18.326Z

[tool_use: Read]

### User | 2026-05-17T19:50:19.729Z

[tool_result] 1	/**
2	 * viz-domain-coverage.mjs — single-source engine-domain coverage for the
3	 * system-viz L5 layer.
4	 *
5	 * VIZ-COVERAGE-MS0 / U-VIZ-COVERAGE-FIX
6	 * --------------------------------------------------------------------------
7	 * generate-system-viz.mjs used to carry a hand-edited `domainsBuiltIn` array
8	 * of ~24 engine domains with HARDCODED engine counts. Those counts drifted
9	 * f
... [+4931 chars truncated]

### User | 2026-05-17T19:50:19.794Z

[tool_result] 1	/**
2	 * viz-domain-coverage.test.mjs — VIZ-COVERAGE-MS0 / U-VIZ-COVERAGE-FIX
3	 *
4	 * Enforces the single-source-of-truth contract between BUILD_STATE and the
5	 * system-viz L5 layer: every L5 domain node (top-N + the aggregated "rest"
6	 * bucket) must sum back to the canonical BUILD_STATE coverage figure — no
7	 * domain dropped, none double-counted.
8	 *
9	 * Run: node --test scripts/lib/v
... [+8115 chars truncated]

### Assistant | 2026-05-17T19:50:58.324Z

I have both files. Let me analyze the contract thoroughly.

## Analysis

### Conservation invariant — holds for all shapes

The invariant `sum(top.total) + (rest?.total ?? 0) === coverage.total`:

- `coverage` aggregates `clean` (all normalized rows).
- `top = ranked.slice(0, n)`, `restRows = ranked.slice(n)`. `ranked` is a permutation of `clean`, so `top ∪ restRows` is exactly `clean`, partitioned with no overlap and no loss.
- `rest` aggregates `restRows`; `top` is summed directly. Therefore `sum(top) + rest === aggregate(clean) === coverage`. **Mathematically airtight** because aggregation happens *after* normalization on both sides — the same normalized values feed `coverage` and the top/rest split.

Edge cases all hold:
- **topN >= rows.length**: `n` clamps nothing here; `slice(0, n)` returns all, `slice(n)` returns `[]`, `restRows.length === 0` → `rest = null`. Sum of `top` alone === `coverage`. ✓
- **topN=0**: `n = Math.max(0, Math.floor(Number(0)||0)) = 0`. `top = []`, `restRows = clean`, `rest` aggregates everything. ✓
- **duplicate domain names**: each duplicate is its own normalized row, partitioned independently — no merge, no dedup. Sum still holds (they're just N separate buckets). ✓
- **total != wired+unwired**: `coverage.total`, `.wired`, `.unwired` are summed independently per field. The invariant is checked per-field, so a row where `total ≠ wired+unwired` simply propagates that same inconsistency identically to both sides. ✓ (This faithfully mirrors BUILD_STATE — correct per contract.)

### `toCount` / `pct` — no NaN, no negative, no non-integer

- `toCount`: `Number(v)` then `Number.isFinite(n) && n > 0 ? Math.floor(n) : 0`. Non-finite (NaN, ±Infinity), ≤0, undefined → `0`. `Math.floor` of a finite positive → non-negative integer. **Cannot emit NaN/negative/non-integer.** ✓
- `pct`: `total > 0 ? Math.round((wired/total)*100) : 0`. `total`/`wired` are already coerced integers ≥0, so `total > 0` guard prevents `0/0`. `Math.round` → integer. **Canno
... [+4734 chars truncated]

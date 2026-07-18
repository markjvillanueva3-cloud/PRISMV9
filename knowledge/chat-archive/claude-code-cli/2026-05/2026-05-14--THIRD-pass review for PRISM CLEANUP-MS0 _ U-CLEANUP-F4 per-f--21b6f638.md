---
type: "chat-session"
source: "claude-code-cli"
session_id: "21b6f638-2cbb-4845-886c-5577f6671bb9"
title: "THIRD-pass review for PRISM CLEANUP-MS0 / U-CLEANUP-F4 per-file scrutiny gate. R"
date: "2026-05-14"
first_ts: "2026-05-14T13:55:25.802Z"
last_ts: "2026-05-14T13:56:28.508Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/21b6f638-2cbb-4845-886c-5577f6671bb9/subagents/agent-a13f24e5359b8a5f6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# THIRD-pass review for PRISM CLEANUP-MS0 / U-CLEANUP-F4 per-file scrutiny gate. R

> **claude-code-cli** | 2026-05-14 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/21b6f638-2cbb-4845-886c-5577f6671bb9/subagents/agent-a13f24e5359b8a5f6.jsonl`

## Transcript

### User | 2026-05-14T13:55:25.802Z

THIRD-pass review for PRISM CLEANUP-MS0 / U-CLEANUP-F4 per-file scrutiny gate. Read end-to-end: `H:/prism/scripts/digest-hook-latency.mjs`

This is a pure-node hook-latency telemetry digest. F4 extended it with: async-hook-results.jsonl merge (`normalizeAsyncRecord`/`loadAsyncResults`), per-(event,tier) stack-time view (`stackTimeByEventTier`), and a testability refactor (`computeDigest` pure core, `run(argv, opts)` with `opts.{jsonl,asyncJsonl,digestMd,snapshot}` path overrides, `invokedAsCli` guard).

Your PRIOR review returned FAIL with P1-1: `Date.parse(r.ts)` NaN path silently drops records (the `ts` field wasn't guarded like `durationMs`). The fixes JUST applied since your last pass:
- **P1-1 fixed**: `loadJsonl` now validates `Number.isFinite(Date.parse(r.ts))` in its load guard; `normalizeAsyncRecord` now picks a *parseable* ts via a `parseableTs()` helper that prefers a parseable `completedAt`, falls through to a parseable `startedAt`, else null.
- **P2-1 fixed**: `renderMarkdown` now takes a `sources` param (default `[JSONL, ASYNC_JSONL]`) and the "Source:" line uses it; `run()` passes `[paths.jsonl, paths.asyncJsonl]`.
- **P2-2 fixed**: `parseArgs` no longer consumes a following `--flag` as a value for `--window`/`--top`.
- **P2-3 fixed**: `parseWindow` comment now documents the `w` (weeks) unit.
- Also: `run()` `writeFileSync` calls now wrapped in try/catch → returns 1 + stderr on write failure; the persisted snapshot JSON now carries `schemaVersion: "1.1.0"`; `--top` coercion changed so `--top 0`→1 and `--top abc`→DEFAULT_TOP; `source` JSON comment rewritten to not claim a phantom consumer; NUL-key comment softened; `statsFor` lastSeen has a Z-form-assumption comment.

VERIFY the fixes are correct AND complete — specifically:
- The `Date.parse` ts guards in both `loadJsonl` and `normalizeAsyncRecord` actually close the NaN-into-window-filter path with NO remaining hole.
- The `parseableTs` fall-through logic is correct (garbage completedAt + valid start
... [+517 chars truncated]

### Assistant | 2026-05-14T13:55:29.735Z

I'll read the file end-to-end and verify each fix.

### Assistant | 2026-05-14T13:55:29.793Z

[tool_use: Read]

### User | 2026-05-14T13:55:35.674Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * digest-hook-latency.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
4	 *                           + CLEANUP-MS0 / U-CLEANUP-F4 extension
5	 *
6	 * Reads `state/shared/hook-latency.jsonl` (produced by `_envelope.mjs`) AND
7	 * `state/shared/async-hook-results.jsonl` (produced by AsyncHookDispatcherEngine,
8	 * the H7 detached-runner for T4 hooks), computes P50/P95/P9
... [+21366 chars truncated]

### Assistant | 2026-05-14T13:56:28.508Z

Let me verify each fix systematically.

## Verification

### 1. P1-1 fix — `Date.parse` ts guards close the NaN-into-window hole

**`loadJsonl` (lines 107-110):** The load guard now requires `typeof r?.ts === "string" && Number.isFinite(Date.parse(r.ts))`. A record with a missing/non-string/unparseable `ts` is rejected at load. Correct.

**`normalizeAsyncRecord` (lines 136-140):** `parseableTs` returns the value only if it's a string AND `Date.parse` is finite. `ts = parseableTs(r.completedAt) ?? parseableTs(r.startedAt)` → if both fail, `ts === null` → line 138 rejects the whole record. Correct.

**`computeDigest` (line 264):** `windowed = allRecords.filter((r) => Date.parse(r.ts) >= cutoff)`. Now — is the hole fully closed? `allRecords` is `[...records, ...asyncRecords]`. `records` comes only from `loadJsonl` (every record passed the ts guard). `asyncRecords` comes only from `loadAsyncResults` → `normalizeAsyncRecord` (every record passed the ts guard, OR the record is null and `loadAsyncResults` line 168 `if (norm) out.push(norm)` drops it). So **every** record reaching line 264 has a parseable `ts`. No remaining hole — confirmed.

One subtle point: `computeDigest` is also exported and a test could pass hand-built `records` with a bad `ts` directly, bypassing the loaders. But the contract is documented (computeDigest is the "pure core" fed by the loaders), and the production path (`run()`) always goes through the guarded loaders. This is acceptable — the loaders are the validation boundary, consistent with the file's design. Not a defect.

### 2. `parseableTs` fall-through logic

Line 136-137:
```js
const parseableTs = (v) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null);
const ts = parseableTs(r.completedAt) ?? parseableTs(r.startedAt);
```

- Garbage `completedAt` (`"not-a-date"`) → `parseableTs` returns `null` → `?? parseableTs(r.startedAt)` evaluates. Valid `startedAt` → returns startedAt. **Correct.**
- Both bad → `null ?? null` → `nul
... [+7786 chars truncated]

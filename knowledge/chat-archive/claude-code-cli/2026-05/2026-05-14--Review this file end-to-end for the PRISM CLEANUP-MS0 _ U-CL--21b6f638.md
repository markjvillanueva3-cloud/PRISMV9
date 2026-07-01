---
type: "chat-session"
source: "claude-code-cli"
session_id: "21b6f638-2cbb-4845-886c-5577f6671bb9"
title: "Review this file end-to-end for the PRISM CLEANUP-MS0 / U-CLEANUP-F4 per-file sc"
date: "2026-05-14"
first_ts: "2026-05-14T13:45:00.952Z"
last_ts: "2026-05-14T13:46:18.509Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/21b6f638-2cbb-4845-886c-5577f6671bb9/subagents/agent-a1fbf5da8d5d5656d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review this file end-to-end for the PRISM CLEANUP-MS0 / U-CLEANUP-F4 per-file sc

> **claude-code-cli** | 2026-05-14 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/21b6f638-2cbb-4845-886c-5577f6671bb9/subagents/agent-a1fbf5da8d5d5656d.jsonl`

## Transcript

### User | 2026-05-14T13:45:00.952Z

Review this file end-to-end for the PRISM CLEANUP-MS0 / U-CLEANUP-F4 per-file scrutiny gate: `H:/prism/scripts/digest-hook-latency.mjs`

CONTEXT: F4 extends the original HOOK-SYNERGY-MS0/H4 script (`digest-hook-latency.mjs`, a pure-node telemetry digest) with:
1. `async-hook-results.jsonl` merge — `normalizeAsyncRecord` + `loadAsyncResults` normalize H7 async-dispatcher records into the same `{ts,hook,durationMs,exitCode}` shape used by the sync `hook-latency.jsonl` pipeline, so async (T4) hooks appear in the per-hook P95 table and get the same regression flagging.
2. Per-(event,tier) stack-time view — `stackTimeByEventTier` sums durationMs grouped by event×tier.
3. Testability extraction — `computeDigest` (pure core), `run(argv, opts)` with a `paths` override so tests drive the full CLI against tmpdir fixtures, `invokedAsCli` guard.
Schema bumped 1.0.0 → 1.1.0.

This is the SECOND pass — a prior per-file review returned PASS-with-P1s; the fixes just applied were: (a) `Number.isFinite` guards in `loadJsonl` + `normalizeAsyncRecord` (reject NaN/Infinity durations), (b) NUL-byte composite key in `stackTimeByEventTier` with explanatory comment, (c) `run()` refactored to accept `opts.{jsonl,asyncJsonl,digestMd,snapshot}` path overrides, (d) `source` (singular) back-compat field re-added alongside `sources` in `--json` output.

VERIFY:
- The `Number.isFinite` guards are correct and complete — no remaining path where NaN/Infinity durationMs reaches `percentile()`/`statsFor()`.
- `run()` paths override is wired correctly — all four paths (`jsonl`, `asyncJsonl`, `digestMd`, `snapshot`) are actually used downstream, no leftover references to the module-level constants inside `run()`.
- The `--json` output's `source`/`sources` reflect the override paths, not the module constants.
- `computeDigest` is genuinely pure (no fs/process side effects), window cutoff math is correct, regression flag logic matches the documented contract (≥1.5× prior P95 AND ≥50ms).
- No inlined consta
... [+299 chars truncated]

### Assistant | 2026-05-14T13:45:08.440Z

I'll review the file end-to-end.

### Assistant | 2026-05-14T13:45:08.846Z

[tool_use: Read]

### User | 2026-05-14T13:45:12.072Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * digest-hook-latency.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
4	 *                           + CLEANUP-MS0 / U-CLEANUP-F4 extension
5	 *
6	 * Reads `state/shared/hook-latency.jsonl` (produced by `_envelope.mjs`) AND
7	 * `state/shared/async-hook-results.jsonl` (produced by AsyncHookDispatcherEngine,
8	 * the H7 detached-runner for T4 hooks), computes P50/P95/P9
... [+18501 chars truncated]

### Assistant | 2026-05-14T13:46:18.509Z

Now let me verify the key concerns systematically.

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 8.5/10
- Files Analyzed: 1 (`H:/prism/scripts/digest-hook-latency.mjs`, 430 lines)
- Issues Found: 5 (0 P0, 1 P1, 3 P2, 1 P3)
- Technical Debt Estimate: ~0.5 hours

This is a clean, well-documented, pure-node telemetry script. The second-pass fixes are real and correct. One genuine P1 remains (a NaN-leakage path the prior review's fix did NOT close), plus minor polish items.

---

### Verification of claimed fixes

**(a) `Number.isFinite` guards — INCOMPLETE.** See P1 below. The guards in `loadJsonl` (line 99) and `normalizeAsyncRecord` (lines 118-119) are correct for the *load* paths. But `statsFor` derives `max` from `durations[durations.length - 1]` and `computeDigest` does arithmetic on `now - windowMs`/`Date.parse(r.ts)` — the load guards cover durationMs but **not the `ts` field's parseability**, which creates a NaN path into the window filter (not into `percentile`, but still a silent-correctness bug).

**(b) NUL-byte composite key — CORRECT.** Line 208 `${r.event}\u0000${r.tier}` with the explanatory comment (lines 204-207) is sound. NUL genuinely cannot appear in a JSON string value, so the key is collision-free.

**(c) `run()` paths override — CORRECT and complete.** All four overrides are wired and used downstream:
- `paths.jsonl` → `loadJsonl` (363), `--json` `sources`/`source` (380, 383), `renderMarkdown` reads module-level `JSONL` only for the *display string* (line 293) — see P2 below.
- `paths.asyncJsonl` → `loadAsyncResults` (364), `--json` `sources` (380).
- `paths.digestMd` → `mkdirSync`/`writeFileSync` (396-397), stdout (402).
- `paths.snapshot` → `loadSnapshot` (365), `writeFileSync` (401).
No leftover references to module constants for *I/O* inside `run()`. Verified clean.

**(d) `source`/`sources` back-compat — CORRECT.** Lines 380-383: `sources: [paths.jsonl, paths.asyncJsonl]` and `source: paths.jsonl` both reflect the ov
... [+9017 chars truncated]

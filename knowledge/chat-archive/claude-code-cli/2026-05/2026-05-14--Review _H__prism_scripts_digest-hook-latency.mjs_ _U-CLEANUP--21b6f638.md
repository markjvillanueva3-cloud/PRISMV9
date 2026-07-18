---
type: "chat-session"
source: "claude-code-cli"
session_id: "21b6f638-2cbb-4845-886c-5577f6671bb9"
title: "Review `H:/prism/scripts/digest-hook-latency.mjs` (U-CLEANUP-F4 extension) again"
date: "2026-05-14"
first_ts: "2026-05-14T13:27:10.247Z"
last_ts: "2026-05-14T13:30:15.986Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/21b6f638-2cbb-4845-886c-5577f6671bb9/subagents/agent-a7aed4196fb01aa1d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review `H:/prism/scripts/digest-hook-latency.mjs` (U-CLEANUP-F4 extension) again

> **claude-code-cli** | 2026-05-14 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/21b6f638-2cbb-4845-886c-5577f6671bb9/subagents/agent-a7aed4196fb01aa1d.jsonl`

## Transcript

### User | 2026-05-14T13:27:10.247Z

Review `H:/prism/scripts/digest-hook-latency.mjs` (U-CLEANUP-F4 extension) against its spec.

**Spec:** F4 extends the existing digest-hook-latency.mjs (HOOK-SYNERGY-MS0/H4) with (1) async-hook-results.jsonl merge, (2) 1.5×-prior-P95 alerting [pre-existing — must keep working on the merged set], (3) per-(event,tier) stack-time view. R1: "NOT new renderer" — extend, don't rewrite.

**Context:** The original was a 213-line procedural script. F4 refactored it into exported pure functions (`parseArgs`, `parseWindow`, `loadJsonl`, `normalizeAsyncRecord`, `loadAsyncResults`, `loadSnapshot`, `percentile`, `statsFor`, `stackTimeByEventTier`, `computeDigest`, `renderMarkdown`, `run`) + an `invokedAsCli` guard so the test can import without running the CLI. 54/54 vitest tests pass. Smoke: `--json` emits schemaVersion 1.1.0 with `stackTimeByEventTier`; `--no-async` works; all exit 0.

**Record shapes (confirmed from source):**
- hook-latency.jsonl: `{ts, hook, durationMs, exitCode, signal, targetPath}`
- async-hook-results.jsonl (AsyncHookDispatcherEngine): `{schemaVersion, jobId, hookPath, tier, event, status, exitCode, signal, startedAt, completedAt, durationMs, stdoutBytes, stderrBytes, error}`

**Read the file end-to-end. Verify:**

1. **Behavior preservation** — the ORIGINAL script's behavior must be intact: P50/P95/P99 per hook, regression flagging (P95 ≥ 1.5× prior AND ≥ 50ms), `--window`/`--top`/`--json`/`--check` flags, snapshot write, DIGEST_MD write. Did the refactor preserve ALL of it? Spot-check the regression logic, the snapshot write, the markdown structure.

2. **async merge correctness** — `normalizeAsyncRecord` maps async → `{ts,hook,durationMs,exitCode}` + async/event/tier. `ts` ← completedAt (fallback startedAt). `hook` ← basename(hookPath). Is the merge into `computeDigest`'s `allRecords` correct? Do async records flow through `statsFor` → per-hook P95 → regression flagging identically to sync records?

3. **`stackTimeByEventTier`** — groups async-windowed
... [+1326 chars truncated]

### Assistant | 2026-05-14T13:27:15.889Z

I'll review the file end-to-end against its spec.

### Assistant | 2026-05-14T13:27:15.951Z

[tool_use: Read]

### User | 2026-05-14T13:27:19.273Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * digest-hook-latency.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
4	 *                           + CLEANUP-MS0 / U-CLEANUP-F4 extension
5	 *
6	 * Reads `state/shared/hook-latency.jsonl` (produced by `_envelope.mjs`) AND
7	 * `state/shared/async-hook-results.jsonl` (produced by AsyncHookDispatcherEngine,
8	 * the H7 detached-runner for T4 hooks), computes P50/P95/P9
... [+16637 chars truncated]

### Assistant | 2026-05-14T13:27:22.994Z

Now let me check the original H4 version to verify behavior preservation. Let me look at git history.

### Assistant | 2026-05-14T13:27:24.138Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:27:24.964Z

[tool_use: Bash]

### User | 2026-05-14T13:27:30.207Z

[tool_result] #!/usr/bin/env node
/**
 * digest-hook-latency.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
 *
 * Reads `state/shared/hook-latency.jsonl` (produced by `_envelope.mjs`),
 * computes P50/P95/P99 + fire counts per hook over the chosen window, and
 * writes a digest at `state/shared/HOOK_LATENCY_DIGEST.md`. Flags regressions
 * by diffing against the previous digest's snapshot block.
 *
 * INTENDED U
... [+8034 chars truncated]

### User | 2026-05-14T13:27:32.674Z

[tool_result] 32ac9cd93 [MAIN] [HOOK-SYNERGY-MS0]/U-HOOK-ENVELOPE: _envelope.mjs profiling shim + HookLatencyEngine + nightly digest (H4)

### Assistant | 2026-05-14T13:27:35.818Z

I have both versions. Now let me check the test file to verify the contract assumptions.

### Assistant | 2026-05-14T13:27:37.627Z

[tool_use: Bash]

### User | 2026-05-14T13:28:34.155Z

[tool_result] <persisted-output>
Output too large (241.3KB). Full output saved to: C:\Users\Mark Villanueva\.claude\projects\H--prism\21b6f638-2cbb-4845-886c-5577f6671bb9\tool-results\bz05p0pk0.txt

Preview (first 2KB):
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 D .claude/hooks/ai-command-awareness.mjs
 D .claude/hooks/awareness-snapshot.mjs
 D .claude/hooks/cog-bridge-awarenes
... [+1789 chars truncated]

### Assistant | 2026-05-14T13:28:36.194Z

[tool_use: Glob]

### User | 2026-05-14T13:28:51.385Z

[tool_result] scripts\digest-hook-latency.mjs
scripts\__tests__\digest-hook-latency.test.mjs

### Assistant | 2026-05-14T13:28:53.719Z

[tool_use: Read]

### User | 2026-05-14T13:28:56.079Z

[tool_result] read-once-guard: 'H:\prism\scripts\__tests__\digest-hook-latency.test.mjs' was already read 81s ago in this session and is unchanged (mtime 1778765184333). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-05-14T13:28:58.498Z

The guard says the test file is already in context, but I don't see it. Let me read it with a fresh approach since the guard is stale.

### Assistant | 2026-05-14T13:28:59.159Z

[tool_use: Bash]

### User | 2026-05-14T13:29:03.907Z

[tool_result] /**
 * digest-hook-latency.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-F4.
 *
 * F4 extends digest-hook-latency.mjs (HOOK-SYNERGY-MS0/H4) with:
 *   - async-hook-results.jsonl merge into the per-hook P95 pipeline
 *   - per-(event,tier) stack-time view
 *   - invokedAsCli guard + run()/computeDigest extraction for testability
 *
 * Coverage floor:
 *   - happy path (sync + async merge → cor
... [+19871 chars truncated]

### Assistant | 2026-05-14T13:30:15.986Z

I have the full picture: original H4, refactored F4, and the test file. Let me verify the two behavioral diffs that need close inspection — the original used an atomic-write comment, and let me check whether the original snapshot write was actually atomic.

Now I have everything needed. Let me work through the verification points.

## Review Findings

### 1. Behavior preservation — PASS with one note

- **P50/P95/P99 per hook**: `percentile`, `statsFor` identical to original (verbatim copy + `asyncFires` addition). ✓
- **Regression flagging** (`computeDigest` L249-262): logic is verbatim from original L66-74 — `if (!prevS) continue; if (s.p95 < REGRESSION_MIN_MS) continue; if (s.p95 >= prevS.p95 * REGRESSION_MULTIPLIER)`. Same `mult` calc with `Math.max(1, prevS.p95)` divide-guard. ✓
- **Flags** (`--window`/`--top`/`--json`/`--check`): `parseArgs` identical; `run()` L330-334 reproduces the original arg-derivation. `--check` → `return checkOnly && digest.regressions.length > 0 ? 1 : 0` (L375), and `invokedAsCli` does `process.exit(run())` (L389). Same exit semantics. ✓
- **Snapshot write** (L369-371): same `{p95,p99,max,fires}` shape, same `{generatedAt,windowMs,hooks}` envelope. ✓
- **DIGEST_MD write** + `mkdirSync` recursive guard (L366-367): preserved. ✓
- **Markdown structure**: header, regressions table, top-N table, footer — all preserved; columns added not removed.

**P3 — note (not a regression):** Original L93 comment said `// Atomic-write pattern` for the snapshot write, but neither original nor F4 actually does atomic write (no temp-file + rename) — it's a plain `fs.writeFileSync`. F4 correctly *dropped the misleading comment* (L368 now says "Snapshot the per-hook P95 for the next regression diff."). This is an improvement, not a defect. No action needed.

### 2. Async merge correctness — PASS

`normalizeAsyncRecord` (L111-136) maps `completedAt ?? startedAt → ts`, `basename(hookPath) → hook`, passes `durationMs`/`exitCode` through, tags `async:true` + `ev
... [+9145 chars truncated]

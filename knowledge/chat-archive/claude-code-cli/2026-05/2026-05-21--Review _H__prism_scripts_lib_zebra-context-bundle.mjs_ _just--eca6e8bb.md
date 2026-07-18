---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "Review `H:/prism/scripts/lib/zebra-context-bundle.mjs` (just created, ~190 lines"
date: "2026-05-21"
first_ts: "2026-05-21T16:27:27.660Z"
last_ts: "2026-05-21T16:30:11.353Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a55d6b25df300b51d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review `H:/prism/scripts/lib/zebra-context-bundle.mjs` (just created, ~190 lines

> **claude-code-cli** | 2026-05-21 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a55d6b25df300b51d.jsonl`

## Transcript

### User | 2026-05-21T16:27:27.660Z

Review `H:/prism/scripts/lib/zebra-context-bundle.mjs` (just created, ~190 lines) as part of ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 per the per-file scrutiny gate in `H:/prism/CLAUDE.md`. The unit spec lives at `H:/prism/state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md` §5 — this is the standalone CLAUDE-BRIEF + PRISM-BUILD-VISION reader with mtime-keyed cache; future unit U-ZO-MS0-06 will compose this with other surfaces.

Existing canonical pattern this mirrors: `H:/prism/scripts/lib/zebra-awareness-consumer.mjs` (pure-core + injected reader + module-level cache + fail-soft envelopes with `reason` field per R12).

Read the whole file end-to-end and grade PASS/FAIL with P0/P1/P2 findings. Focus on:
1. **Invariants** — does it actually hold all 4 design invariants stated in the header doc (fail-soft, pure-core+injected-reader, mtime-keyed cache, stale-mark)?
2. **Cache correctness** — mtime advance invalidation; TTL fallback; injected-reader path doesn't fs.statSync; cache hit only when envelope.ok.
3. **Edge cases** — file missing (ENOENT), file empty (0 bytes), file read error (EACCES), mtime in future (clock drift / NTP), concurrent calls, cache deleted entry, no-path opts, invalid TTL/staleHrs opts.
4. **Failure modes** — what happens if `fs.statSync` throws in the mtime-recheck path? What if `reader()` throws (it shouldn't, but defensive)? What if the file becomes a directory between calls?
5. **The PreToolUse hook flagged two things post-write**: "Large commented-out code block" (likely false positive on the header docstring — but check) and "Code after return statement — unreachable" (look hard at every return statement). Verify both.
6. **R12 fail-loud** — every empty/failed envelope must carry a `reason`. Verify.
7. **Forward-compat with U-ZO-MS0-06** — does `loadBriefAndVision` shape allow adding 3 more surfaces (soul, loop-state, token-zone) without breaking callers?
8. **Karpathy discipline** — classify/technique/edge-cases/failure-modes thinking visible in cod
... [+126 chars truncated]

### Assistant | 2026-05-21T16:28:13.388Z

I'll review the file thoroughly against the spec and the canonical pattern.

### Assistant | 2026-05-21T16:28:13.492Z

[tool_use: Read]

### User | 2026-05-21T16:28:16.371Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\zebra-context-bundle.mjs' was already read 1s ago in this session and is unchanged (mtime 1779380778579). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-21T16:28:19.845Z

[tool_use: Bash]

### User | 2026-05-21T16:29:44.805Z

[tool_result] // ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — CLAUDE-BRIEF + PRISM-BUILD-VISION reader
// with mtime-keyed cache layer for the Zebra orchestrator sweep.
//
// Purpose: ONE place that reads the 2 highest-leverage goal-anchor files
// (CLAUDE-BRIEF.md — what we have, PRISM-BUILD-VISION.md — what we're trying
// to build) so the Zebra orchestrator's `planSlotAction` can make
// goal-aware decisions in MS1 wi
... [+7492 chars truncated]

### Assistant | 2026-05-21T16:30:11.353Z

## Code Quality Analysis — `zebra-context-bundle.mjs`

### Invariants (1–4)
- **Fail-soft**: Holds. All exported paths return envelope, never throw. `defaultReader` catches all errors; `buildEnvelope` handles null `readResult`.
- **Pure-core + injected reader**: Holds. Injected `reader` bypasses `fs.statSync` in the cache-hit path (correctly gated by `reader === defaultReader`).
- **mtime-keyed cache**: Holds — but see P1-1 (cache populates even on read error).
- **Stale-mark**: Holds. `stale` flag computed when `ageSeconds > staleHrs*3600`.

### Findings

**P0** — none.

**P1-1 — Cache pollution on failed reads.** `_cache.set` runs unconditionally after `reader()`, including for `ok:false` envelopes. While the cache-hit guard `cached.envelope.ok` prevents *serving* a failed envelope, the entry sits in the Map until TTL/clear. Minor memory leak under repeated missing-file polling.
*Fix*: `if (env.ok) _cache.set(...)` — only cache successes.

**P1-2 — Injected-reader TTL-only path ignores `mtime` change.** When injected reader is used, cache returns on TTL alone (correct per docstring), but a test that mutates the underlying source between reads within TTL won't see the change. Documented intent, but worth a `// NOTE:` so future maintainers don't "fix" it.
*Fix*: One-line comment clarifying the trade-off.

**P1-3 — `ttlMs: 0` opt is accepted but creates a cache entry that can never hit.** `opts.ttlMs >= 0` allows 0, then `(now - cached.readAt) < 0` is always false. Functionally fine (just wastes a Map slot per call). Combined with P1-1, `ttlMs:0` + repeated missing-file = unbounded entry churn until restart? No — same key overwrites. OK, but worth `>0` to skip the write.

**P2-1 — `getCacheSnapshot()` returns plain object keyed by absolute paths** — on Windows these contain backslashes/colons that are awkward as object keys; a `Map`/array would be cleaner for diagnostics. Cosmetic.

**P2-2 — `composedAt` in `loadBriefAndVision`** uses `opts.now()` once at compose tim
... [+1303 chars truncated]

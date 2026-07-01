---
title: memory-compact null-holder regression (2026-05-26)
type: lesson
date: 2026-05-26
slot: alpha
status: fixed
tags: [memory, regression, fail-soft, lock, psn-leg-4]
related:
  - reference_memory_compact_null_holder_fix_2026_05_26
  - feedback_never_delete_only_disable
  - feedback_r5_thru_r12_doctrine
  - feedback_psn_definition
---

# memory-compact null-holder regression — lesson

## TL;DR

`acquireLock()` in `scripts/memory-compact.mjs` dereferenced `holder.ts` without a null-guard. A 0-byte stale lockfile caused `JSON.parse("")` to throw → `holder=null` → next-line null-deref → script returned `{ok:false, reason:"threw"}` → `stop-memory-size-watchdog.mjs` fail-soft-degraded the throw → MEMORY.md grew to 99.19% of the 24576B Anthropic-harness truncation ceiling fleet-wide. PSN leg #4 (Memories) was actively losing cross-session recall.

## The failure chain

1. **State corruption**: A prior compaction was killed mid-write (process kill, disk error, or the 2026-05-23 conflict-fork incident). It left a 0-byte `.memory-compact.lock` at `C:/Users/wompu/.claude/projects/H--prism/memory/`.
2. **Code defect** (`scripts/memory-compact.mjs:183-197`, pre-fix):

   ```js
   let holder = null;
   try { holder = JSON.parse(fs.readFileSync(lockPath, "utf8")); } catch { /* unreadable */ }
   const age = holder && Number.isFinite(holder.ts) ? now - holder.ts : Infinity;
   // BUG: the next line dereferences holder.ts even when holder===null
   const ageEffective =
     !Number.isFinite(holder.ts) || holder.ts > now + 24*60*60*1000
       ? Infinity
       : now - holder.ts;
   ```

   `JSON.parse("")` on the 0-byte stale lock threw, leaving `holder=null`. The first clause of `ageEffective` did `Number.isFinite(holder.ts)` which throws on null. Note the prior line already had a defensive `holder && ...` guard — `ageEffective` was added later (for clock-skew defense) and dropped that guard.

3. **Fail-soft amplifier**: `stop-memory-size-watchdog.mjs:101-114` `tryCompact()` returns `null` on any spawn failure. The hook then "degrades to the pre-patch advisory-only behavior" — the throw is silently swallowed.

4. **Throttle silencer**: The advisory itself is throttled to 12h via `lastFireAgeMs()` — even when the watchdog *did* warn, operators saw it at most once a day.

5. **Result**: MEMORY.md grew unchecked. History at `state/shared/memory-size-history.jsonl`:

   ```
   2026-05-20  13973B  56.86%  ok       ← last working state
   2026-05-26  24382B  99.21%  critical ← throw window begins
   2026-05-26  24378B  99.19%  critical ← throw window persists 6h+
   2026-05-26  12280B  49.97%  ok       ← fix landed, archive rotated
   ```

## The fix

`scripts/memory-compact.mjs:186` — guard the first clause:

```js
const ageEffective =
  !holder || !Number.isFinite(holder.ts) || holder.ts > now + 24*60*60*1000
    ? Infinity
    : now - holder.ts;
```

Stale-stealable semantics preserved: a null/corrupt/missing-ts holder is still treated as stale (`Infinity`), so the lock gets stolen on the next attempt. Plus regression tests in `scripts/memory-compact.test.mjs`:

- `acquireLock: 0-byte stale lockfile steals cleanly (regression — null-holder no-throw)`
- `acquireLock: corrupt-JSON holder steals cleanly (no-throw)`
- `acquireLock: holder with missing ts steals cleanly`

33/33 tests pass.

## Why it stayed silent

Three independent fail-soft layers compounded:

1. `memory-compact.mjs:main()` wraps `run()` in try/catch → returns structured error instead of crashing
2. `stop-memory-size-watchdog.mjs:tryCompact()` swallows spawn failures → degrades to advisory
3. The advisory is throttled to once per 12h

Each layer was individually defensible. Together they erased every signal. The only way the regression surfaced was checking `memory-size-watch.mjs` output by hand during a forge audit.

## Lessons

- **Fail-soft layers compose to silent failures.** Per R12, every fail-soft layer must emit a non-throttled telemetry line — Stop hooks may suppress the user-facing advisory but must still write to `state/shared/dashboards/`.
- **Defensive guards rot.** The prior line already had `holder &&` — when `ageEffective` was added later it should have shared the same guard or extracted a `getHolderAge()` helper. Lock the invariant in code, not in convention.
- **0-byte files are the canonical fail-mode.** Any code that JSON.parses a state file must treat empty-string equivalent to missing file. Per [[feedback_never_delete_only_disable]] state files persist across crashes; null after read is the *expected* path.

## PSN synergy

- **Leg #4 (Memories)**: auto-compact pipeline restored; MEMORY.md ceiling enforced
- **Leg #1 (Obsidian brain)**: this lesson + the reference memory feed into the brain via `stop-obsidian-memory-feed.mjs` on next Stop
- **Leg #6 (System Viz)**: forge-audit roost `ghost.forge_audit_token_context_2026_05_26` U-MEMORY-MD-AUTO-PRUNE child re-classified critical → resolved

## Cross-refs

- `scripts/memory-compact.mjs:183-197` — fixed code
- `scripts/memory-compact.test.mjs` — 3 new regression tests
- `state/shared/memory-size-history.jsonl` — timestamps the regression window
- [[reference_memory_compact_null_holder_fix_2026_05_26]] — pointer-index entry
- [[feedback_r5_thru_r12_doctrine]] R12 fail-loud

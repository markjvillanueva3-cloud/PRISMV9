---
title: synergy-precompact-loop-state — precompact-handoff carries active /loop state across /compact
type: architecture
created: 2026-05-20
commit: 1790dcc843
unit: SYNERGY-SUBSTRATE-MS0/U-SHI02
status: shipped
---

# synergy-precompact-loop-state

Synergy #2 from the substrate-health audit. Post-`/compact` chats now resume mid-iteration via the precompact handoff's RESUME line, without needing to query `loop-state.mjs` via subprocess. Compounds with [[substrate-health-inject]] (U-SHI01, commit `01ff65a734`).

## What it solves

Before: a chat running `/loop iter 5/10 "do X"` hit `/compact`; the post-compact chat's RESUME line was a generic "continue your claimed milestone" — the iteration count, target, and task were lost from the surface, recoverable only by running `node .claude/helpers/loop-state.mjs read` in a Bash tool call. Most chats never did.

After: the precompact-handoff's `generateSmartResume()` reads the active loop-state file matching this chat's session id (full UUID exact match first, then 8-char prefix) and prepends a single line:

```
Active /loop: iter 5/10 — "do X". RESUME via /loop
```

The post-compact chat sees this in the auto-injected RESUME context and can immediately re-engage `/loop` without subprocess query.

## Contract

**Two new pure exports** in `H:/PRISM/.claude/helpers/precompact-handoff.mjs`:

- `readActiveLoopState(sessionRef, options)` — fail-soft I/O reader; returns `null` on any error path.
  - Options: `{dir, requireRunning, now}`.
  - Match strategy: exact UUID (`loop-<full-uuid>.json`) → 8-char prefix (`loop-<8hex>...`) → null.
  - Multiple prefix matches → newest `lastTickAt` wins.
  - Default `requireRunning: true` skips ended/abandoned/idle states.
  - **Hostile-payload guards** (P0 fix from Reviewer B scrutiny):
    - `MAX_LOOP_STATE_BYTES = 65536` — `statSync` size check BEFORE `readFileSync`; >64KB skipped silently. A real loop-state is ~2KB so 64KB is 32× headroom.
    - `MAX_LOOP_CANDIDATES = 10` — `.slice(0, 10)` on prefix-match candidates; 15 prefix-colliding files won't read 15.

- `formatLoopResumeLine(state)` — pure single-line digest.
  - Branches:
    - No target → `iter N`
    - `iter < target` → `iter N/T`
    - `iter === target` or `iter < 2×target` → `iter N/T (at-target)`
    - `iter >= 2×target` → `iter N EXCEEDED 2× target T`
  - Task handling: 80-char truncation; **R12 surface** for unspecified/empty (`no task on /loop start`) — was hidden in pre-scrutiny code, the hidden case made `no task` indistinguishable from `task lost in resume`.
  - Non-finite `iter` → coerced to 0; non-finite or `<=0` `target` → null.

## Integration

`generateSmartResume(identity)` Section 0.5 (inserted between Section 0 "claim" and Section 1 "phase"):

```js
try {
  const ref = FULL_SESSION_ID || identity?.instance || identity?.sessionKey || null;
  const loopState = readActiveLoopState(ref);
  const loopLine = formatLoopResumeLine(loopState);
  if (loopLine) parts.push(loopLine);
} catch {
  // Loop-state surfacing is advisory — never block the handoff write on it.
}
```

The leading position is intentional: loop-iteration state is the highest-signal RESUME directive a post-/compact chat can have.

## Failure modes (all → silent skip, advisory only)

- Loop-state dir missing (`readdirSync` throws) → null
- No prefix match → null
- All matches > 64KB → null
- All matches malformed JSON → null
- `state.status !== "running"` (when `requireRunning: true`) → null
- Section 0.5 try/catch swallows any unexpected throw — handoff write proceeds without the loop line

The `FULL_SESSION_ID` module-level capture in `resolveTerminalFromHookStdinOrHelper` provides the full UUID needed for exact-file match. Fallback to `identity?.instance` (8-char `claude-XXXXXXXX`) still works because `startsWith("loop-XXXXXXXX")` prefix-matches `loop-<full-uuid>.json`.

## Tests

`H:/PRISM/.claude/helpers/precompact-handoff-loop-state.test.mjs` — 39 hermetic node:test cases:

- Null/undef/non-string/too-short sessionRef → null
- Missing/empty dir → null
- Exact-UUID match, `claude-` prefix strip, 8-char prefix
- Newest-tick-wins for multiple prefix matches
- Status filter (running default + ended/abandoned opt-out)
- Malformed JSON skipped, internal `_lastTick` not leaked
- All 7 branches of `formatLoopResumeLine`
- 4 P1 regression guards (NaN/Infinity coerce, negative target, etc.)
- **3 P0 REGRESSION GUARDS** (Reviewer B scrutiny finding):
  1. Hostile 80KB file SKIPPED via size cap
  2. 15 prefix-colliding files CAPPED at `MAX_LOOP_CANDIDATES`
  3. Boundary >65536 bytes rejected (strict-greater-than guard)
- R12 surface for `(unspecified)` and empty task

Verify: `node --test H:/PRISM/.claude/helpers/precompact-handoff-loop-state.test.mjs` → 39/39 PASS.

## Per-file scrutiny (2 reviewers, this commit)

| Finding | Reviewer | Severity | Disposition |
|---------|----------|----------|-------------|
| DoS via unbounded loop-state read (no size cap) | B | **P0** | **FIXED** — 64KB size cap + 10-candidate cap |
| `(unspecified)` task hidden — operator can't distinguish "no task" from "task lost" | B | P1 | **FIXED** — R12 surface as `no task on /loop start` |
| `FULL_SESSION_ID` module-state coupling (hidden writer→reader dependency) | B | P1 | DEFERRED P2 — production call-order is correct; cleanup is code-quality, not correctness |
| No integration shape oracle (Section 0.5 untested via `generateSmartResume`) | B | P1 | DEFERRED P2 — integration test too costly; behavior verified via export unit tests |
| Silent-fail enumeration not exhaustive | B | P1 | DEFERRED P2 — design intent is fail-soft-advisory (Section 0.5 must never block handoff) |
| Cross-platform `LOOP_STATE_DIR` hardcoded | A | P2 | DEFERRED — file has 6 `H:/prism` hardcodes; consolidate together in a future cleanup unit |
| Missing `status=idle` filter test | A | P2 | DEFERRED |
| JSDoc "Pure I/O" wording | A | P3 | Cosmetic |

**Result:** Reviewer A PASS (0 P0/P1); Reviewer B FAIL on P0 → fixed → re-verified.

## Knobs

| Env | Default | Effect |
|-----|---------|--------|
| (none — Synergy #2 is unconditional) | — | Disable by removing the wiring on Section 0.5 in `precompact-handoff.mjs` |

The hook itself is the load-bearing PreCompact handoff writer; there's no opt-out for the loop-state line because it's an additive enrichment, not a separate hook.

## See also

- [[substrate-health-inject]] — Synergy #1 sibling (commit `01ff65a734`)
- [[reference_substrate_health_inject_2026_05_19]] — sister hostile-payload guard (1MB cap)
- `H:/PRISM/.claude/helpers/loop-state.mjs` — the producer of the loop-state files this hook consumes
- `H:/PRISM/.claude/helpers/precompact-handoff.mjs` — the precompact handoff writer

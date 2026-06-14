---
name: reference-synergy-precompact-loop-state-2026-05-20
description: "Synergy #2 — precompact-handoff carries active /loop state across /compact. RESUME line now leads with 'Active /loop: iter N/T — task'. Shipped 2026-05-20 delta commit 1790dcc843."
aliases: reference_synergy_precompact_loop_state_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.959Z
---


# synergy-precompact-loop-state — RESUME line leads with /loop state

Shipped 2026-05-20 (slot delta after bravo was reclaimed by peer, `SYNERGY-SUBSTRATE-MS0/U-SHI02`, commit `1790dcc843`).

## What

`H:/PRISM/.claude/helpers/precompact-handoff.mjs` now reads the matching loop-state file on `/compact` and surfaces a single-line digest at the TOP of the synthesized RESUME body:

```
Active /loop: iter 5/10 — "do everything you suggested". RESUME via /loop
```

The post-compact chat sees this in the auto-injected resume context and re-engages `/loop` without subprocess query to `loop-state.mjs`.

Two new pure exports + Section 0.5 in `generateSmartResume(identity)`:

- `readActiveLoopState(sessionRef, options)` — fail-soft I/O reader; exact UUID match → 8-char prefix → newest tick wins; `requireRunning: true` default skips ended/abandoned.
- `formatLoopResumeLine(state)` — pure digest. 7 branches: no-target / iter-N-of-T / at-target / exceeded-2× × task-present / task-absent / task-unspecified.

## Why

Compounds with [[reference_substrate_health_inject_2026_05_19]] (Synergy #1) on the same milestone. The substrate-health audit found that `/compact` was a silent-loss point for active loop state — most chats never recovered iteration count + task after compaction, so 10-iter `/loop` runs degraded to 1-2 iters post-compact even when the loop-state file was still on disk.

## Per-file scrutiny — 4 fixes pre-commit

Reviewer A (code-analyzer): PASS 0 P0/P1.
Reviewer B (independent reviewer): **FAIL** on:

1. **P0 — DoS via unbounded loop-state file read.** A hostile or corrupt file matching this chat's 8-char prefix would OOM `JSON.parse` fleet-wide. Sister to the substrate-health 1MB cap. **FIX:** `MAX_LOOP_STATE_BYTES = 65536` (`statSync` BEFORE `readFileSync`) + `MAX_LOOP_CANDIDATES = 10` (`.slice(0, 10)` on prefix matches). Added 3 P0 regression guards: hostile 80KB skip, 15-file cap, boundary >65536 reject.
2. **P1.3 — `(unspecified)` task hidden.** Operator couldn't distinguish "no task" from "task lost in resume". **FIX:** R12 surface as `no task on /loop start`. Two stale tests rewritten.
3. **P1.1 — `FULL_SESSION_ID` module-state coupling.** Hidden writer→reader dependency between `resolveTerminalFromHookStdinOrHelper` and `generateSmartResume`. **DEFERRED P2** — production call-order is correct (main() resolves terminal first); cleanup is code-quality, not correctness.
4. **P1.2 / P1.4 — no integration shape oracle / silent-fail not enumerated.** **DEFERRED P2** — Section 0.5 is opt-in additive value; design intent is fail-soft-advisory.

Lesson: hermetic export-only tests cannot validate the integration seam. The 36 pre-scrutiny tests all passed for the wrong reason — the function under test was correct in isolation but the embedding into `generateSmartResume` had no positive oracle. Reviewer B's structural review caught what Reviewer A's holistic read missed.

## How to apply

- Section 0.5 fires automatically on every PreCompact. No knobs (additive enrichment, never blocks).
- Empty/`(unspecified)` task surfaces explicitly — operators should start `/loop --task "..."` to avoid the surface.
- Hostile-file size cap is generous (64KB vs ~2KB real). Adjust `MAX_LOOP_STATE_BYTES` if a future loop-state schema legitimately grows past 32× headroom.
- Force a fresh sweep on demand: re-run `/precompact` in a live chat (overrides the auto-write).

## Tests

39 hermetic cases at `H:/PRISM/.claude/helpers/precompact-handoff-loop-state.test.mjs` via `node --test`. Run from any cwd.

## See also

- [[reference_substrate_health_inject_2026_05_19]] — Synergy #1 sibling (1MB hostile-payload cap is the pattern this borrows)
- `knowledge/wiki/architecture/synergy-precompact-loop-state.md` — full architecture entry
- `knowledge/wiki/architecture/substrate-health-inject.md` — Synergy #1 architecture entry
- `H:/PRISM/.claude/helpers/loop-state.mjs` — producer of the files this hook consumes

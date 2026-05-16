# PER-SLOT-CLAIM-MS0 — per-slot unit-claim locks

**Status:** shipped 6/6 (2026-05-16, slot bravo `claude-339c8ff7`)
**Commits:** `3a8741d4f` (U-PSC01+02) · `b6f24770c` (U-PSC04+05) · `e752b186e` (U-PSC03+06) · prep `89902cc5b` (AUDIT-SYNERGY-MS0)
**Memory:** [[reference_per_slot_claim_ms0_2026_05_16]]

## Problem

`state/shared/atomic-roadmap.json` `laneAssignments[]` splits the roadmap across the 12-chat fleet, but the split is **advisory** — `/pick-unit` can serve any lane, and two slots can simultaneously pick the same `MILESTONE::U-ID`, build it in parallel, and collide at commit time. The fleet had file-claims (`work-claim.mjs`) and chat-bus advisories but no **unit-level** mutual exclusion.

## Architecture

| Layer | Artifact | Role |
|-------|----------|------|
| Storage + CLI | `.claude/helpers/slot-task-claim.mjs` | Plain-JSON store `state/shared/slot-task-claims.json`, lockfile-guarded atomic RMW. Subcommands claim/release/heartbeat/list/check/sweep. Pure exports for test. |
| Pick filter | `scripts/pick-unit.mjs` | `--chatId` engages `peerClaimedSet` exclusion (identity-gated; no `--chatId` = legacy behaviour). `--no-claim-filter` override. |
| Loop integration | `.claude/commands/checkin.md` Step 12 | Step 1a claim-on-pick (`--phase building --ttl-ms 5400000`); Step 6 heartbeat-on-tick; conflict → pick next. |
| Auto-release | `scripts/slot-task-claim-release-on-commit.mjs` + `.git/hooks/post-commit` | Parses `[SCOPE]/U-ID` (incl. `[MAIN]` prefix + combined `U-A+U-B`) → releases committing slot's claim. |
| Visibility | `.claude/hooks/stop-slot-task-claims-advisory.mjs` | T3 Stop advisory (wired Stop[0].hooks[12] after `session-end-peer-share`). Held claims + TTL bucket + release hint. |

## Safety properties

- **Mutual exclusion** proven by `slot-task-claim.e2e.test.mjs`: 6 concurrent CLI processes claim the same unit → exactly 1 winner (lockfile serializes the RMW).
- **Forward-only phase**: `claimed → building → testing → committing`; backward re-claim only refreshes heartbeat.
- **Fail-closed on corruption**: corrupt JSON renamed to `.corrupt-<iso>` (evidence preserved), store returns `readOnly:true`, `writeStoreUnsafe` refuses to clobber → exit 3 + stderr. Schema-version mismatch takes the same path (never silently overwrites a forward-compat peer).
- **Identity-required filtering**: `peerClaimedSet` with missing `mySlot`/`myChatId` returns the most-restrictive set (every claim treated as a peer claim) — no accidental mutual-exclusion bypass.
- **Non-blocking advisory**: the Stop hook's no-finding path returns `{continue:true,suppressOutput:true}` — wiring cannot regress a previously-passing Stop.

## Why not the H8 SQLite CoordinationStore

`CoordinationStoreEngine` (HOOK-SYNERGY-MS0/H8) is a real WAL-mode store, but `better-sqlite3` only resolves inside `mcp-server/node_modules`. A CLI launched from `.claude/helpers/` cannot load it — the sister `coord-db-vacuum.mjs` has the same latent bug (verified failing in production with `Cannot find module 'better-sqlite3'`). Plain JSON + advisory lockfile is the proven `chat-slots.mjs` pattern and scales to the ~10 claims/min fleet-wide budget.

## The load-bearing lesson

The lockfile concurrency P0 was **invisible to hermetic unit tests** — they call `applyClaim()` on an in-memory store and never touch `acquireLock`/`releaseLock`. The per-file scrutiny gate (2 reviewer arms) caught it, plus 3 sibling P0s (corrupt-JSON wipe, schema-mismatch wipe, broken Windows `isCli`). Only U-PSC06's genuine concurrent `spawn()` processes exercise the real RMW window. This re-confirms the RGS-TOOL-AUTOINVOKE-MS1 rule: *a "pure core + injected readers" design MUST ship one real-data E2E test — hermetic fakes don't prove production wiring.*

## Knobs

- `PRISM_SLOT_TASK_CLAIM_DISABLE=1` — `/checkin` loop skips claim/heartbeat (reverts to advisory-lane-only)
- `PRISM_SLOT_TASK_ADVISORY_DISABLE=1` — skip Stop advisory
- `PRISM_SLOT_TASK_ADVISORY_VERBOSE=1` — emit even with 0 claims
- `PRISM_SLOT_TASK_ADVISORY_THROTTLE_MS=N` — advisory throttle (default 600000)

## Tests

64 total: 41 unit (`slot-task-claim.test.mjs`) + 5 concurrent-race E2E (`slot-task-claim.e2e.test.mjs`) + 10 post-commit parser (`slot-task-claim-release-on-commit.test.mjs`) + 8 Stop advisory (`stop-slot-task-claims-advisory.test.mjs`). All `node --test`, no vitest dependency.

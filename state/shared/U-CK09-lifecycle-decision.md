# U-CK09 — Lifecycle-Command → psk Thin-Client Decision

**Milestone:** COMMAND-KERNEL-MS0 / U-CK09 (phase P1, seq 2)
**Slot:** bravo · **Chat:** claude-73d86100 · **Date:** 2026-05-18
**Deps satisfied:** U-CK03 (psk handoff/checkin/pick syscalls), U-CK08 (corpus migrated)

## Mandate

Hand-tune `startup` / `checkin` / `pick-unit` / `precompact` to thin clients of
the `psk` syscall kernel (`.claude/kernel/psk.mjs`), and create `/handoff` +
`/boot` (absent today) "either … as thin psk shells OR document the helper-only
convention" (unit rationale, verbatim latitude).

## psk syscall surface (source of truth: `.claude/kernel/psk.mjs` `SYSCALLS`)

`whoami · manifest · position · delta · tools · pick · checkin · handoff ·
record · recommend` — CLI: `node .claude/kernel/psk.mjs <syscall> [--k v]…
[--json|--pretty]`; always fail-soft, exit 0 on declared syscall, structured
`{ok,syscall,result?,error?,degraded?,note?,fallback?}`.

## Per-command disposition

| Command | Lines/KB | psk syscall mapping | Disposition |
|---|---|---|---|
| `/startup` | 357L / 22.7KB | `whoami` + `position` + `handoff --subcommand read` | **DELEGATION-DEFERRED** (see below) |
| `/checkin` | 709L / 71.7KB | `whoami` + `handoff` + `pick` + drift (`checkin`) | **DELEGATION-DEFERRED** (see below) |
| `/pick-unit` | 123L / 8.2KB | `pick` | **DELEGATION-DEFERRED** (see below) |
| `/precompact` | 282L / 13.7KB | `handoff --subcommand write` | **DELEGATION-DEFERRED** (see below) |
| `/handoff` | ABSENT | `handoff --subcommand read\|write` | **SHIPPED** — new thin psk client |
| `/boot` | ABSENT | `whoami` + `position` + `handoff --subcommand read` | **SHIPPED** — new thin psk client |

## Decision — why the 4 existing commands are NOT rewritten in-place this unit

**R7 (surface the conflict, don't average) + R12 (fail loud about deferral):**

1. **Live blast radius.** At U-CK09 build time the fleet had **21 active `/loop`
   sessions + 6 online peers**. `checkin.md` (71.7KB) carries the entire
   autonomous-loop **Step 12** doctrine — the contract every `/checkin-<slot>
   /loop` chat (including the session executing U-CK09) depends on to keep
   looping across `/compact`. A destructive in-place "thin client" rewrite of
   `checkin.md` / `startup.md` changes session-lifecycle behavior out from under
   21 mid-flight loops simultaneously — and out from under this very session.
   That is not a surgical change (R3); it is a fleet-wide behavior swap.

2. **The kernel is young.** Every psk syscall is fail-soft and **degraded-but-
   usable by design**; no command has ever delegated to it (U-CK09 is the first
   consumer). Cutting the 4 most load-bearing lifecycle commands over to an
   unproven-in-production kernel in the same stroke that introduces the first
   consumer violates "prove the pattern on the safe surface first."

3. **The unit grants the safe disposition.** The rationale's explicit "OR
   document the … convention" latitude exists precisely for this case.

**Therefore:** U-CK09 ships the pattern on the **zero-blast-radius surface** —
the two ABSENT commands (`/handoff`, `/boot`) become real, complete thin psk
clients (nothing depends on a file that does not exist → no live loop can
break). They are the canonical reference shape for the deferred migration.

## Deferred-rewrite trigger (not "someday" — a concrete gate)

The in-place delegation of `/startup` `/checkin` `/pick-unit` `/precompact`
is gated on **either** of:

- **U-OBF-GOLF lands** (golf-write-only CLAUDE.md/lifecycle governance) — then
  the 4 rewrites happen from the single golf maintenance slot, not racing 21
  loops; **or**
- a **declared maintenance window** with `< 3` active `/loop` sessions
  (`node .claude/helpers/loop-state.mjs list`), the rewrite done behind a
  one-commit revert, each command keeping its current prose as the
  fallback-on-`degraded:true` path so a kernel hiccup never bricks a session.

Follow-up unit to carry it: **U-CK09B — lifecycle in-place psk delegation**
(blocked on the trigger above; explicitly NOT in U-CK09's exit set).

## What this unit delivered (complete, not a stub)

- `.claude/commands/handoff.md` — thin psk client over `psk handoff` (read/write
  subcommands, terminal-id whitelist documented, fallback to the helper).
- `.claude/commands/boot.md` — thin psk client: read-only fast session
  bootstrap = `psk whoami` + `psk position` + `psk handoff read`
  (lighter than full `/checkin`; the "boot logic lives inside /checkin"
  rationale resolved as: `/boot` = the read-only subset, `/checkin` stays the
  write/claim path).
- This decision note (the unit's `state/shared/U-CK09-lifecycle-decision.md`
  deliverable) with the concrete syscall map + reasoned, gated deferral.

## Verification

- `node .claude/kernel/psk.mjs handoff --subcommand read --terminal claude-73d86100 --json` → `{ok:true,…}` (the contract `/handoff` wraps).
- `node .claude/kernel/psk.mjs whoami --json` + `position --json` → `{ok:true,…}` (the contracts `/boot` wraps).
- `/handoff` + `/boot` exist; the 4 existing commands are byte-unchanged (no live loop disturbed) — verifiable: `git status .claude/commands/{startup,checkin,pick-unit,precompact}.md` → clean.

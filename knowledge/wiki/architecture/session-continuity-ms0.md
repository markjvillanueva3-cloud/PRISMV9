---
title: SESSION-CONTINUITY-MS0 -- slot-keyed handoff resume + fleet launcher + tab-blink
type: architecture
created: 2026-05-22
slot: bravo
tags: [session-continuity, handoff, fleet-launcher, checkin, windows-terminal]
---

# SESSION-CONTINUITY-MS0

Makes `/checkin-<nato>` resume a chat's prior context after a **full terminal
restart** -- close every PowerShell window, open fresh ones, run
`/checkin-<slot>`, and the chat picks up where it left off.

## The bug it fixes

Work-slot handoffs are **instance-keyed**: `HANDOFF-<claude-id>-<topic>.md`,
where `<claude-id>` is the ephemeral session id. After a full restart the chat
gets a brand-new session id, so `per-agent-handoff.mjs read --terminal <new-id>`
misses the exact / fuzzy / same-instance tiers and **falls through to
`family-latest`** -- returning a random peer chat's handoff. Only `golf` was
slot-keyed; the 25 work slots had no way to find "this slot's handoff" by the
durable, operator-typed slot name.

## The fix -- 4 parts

1. **Slot-keyed read tier** (`per-agent-handoff.mjs`) -- `read --slot <nato>`
   resolves the handoff by the durable `slot:` frontmatter field (topic-prefix
   fallback for handoffs predating the slot field), returns the mtime-newest
   match. **Authoritative**: returns `no_slot_handoff` rather than ever falling
   through to a peer's file -- resuming the wrong chat is worse than resuming
   nothing. 5 behavioral tests in `per-agent-handoff.test.mjs`.

2. **psk composite handoff step** (`psk.mjs`) -- the `checkin` composite gained
   a 5th sub-step: after the claim resolves the slot, `readSlotHandoff(slot)`
   runs in parallel with drift + commit-hygiene and stores the result in
   `composite.handoff`. A missing handoff never degrades the composite.

3. **`/checkin` Report** (`checkin.md`) -- the Report surfaces
   `composite.handoff` RESUME so `/checkin-<nato>` shows the prior session's
   exit-state directly.

4. **Fleet launcher + tab-blink** -- `Launch-PRISM-Fleet.ps1` now opens 3
   Windows Terminal windows x 5 pwsh-7 tabs = 15 slots, each tab running the
   new `slot-tab-boot.ps1` which auto-submits `/checkin-<slot>`.
   `stop-tab-blink.mjs` (Stop hook) writes BEL to `\\.\CONOUT$` so the WT tab
   flashes on turn-end (`bellStyle: ["window","taskbar"]`).

## Files

| File | Change |
|------|--------|
| `.claude/helpers/per-agent-handoff.mjs` | slot-keyed read tier + helpers |
| `.claude/helpers/per-agent-handoff.test.mjs` | 5 behavioral tests (new) |
| `.claude/kernel/psk.mjs` | `readSlotHandoff` + composite handoff step |
| `.claude/commands/checkin.md` | Report Resume element |
| `.claude/hooks/stop-tab-blink.mjs` | turn-end tab flash (new) |
| `H:/Tools/prism-fleet/Launch-PRISM-Fleet.ps1` | 15 slots, pwsh 7, auto-checkin |
| `H:/Tools/prism-fleet/slot-tab-boot.ps1` | per-slot boot wrapper (new) |
| `~/.claude/settings.json` (C: + mirrored H:) | `stop-tab-blink` wired last in Stop |
| Windows Terminal `settings.json` | `bellStyle: ["window","taskbar"]` |

## U-SC02 -- full-restart auto-resume (`PRISM_BOOT_SLOT`)

The 4-part fix above makes the slot-keyed *read* work, but the auto-resume
hook (`session-start-auto-resume.mjs`) only fired on `compact` / `clear`
SessionStart events. A genuine full terminal restart raises a **`startup`**
event in a brand-new process with a fresh, random session id -- and at that
moment the hook has no durable signal for *which slot* this terminal is. So
the U-SC01 fix still required the operator to type `/checkin-<slot>` by hand.

U-SC02 (commit `a1575d05ed`) closes that single point of failure:

1. **`slot-tab-boot.ps1`** exports `$env:PRISM_BOOT_SLOT = $Slot` before
   launching `claude` -- the only durable slot signal available at
   process-startup time, inherited by `claude` and every hook child process.
2. **`session-start-auto-resume.mjs`** gains a `startup`-event branch that
   reads `PRISM_BOOT_SLOT`, resolves the slot-keyed handoff via
   `getHandoffBySlot(slot)` (`per-agent-handoff.mjs read --slot`), and injects
   the RESUME as `additionalContext` with **zero operator input**. Two new
   units: `getHandoffBySlot(slot)` (fail-soft spawn wrapper) and the pure,
   exported `buildBootResumeContext({content, slot, file, maxAgeMin})` --
   returns the markdown, or `null` on non-canonical slot / stale age / empty
   RESUME.
3. **`settings.json`** gains a 4th SessionStart arm (`matcher: "startup"`)
   wiring the hook onto the restart event. Arms are now
   `[(empty), compact, clear, startup]`.

Tests: 9 new `buildBootResumeContext` cases (happy path, stale->null, custom
maxAge, no-RESUME->null, non-canonical slot->null, null content, missing file,
all 26 slots). Full suite 43/43. Per-file scrutiny + 3-of-3 all PASS.

Net effect: launching the fleet via `Launch-PRISM-Fleet.ps1` auto-resumes
every slot's prior context on the first SessionStart -- the operator never
types `/checkin-<slot>` unless they want the full audit.

## Lessons

- **PowerShell scripts must be pure ASCII.** Windows PowerShell 5.1 reads a
  no-BOM `.ps1` file using the ANSI codepage, not UTF-8. An em-dash (U+2014,
  UTF-8 `E2 80 94`) decodes under CP1252 as `a"-"` -- and the `0x94` byte is a
  curly double-quote that **terminates a string literal early**, breaking the
  parse. The launcher had a pre-existing em-dash; the fix replaced all 13
  occurrences across both `.ps1` files with `--`. Known class -- see the
  "installer em-dash fix" entry in CLAUDE.md regressions.
- **`claude-md-golf-only-guard`** blocks non-golf chats from editing CLAUDE.md.
  Non-golf chats record shipments in `state/shared/RECENT-SHIPMENTS-<date>.md`;
  a golf-slot chat batches them into CLAUDE.md on its drain cadence.

## Knobs

- `PRISM_TAB_BLINK_DISABLE=1` -- disable the turn-end tab flash.

## Related

[[session-continuity-stack]] - [[checkin]] - [[checkin-loop-fullstack]]

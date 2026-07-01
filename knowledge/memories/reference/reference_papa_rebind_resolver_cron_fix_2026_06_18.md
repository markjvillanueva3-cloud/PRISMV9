---
name: reference_papa_rebind_resolver_cron_fix_2026_06_18
description: "The DEEPER root cause of \"keep checking back into papa\" -- slot-blind handoff read + a durable /startup-papa cron (2026-06-18, slot:alpha)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.722Z
aliases: reference_papa_rebind_resolver_cron_fix_2026_06_18
---


# "Keep checking back into papa" -- the two root causes the prior fixes missed (2026-06-18, slot:alpha)

Operator reported THREE times in one session that terminal `14b038a1` (an alpha
terminal) kept getting directed to slot **papa** (`/startup-papa`). The prior
session's fixes ([[reference_slot_one_owner_dual_ownership_fix_2026_06_18]] +
ps-window-pin + slot-resolve-shared) fixed *which slot resolves* in chat-slots /
window-pin, but the symptom persisted because TWO other re-trigger paths were
untouched. Fixed in commits `965cc46ddd` + `c31ef9d644` on `cad-fusion-live-ms0`.

## Cause 1 -- a durable cron fired `/startup-papa` into the terminal (the scheduler)
`.claude/scheduled_tasks.json` held a **durable** recurring cron `1b150d99`
(`17,47 * * * *` -> `/startup-papa ...`), created by `14b038a1` when it
*transiently* ran `/startup-papa /loop` while churned to papa, then it rebound to
alpha. The cron kept force-claiming papa twice an hour. None of the resolver
fixes touch the scheduler. **Deleted** it (+ a duplicate alpha cron `6d696642`).
Prevention: new `stale-slot-cron-advisory.mjs` (SessionStart, wired all 4
matchers) reads scheduled_tasks.json + chat-slots and flags any durable
slot-loop cron whose target slot is **unclaimed** OR whose **creator rebound** to
a different slot, emitting a `CronDelete` plan (advisory only -- a hook cannot/
should-not mutate the harness scheduler; high-confidence `/startup-<slot>` or
`slot:<slot>` targets get the command, bare-name = soft review). 24/24 tests.

## Cause 2 -- the handoff read was SLOT-BLIND (the resolver) -- THE deeper root
`per-agent-handoff.mjs read --terminal <id>` resolved via tier (0.5)
`same-instance-newest`: the chat's NEWEST `HANDOFF-<id>-*.md` regardless of slot.
A terminal that churned papa->alpha accumulates handoffs under BOTH slots, so the
newest was a papa handoff -> EVERY resume path (session-start-auto-resume,
`/loop`, `/checkin`) read papa and re-emitted `/startup-papa` even though
chat-slots said the chat now owns alpha. Live proof: `read --terminal
claude-14b038a1` returned `...-papa-cad-fusion-live.md` (matchedBy
same-instance-newest).
**Fix (U-HANDOFF-READ-SLOT-AWARE):** new tier (0.4) `same-instance-current-slot`
-- when the chat-id currently OWNS a slot in chat-slots.json, prefer the newest
of ITS OWN handoffs bound to THAT slot (by `<slot>-` topic prefix or durable
`slot:` frontmatter) over the global newest. Fail-soft: no owned slot / no
slot-match -> falls through to (0.5) byte-identical. Live after fix: resolves
`...-alpha-session-contin.md` (matchedBy same-instance-current-slot, slot alpha).
This was the load-bearing fix -- it makes resume respect the authoritative slot
binding for ALL callers without `--slot`.

## Cause 3 (consumer) -- /loop dropped the new match label (3-of-3 arm-C P1)
`loop-state.mjs handoffResume()` gates on a `HANDOFF_OWN_MATCH` allowlist; the new
`same-instance-current-slot` label was missing -> `/loop` silently rejected the
correctly-resolved alpha handoff and fell through to pick-unit (breaking one of
the very paths the fix targets). Added the label (`c31ef9d644`). **Lesson:** when
you add a new `matchedBy` value to a shared resolver, grep EVERY consumer that
allowlists/switches on it (silent breakage class). The 3-of-3 analyst arm caught
this -- the per-module 9/9+24/24 green was blind to the cross-module contract.

## Doctrine
- A symptom that recurs after a "fix" means a DIFFERENT mechanism is also driving
  it -- enumerate ALL re-trigger paths (scheduler + resolver + every consumer),
  don't assume one fix covers the class.
- Retiring the papa handoffs would have been symptom-patching (they are
  legitimate historical artifacts); the slot-blind resolver was the real bug.
- See [[reference_slot_one_owner_dual_ownership_fix_2026_06_18]] (the prior,
  shallower fix) and [[reference_pspin_findps_args_fix_2026_06_18]].

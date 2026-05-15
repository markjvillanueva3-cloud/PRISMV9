---
title: Alpha-Slot Reaper Guardian — the alpha chat owns the fleet reaper
type: architecture
status: shipped
shipped: 2026-05-14
milestone: FLEET-REAPER-MS1
---

# Alpha-Slot Reaper Guardian — `.claude/hooks/alpha-slot-reaper-guardian.mjs`

## What it is

A Claude Code hook wired into **SessionStart** and **UserPromptSubmit** that
enforces a single piece of doctrine: **the chat slotted into `alpha` owns the
fleet reaper.** For the chat whose stable id (`claude-<first8>`) holds the
`alpha` slot in `state/shared/chat-slots.json`, the guardian ensures the durable
"PRISM Fleet Reaper" Windows scheduled task is registered + enabled and kicks a
throttled detached `--once` sweep. For every other chat it is a near-instant
**silent no-op**.

It is unit **U-PHASE2-ALPHA-GUARDIAN** of [[fleet-reaper]] Phase 2
(FLEET-REAPER-MS1).

## Why it exists

User directive, 2026-05-14: *"make a hook that whoever is slotted into alpha,
they're responsible for launching it and making sure it's always active."*

The fleet reaper has three runners (a 5-min scheduled task, an in-session
Monitor, a Stop-hook arm) but nothing *guaranteed* the durable task stayed
registered — "everyone's responsibility" is no one's. Pinning ownership to a
fixed slot makes it deterministic and auditable, and prevents the redundant-load
anti-pattern (a second chat running the Monitor just spawns more `node.exe` on
the host the reaper exists to protect). The guardian is the automated
enforcement arm of that ownership rule.

## How it works

1. **Drain stdin** (time-bounded, 250 ms) → parse the harness payload's
   `session_id` and `hook_event_name`.
2. **Resolve the slot** — derive `claude-<first8>` from `session_id` and call
   `findSlotForChat` (imported from `../helpers/chat-slots.mjs`). Not slotted /
   not `alpha` → silent `{continue:true}`. This is the common path for 6 of 7
   chats and is fork-free + near-instant.
3. **(alpha only) Query the scheduled task** via `schtasks /Query` (absolute
   path — portable-node's PATH often lacks System32). Disabled → best-effort
   `schtasks /Change /ENABLE`. Missing → cannot self-install (install needs
   elevation) → emit a LOUD advisory pointing at `/fleet-reaper`.
4. **(alpha only) Kick one detached `--once` sweep** — throttle-gated by a stamp
   file so a busy alpha chat can't fork-storm and so the guardian fills the gaps
   *between* the scheduled task's 5-min ticks rather than piling onto them.
5. **Inject a one-block advisory** into the alpha chat's context — quiet when the
   task is healthy, LOUD when it is missing/disabled.

## The throttle

`SWEEP_THROTTLE_MS = 4 min` (one minute under the scheduled task's 5-min
cadence). The stamp file `state/shared/.alpha-guardian-sweep.stamp` gates the
**whole expensive path** (schtasks query + sweep + advisory):

- **SessionStart** always runs the full check — you want it verified at chat
  start. The sweep kick within it is still throttle-gated (`sweepEligible`)
  so a recent sweep is not double-kicked.
- **UserPromptSubmit** between throttle windows is a single stamp-mtime read,
  then a silent continue. The expensive branch runs at most once per 4 min.

The stamp is refreshed **unconditionally** after the expensive path completes —
even under `PRISM_ALPHA_GUARDIAN_NO_SWEEP=1` — so the knob cannot silently
defeat the per-prompt throttle.

## Advisory-only, never-block

The hook ALWAYS emits `{continue:true}` and NEVER blocks. Every failure mode
(no stdin, corrupt slots file, `schtasks` missing, spawn failure, an EOF that
never comes) fails soft to a silent continue — the scheduled task and the
Stop-hook arm are independent backstops, so a missed guardian pass is harmless.

## Coverage gap (honest framing)

The only failures the guardian re-checks mid-session ride the alpha chat's
UserPromptSubmit. **A scheduled task disabled while the alpha chat sits idle is
not noticed until alpha's next prompt or its next SessionStart** — possibly never
if the operator walks away. The backstops for that window are the scheduled
task's own self-heal and, if the operator ran `/fleet-reaper`, the in-session
Monitor. The guardian narrows the gap; it does not eliminate it.

## Knobs

| Env var | Effect | Default |
|---------|--------|---------|
| `PRISM_ALPHA_GUARDIAN_DISABLE=1` | guardian-specific off switch — the hook is a no-op | (unset) |
| `PRISM_ALPHA_GUARDIAN_NO_SWEEP=1` | keep the task check + advisory, skip the detached `--once` sweep kick | (unset) |
| `PRISM_FLEET_REAPER_DISABLE=1` | whole-reaper kill switch — the guardian no-ops too (so it doesn't nag about a deliberately-off reaper). **This one value darkens all three reaper arms at once** — prefer the arm-specific knob above. | (unset) |

## Wiring

`C:\Users\wompu\.claude\settings.json` (the `c-to-h-mirror` hook replicates
C → H): one entry in the **SessionStart** chain (after
`coordination-startup-banner.mjs`) and one in the **UserPromptSubmit** chain
(after `heartbeat-keepalive.mjs`), each `timeout: 10000` (covers the worst case:
the `schtasks /Query` plus a possible `schtasks /Change /ENABLE` re-enable, both
4 s-bounded, plus stdin drain + spawn overhead).

## Verification

```bash
# Smoke — non-alpha chat is silent:
echo '{"session_id":"zzzzzzzz-...","hook_event_name":"SessionStart"}' \
  | node H:/prism/.claude/hooks/alpha-slot-reaper-guardian.mjs
# → {"continue":true}

# Smoke — the alpha chat gets the advisory + a kicked sweep:
echo '{"session_id":"<alpha-uuid>","hook_event_name":"SessionStart"}' \
  | node H:/prism/.claude/hooks/alpha-slot-reaper-guardian.mjs
```

## Related

- [[fleet-reaper]] — the parent pipeline (MS0 + the MS1 Phase 2 layers).
- [[ollama-routing-hint]] — the other MS1 cross-process contract.
- Sister hook: `.claude/hooks/fleet-reaper-stop.mjs` — the Stop-hook arm, same
  bounded-stdin / stamp-throttle / detached-spawn idiom.
- Identity source: `.claude/helpers/chat-slots.mjs` (`findSlotForChat`) +
  `.claude/helpers/stable-session-id.mjs` (the `claude-<first8>` derivation).
- Doctrine memory: `feedback_alpha_owns_reaper`.

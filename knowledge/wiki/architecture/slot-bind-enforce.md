---
title: slot-bind-enforce — deterministic NATO-wrapper slot claim
slug: slot-bind-enforce
kind: architecture
status: shipped
date: 2026-05-18
milestone: CHECKIN-HARDEN
unit: U-SLOT-BIND-ENFORCE
author: claude-2d30710b (slot hotel)
---

# slot-bind-enforce

UserPromptSubmit hook (`.claude/hooks/slot-bind-enforce.mjs`, commit
`679feae088`) that **deterministically force-claims a fleet slot** from the
authoritative harness `session_id` when the prompt is a slot-locked command.

## The bug it fixes

The 13-chat fleet binds chats to NATO slots via `/checkin-<nato>` (and
`startup/precompact/handoff-<nato>`) markdown wrappers. The wrapper told the
**model** to hand-copy `STABLE="claude-<8hex-from-Chat-Isolation-line>"` and
run a bash claim. Post-`/compact` the model copies the **stale** id from the
conversation summary, not the live `**Chat Isolation:**` line. Observed
2026-05-18: a hotel chat ran as `claude-93351de7` (a dead prior session in
its lineage) instead of live `claude-2d30710b`; `slot-task-claim` rejected
the malformed/again-wrong id, hotel was never bound, and peer **bravo**
claimed `COMMAND-KERNEL-MS0::U-CK09` out from under it.

`stable-session-id.mjs` cannot rescue the wrapper bash: from a post-`/compact`
Bash context its PID-pin anchors miss and it falls back to the
"most-recently-touched cached session" — which is whatever **peer** pinged
most recently (returned `claude-9876118b` in repro).

## Design (CLAUDE.md R5 — hooks enforce, model judges)

The only authoritative anchor is Claude Code's `session_id`, passed to every
hook on stdin (same source `chat-state-isolator.mjs` uses for the
`**Chat Isolation:**` line). So slot binding is moved from *model instruction*
to *hook enforcement*:

- `decideSlotBind({prompt,sessionId})` — pure: detects `/(checkin|startup|
  precompact|handoff)-<nato>` and `/<verb> --preferSlot <nato>`; derives
  `claude-${sessionId.slice(0,8)}` **byte-matching siblings, NO case-fold**
  (a unilateral `.toLowerCase()` would re-create the cross-chat-id
  divergence — caught as P0 in scrutiny).
- **Fail-safe**: slot-locked command + no usable stdin `session_id` ⇒ NEVER
  guesses (a wrong force-claim evicts a healthy peer — strictly worse than
  no claim); emits an advisory pointing at the LIVE Chat Isolation line.
- **Idempotent fast-path**: `findBoundSlot(chatId) === slot` ⇒ silent no-op
  (no reclaim sweep, no force-evict, no message) — without this an
  autonomous `/loop` would reclaim+evict+spam every iteration.
- **Honest failure (R12)**: spawn-error vs timeout-or-signal vs nonzero are
  distinguished; a thrown/failed claim NEVER emits a `✅` success line.

## Wiring & knobs

UserPromptSubmit chain, immediately after `session-id-pin.mjs`
(`C:\Users\wompu\.claude\settings.json`, auto-mirrored to `H:`),
`timeout 12000`. Knobs: `PRISM_SLOT_BIND_ENFORCE_DISABLE=1` (off),
`_VERBOSE=1`, `_NO_RECLAIM=1`, `_CHAT_SLOTS=<path>` (test seam — the
subprocess integration suite points this at a hermetic fake so the live
fleet `chat-slots.json` is never mutated).

## Tests

`mcp-server/src/__tests__/slot-bind-enforce.test.mjs` — 33 `node:test`
cases: pure-core (13 slots × 4 verbs, both `--preferSlot` forms, uppercase,
mid-sentence, multi-command first-match), adversarial (non-string, ReDoS
ceiling, 8-element bad-sid fail-safe set, non-NATO suffix), SLOT_NAMES
drift-guard vs `chat-slots.mjs`, and **8 `main()` subprocess integration
oracles** (fast-path-no-thrash, no-false-✅-on-fail, spawn-error,
no-session-id advisory, eviction surfaced, DISABLE knob, non-slot no-op).

Per-file scrutiny: 4 reviewer agents × 2 rounds. Round 1 → P0 (case-fold) +
2×P1 (catch fall-through to false success; evict-thrash) fixed; round 2 both
PASS/SHIP. Residuals (thrown-`catch` branch untested, `gitBranch` unseamed,
P2-2 cosmetic tautology arm) deferred.

Sibling: [[session-continuity-stack]] · [[checkin]] · the wrapper markdown is
now a documented backstop — the hook is load-bearing.

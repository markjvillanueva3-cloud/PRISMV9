---
name: reference_slot_bind_enforce_2026_05_18
description: U-SLOT-BIND-ENFORCE — deterministic stdin-session_id slot-claim hook fixing /checkin-<nato> non-binding
aliases: reference_slot_bind_enforce_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.205Z
---


2026-05-18 slot hotel (claude-2d30710b), commit `679feae088`. User-reported bug: `/checkin-<nato>` wrappers don't reliably force the slot claim — a peer chat stole `COMMAND-KERNEL-MS0::U-CK09` because hotel was never bound.

**Root cause:** the NATO wrapper markdown made the *model* hand-copy `STABLE="claude-<8hex-from-Chat-Isolation-line>"` and run bash. Post-`/compact` the model copies the STALE id from the conversation summary (used dead `claude-93351de7` instead of live `claude-2d30710b`). `stable-session-id.mjs` can't help from a post-compact Bash context — its fallback returns the most-recently-touched cached session = a PEER's id.

**Fix (CLAUDE.md R5):** `.claude/hooks/slot-bind-enforce.mjs` UserPromptSubmit hook reads the authoritative stdin `session_id` (same source as `chat-state-isolator`'s `**Chat Isolation:**` line), derives `claude-${sid.slice(0,8)}` **NO case-fold** (byte-match siblings — case-fold was a scrutiny-caught P0 that re-creates the divergence), force-claims the slot named in `/checkin|startup|precompact|handoff-<nato>` or `--preferSlot`. Idempotent fast-path (already-bound ⇒ no-op, no `/loop` evict-thrash). Fail-safe: no stdin sid ⇒ NEVER guesses. Honest R12 failure classification; failed claim never emits `✅`.

**Wired** UserPromptSubmit after `session-id-pin.mjs` (C: + auto-mirrored H:), timeout 12000. Knobs `PRISM_SLOT_BIND_ENFORCE_{DISABLE,VERBOSE,NO_RECLAIM,CHAT_SLOTS}`. The `_CHAT_SLOTS` test seam keeps the subprocess integration suite off the live fleet `chat-slots.json`.

33 tests (pure + adversarial + 8 `main()` subprocess oracles + SLOT_NAMES drift-guard). 4 reviewers × 2 rounds → PASS/SHIP. Lessons: (1) a markdown wrapper that needs the model to hand-copy an id across `/compact` is structurally unreliable — enforce in a hook from the authoritative stdin id; (2) pure-core+injected-deps MUST ship a real subprocess integration oracle (the P1 fixes lived in `main()` which the first test pass didn't cover — caught by scrutiny). The 13 `checkin-<slot>.md` are hand-maintained/gitignored and still carry the fragile placeholder text but are now backstopped by the hook (verified live: real `/checkin-hotel` → fast-path `suppressOutput`).

Sister: [[reference_session_continuity_stack_2026_05_15]] · [[feedback_verify_actual_contract_not_proxy]] · wiki [[slot-bind-enforce]].

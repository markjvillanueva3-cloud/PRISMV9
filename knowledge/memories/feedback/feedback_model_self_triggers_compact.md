---
name: feedback_model_self_triggers_compact
description: "Operator directive 2026-06-13 (slot:alpha): when the model decides a /compact is warranted, it must KICK IT OFF ITSELF via /self-compact (scripts/self-compact.mjs), not merely tell the operator to type /compact -- 'if possible' (fail-soft to an operator instruction when the window can't be safely targeted)."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.434Z
aliases: feedback_model_self_triggers_compact
---


Operator directive (2026-06-13): "upgrade our compactions that if you tell me we should compact and start a new session, you kick it off yourself if possible."

**Rule:** When THIS chat's model concludes a `/compact` is warranted (a spiral per R6, a deliberate fresh-context reset at a clean task boundary, or a proactive checkpoint at YELLOW before a large independent unit), it runs `/self-compact` (skill) / `node scripts/self-compact.mjs --session-id $STABLE --reason "<why>" --resume "<next-action>"` INSTEAD of just saying "we should compact." The script writes a quality live-chat handoff, then types `/compact` into the chat's own terminal when safe, else relays one operator instruction.

**Why:** the operator should not have to manually action a compaction the model already decided on. The handoff is the real continuity value; `/compact` is just the trigger.

**How to apply:**
- Self-trigger only at a CLEAN checkpoint (no failing tests, no uncommitted critical work, not mid-build). The native autocompact at ~95% is the backstop for the *pressure* case; self-compact is for the *judgment* case below threshold.
- On `action:"sent"` -> end the turn immediately with a one-line note (the queued `/compact` fires when the turn ends). On `action:"fallback"` -> relay the printed message, NEVER claim you compacted (R12).
- "if possible" is a real fail-soft: it sends ONLY when a STABLE owning-window pid resolves (terminalWindowId tier `tw-ps`/`tw-pa` = dedicated-window terminal). A Windows-Terminal tab (`tw-wt-<guid>`) carries no pid and hosts many tabs -> it refuses to send (would hit the wrong tab) and falls back. See [[reference_self_compact_and_wt_actuation_dormant_2026_06_13]].
- Knob `PRISM_SELF_COMPACT_DISABLE=1` keeps `/compact` strictly operator-manual.

Pairs with [[feedback_context_growth_not_a_stop_signal]] (R6: context size alone is not a stop signal; a spiral is -- and a spiral is exactly when self-compact restarts the APPROACH not the GOAL) and the SESSION CONTINUITY STACK (precompact-handoff auto-write + terminal-pin + auto-resume).

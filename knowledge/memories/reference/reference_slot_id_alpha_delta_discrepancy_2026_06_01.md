---
name: reference_slot_id_alpha_delta_discrepancy_2026_06_01
description: "stable-session-id.mjs returned a PEER's id (claude-f27ecf49=delta) instead of mine (claude-da9aacf5=alpha) post-/compact — the documented PID-pin-miss fallback — causing a handoff written into the wrong slot's namespace before correction"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.953Z
aliases: reference_slot_id_alpha_delta_discrepancy_2026_06_01
---


**Wrong-instance-id bug hit live 2026-06-01 (real session da9aacf5 = slot alpha).**

A long post-/compact alpha session called `node .claude/helpers/stable-session-id.mjs` to key its handoff. The helper returned **`claude-f27ecf49`** — which is a PEER's id (slot **delta**, CAD; the f27ecf49 sessions are the delta CAD-galaxy buildout/audit). My ACTUAL session is **`da9aacf5`** (slot **alpha**), per the authoritative `slot-context-bundle-inject` block + the `**Chat Isolation:** da9aacf5` line. This is exactly the regression documented in CLAUDE.md §Recent regressions: *post-/compact Bash context → PID-pin miss → "most-recently-touched cached session" fallback returns a PEER's id.*

**There was NO genuine ps-pin-vs-chat-slots conflict** (an earlier note in this file mis-diagnosed it that way — corrected here). `chat-slots.json` is internally consistent: alpha→da9aacf5, delta→f27ecf49. The fault was purely that `stable-session-id.mjs` handed me delta's id, and I trusted it.

**Damage + fix:** I first wrote `HANDOFF-claude-f27ecf49-galaxy-context.md` (delta's namespace) and ran `chat-slots claim --chatId claude-f27ecf49` (refreshed delta's heartbeat — harmless, delta's own id, just a timestamp bump). Once the slot-context-bundle confirmed session=da9aacf5=alpha, I rewrote the handoff to `HANDOFF-claude-da9aacf5-galaxy-context.md` (correct alpha instance). The orphan f27ecf49 handoff carries a distinct topic (`galaxy-context`) so it won't clobber delta's real handoffs, but it IS alpha content sitting in delta's namespace — a peer-namespace artifact to ignore/clean.

**LESSON (fleet-wide):** post-/compact, key your handoff/instance off the **authoritative session_id** — the `slot-context-bundle-inject` block or the `**Chat Isolation:**` line (both = stdin `session_id`) — NOT `stable-session-id.mjs`, whose PID-pin fallback can return a peer's id and silently misattribute your handoff. Pass `--terminal "claude-<first8-of-Chat-Isolation>"` explicitly. Same root cause as the `/checkin-<nato>` slot-steal regression (CLAUDE.md §Recent regressions, U-[[reference_slot_bind_enforce_2026_05_18|SLOT-BIND-ENFORCE]]). Related: [[feedback_commit_prefix_main_on_shared_tree]], [[reference_priority_galaxy_wiki_pages_2026_06_01]].

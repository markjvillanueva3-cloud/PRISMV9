---
name: reference-fleet-reaper-ms3-a-closeout-2026-05-23
description: "FLEET-REAPER-MS3/U-FR-MS3-A silent close-out — work was peer-absorbed in two 2026-05-19 commits, envelope finally flipped 2026-05-23 (slot:delta /loop)"
aliases: reference_fleet_reaper_ms3_a_closeout_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.576Z
---


# [[reference_fleet_reaper|FLEET-REAPER]]-MS3/U-FR-MS3-A — silent close-out 2026-05-23 (slot:delta)

The fourth and final unit of [[reference_fleet_reaper|FLEET-REAPER]]-MS3 had been **silent close-out debt** for 4 days. Files shipped 2026-05-19 as hitchhike commits on other units; envelope status stayed `pending`. A `/checkin-delta /loop /goal` pickup hit it via the priority queue (backend-dev p0), verified shipped state via spec audit, then closed it out.

## What shipped & where

| Asset | LOC | Shipping commit | Date | Slot/scope |
|---|---|---|---|---|
| `.claude/helpers/claude-tree-priority.mjs` | 276 | `0b4d868820` | 2026-05-19 | slot:echo (SLOT-COMPACT-SYNERGY-MS0/U-WAVE5c-AUTO hitchhike) |
| `.claude/hooks/active-chat-priority-boost.mjs` | 155 | `aad2152f7f` | 2026-05-19 | DEV-TOOLS/U-DVA01 hitchhike |
| `.claude/hooks/active-chat-priority-decay.mjs` | 131 | `aad2152f7f` | 2026-05-19 | DEV-TOOLS/U-DVA01 hitchhike |
| `scripts/__tests__/claude-tree-priority.test.mjs` | 254 | `aad2152f7f` | 2026-05-19 | 17/17 tests passing |
| Wiring in `C:/wompu/.claude/settings.json` + auto-mirror to `H:/.claude/settings.json` | n/a | (already in place) | n/a | UserPromptSubmit boost + Stop decay |

## What U-FR-MS3-A does

UserPromptSubmit hook walks `process.pid` → claude.exe ancestor (`findClaudeAncestor`) → descendant tree (`walkClaudeTree`) → sets each pid's Win32 priority class to AboveNormal via `wmic process where ProcessId=<pid> CALL setpriority 32768`. Writes a stamp file at `state/shared/.active-chat-boost/<chatId>.json` recording PIDs + `expiresAt` (now + TTL). Stop hook scans the stamp dir, reverts expired stamps to Normal, deletes the stamp. Idempotent — already-boosted re-prompts within TTL refresh; missing PIDs at decay are a silent no-op.

## Anti-regression invariants (pinned in 17 tests)

1. **AR#1 NEVER above AboveNormal** — `parsePriorityName` returns `null` for High/Realtime/Idle; only {Normal, AboveNormal, BelowNormal} accepted.
2. **AR#2 claude-anchor-only descent** — `walkClaudeTree` refuses to walk from a non-claude.exe anchor (returns empty Set) so no non-Claude process is ever touched.
3. **TTL hard-clamp** — `clampTtlSec` floors at 60s, ceilings at 1800s (30 min), defaults 300s on undefined/non-finite input.
4. **Hermetic injection** — `setPriorityForPids` accepts `execFile` override + `platform` override, so tests run without spawning wmic.
5. **Per-pid fail-soft** — one wmic failure does not abort siblings; result array carries `{pid, ok, error?}` per pid.
6. **Idempotent decay** — `pickExpiredStamps` is a pure filter; `loadStamps` silently drops malformed JSON; missing PIDs at revert are no-ops.

## Knobs

| Knob | Default | Range | Effect |
|---|---|---|---|
| `PRISM_FR_BOOST_DISABLE` | unset | `1` | Master kill — boost hook exits early |
| `PRISM_FR_BOOST_TTL_SEC` | 300 | 60..1800 | Boost expiry in seconds |
| `PRISM_FR_BOOST_PRIORITY` | `AboveNormal` | `AboveNormal\|Normal` | Target priority class |
| `PRISM_FLEET_REAPER_DISABLE` | unset | `1` | Fleet-wide kill (also respected by this unit) |

## How the close-out happened

1. `/checkin-delta /loop /goal` → autonomous loop start (target 20).
2. Priority queue surfaced U-FR-MS3-A as backend-dev p0.
3. Spec audit found all 5 spec files on disk + 17/17 tests green + both settings.json wired.
4. `git log --diff-filter=A` traced shipping commits → both 2026-05-19 hitchhikes.
5. Envelope flipped: `U-FR-MS3-A.status pending→shipped` with both commits cited; milestone `in_progress→complete` with `completed_at 2026-05-23`.
6. `build-milestone-progress.mjs` + `build-state-snapshot.mjs` regenerated.
7. 4-surface doc reflect: CLAUDE.md [[reference_fleet_reaper|FLEET-REAPER]] section extended to MS3, this memory entry created, wiki [[fleet-reaper-ms3]] already accurate (no edit needed — it had the `peer-absorbed` note).

## Doctrine pointers

- [[feedback_auto_close_out]] — close-out-audit + 5 surfaces; never auto-flip without human verify (verified here).
- [[feedback_roadmap_close_out]] — envelope + roadmap-index + MILESTONE_PROGRESS + BUILD_STATE + chat-bus.
- [[feedback_always_close_out]] — finish EVERY task before reporting done, including doc-sync tail.
- [[reference_h8_misattribution_2026_05_20]] — sibling close-out pattern (work shipped under a peer's commit, envelope stays stale).

## Why this matters

With MS3 complete, all 4 chat-capacity upgrades (live-boost A, bg-throttle B, per-chat advisory C, reaper-self priority D) form a coherent capacity-management stack: PRISM now actively keeps the chat-you're-typing-in fast (A) while throttling competing apps (B), names which sibling chat to compact before crisis (C), and ensures the reaper itself doesn't add disk pressure during sweeps (D). The user-perceptible win: 13+ concurrent chats remain responsive on a 96%-committed host.

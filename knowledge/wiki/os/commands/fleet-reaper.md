---
kind: command
slug: fleet-reaper
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/fleet-reaper.md
description: "ALWAYS-ON fleet hygiene baseline for the 13-chat fleet (alpha..mike + golf). Golf owns the reaper (per [[feedback_golf_owns_reaper]], SUPERSEDES the prior alpha-owns rule 2026-05-16) — /checkin-golf auto-invokes this skill on every golf session, so bare /fleet-reaper is the canonical re-arm and the answer to \"is the reaper on?\" is unconditionally YES. Stays on via dual coverage: (1) durable Windows scheduled task \"PRISM Fleet Reaper\" (5-min cadence, S4U principal, AtStartup trigger, restart-on-failure ×3 — survives every chat closing AND host reboots) + (2) a persistent in-session Monitor armed in this chat (live event feed for the lifetime of the session). The skill is idempotent — re-running never duplicates the Monitor (TaskList dedup) or the task (schtasks /Query gate). Maps every running node/git/bash process to the chat slot that spawned it (chat-slots.json) and reaps orphans of crashed/dead chats — gated by a confirm-after-N-ticks rule so a live chat's process is never killed. FLEET-REAPER-MS1 adds three layers: a leftover-bash-task classifier (catches Bash-tool Monitor loops orphaned under a lingering unpinned harness), soft RAM/CPU relief (reversible BelowNormal priority + working-set trim on stale-slot processes under memory pressure), and an Ollama coordinator (pre-warms a GPU model + writes a routing hint that nudges ollama-task-offloader.mjs to absorb more hook-eligible work — converting idle VRAM into Claude-CLI throughput). Use to re-arm after the Monitor died (chat-restart, /compact crash, force-close), to verify always-on status, when orphan node/bash/git are piling up, when host memory is unstable, or when the GPU sits idle while commit pressure is high."
---

# /fleet-reaper

ALWAYS-ON fleet hygiene baseline for the 13-chat fleet (alpha..mike + golf). Golf owns the reaper (per [[feedback_golf_owns_reaper]], SUPERSEDES the prior alpha-owns rule 2026-05-16) — /checkin-golf auto-invokes this skill on every golf session, so bare /fleet-reaper is the canonical re-arm and the answer to "is the reaper on?" is unconditionally YES. Stays on via dual coverage: (1) durable Windows scheduled task "PRISM Fleet Reaper" (5-min cadence, S4U principal, AtStartup trigger, restart-on-failure ×3 — survives every chat closing AND host reboots) + (2) a persistent in-session Monitor armed in this chat (live event feed for the lifetime of the session). The skill is idempotent — re-running never duplicates the Monitor (TaskList dedup) or the task (schtasks /Query gate). Maps every running node/git/bash process to the chat slot that spawned it (chat-slots.json) and reaps orphans of crashed/dead chats — gated by a confirm-after-N-ticks rule so a live chat's process is never killed. FLEET-REAPER-MS1 adds three layers: a leftover-bash-task classifier (catches Bash-tool Monitor loops orphaned under a lingering unpinned harness), soft RAM/CPU relief (reversible BelowNormal priority + working-set trim on stale-slot processes under memory pressure), and an Ollama coordinator (pre-warms a GPU model + writes a routing hint that nudges ollama-task-offloader.mjs to absorb more hook-eligible work — converting idle VRAM into Claude-CLI throughput). Use to re-arm after the Monitor died (chat-restart, /compact crash, force-close), to verify always-on status, when orphan node/bash/git are piling up, when host memory is unstable, or when the GPU sits idle while commit pressure is high.

## Source command

See `.claude/commands/fleet-reaper.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.

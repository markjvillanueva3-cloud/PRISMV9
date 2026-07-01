---
name: feedback_alpha_owns_reaper
description: "[SUPERSEDED 2026-05-16 → [[feedback_golf_owns_reaper]]] The chat slotted into `alpha` USED TO own the fleet reaper; ownership moved to golf to unify fleet-hygiene under one slot."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:07.814Z
aliases: feedback_alpha_owns_reaper
---


> **SUPERSEDED 2026-05-16 — see [[feedback_golf_owns_reaper]].** The chat slotted into `golf` now owns the fleet reaper. Kept on disk per [[feedback_never_delete_only_disable]] for history; do not act on the standing rule below. The `alpha-slot-reaper-guardian.mjs` hook file is preserved on disk but its wiring was removed from `settings.json` (no entry in SessionStart or UserPromptSubmit); the replacement is `golf-slot-reaper-guardian.mjs`. The "always runs fleet-reaper" section was removed from `/checkin-alpha` and added to `/checkin-golf`.

---

Standing rule (user directive, 2026-05-14): **"whoever is slotted into alpha, they're responsible for launching [the fleet reaper] and making sure it's always active."** The chat holding the `alpha` slot in `chat-slots.json` owns the FLEET-REAPER pipeline — it must keep the durable "PRISM Fleet Reaper" scheduled task registered + enabled and, ideally, run `/fleet-reaper` to also arm the in-session Monitor.

**Why:** PRISM runs up to 7 concurrent chats on a fork-storm-prone Windows box. When a chat crashes, its `node.exe`/`bash.exe`/`git.exe` children orphan and pin RAM — across several dead chats this is the commit-memory pressure that destabilizes the *surviving* chats. The reaper relieves it, but only if *someone* keeps it running; "everyone's responsibility" means no one's. Pinning ownership to a fixed slot (`alpha`) makes it deterministic and auditable, and a second chat running the Monitor is just redundant load on the host the reaper exists to protect.

**How to apply:** The `alpha-slot-reaper-guardian.mjs` hook (wired into SessionStart + UserPromptSubmit in `settings.json`) enforces this automatically — for the alpha chat it verifies the scheduled task, kicks a throttled detached `--once` sweep, and emits a LOUD advisory if the task is missing/disabled; every other chat is a silent no-op. If you ARE the alpha chat and see that advisory, run `/fleet-reaper` (installing the task needs an elevated shell). Don't run `/fleet-reaper` from a non-alpha chat — it's redundant. Knobs: `PRISM_ALPHA_GUARDIAN_DISABLE=1` (guardian off), `PRISM_FLEET_REAPER_DISABLE=1` (whole reaper off — darkens all three arms, use sparingly). Shipped as U-PHASE2-ALPHA-GUARDIAN of [[reference_fleet_reaper_ms1]]; pipeline doctrine in [[reference_fleet_reaper]]; reversal levers per [[feedback_never_delete_only_disable]].

**2026-05-16 bake-in (commit `[CHECKIN-ALPHA-DOCTRINE]/fleet-reaper-bake-in`):** the doctrine is now non-skippable in the `/checkin-alpha` skill itself, not just the SessionStart hook. The skill `.claude/commands/checkin-alpha.md` (force-added to git; was project-local-only because `.claude/commands/` is .gitignored by default) gained a "Fleet-reaper (always — alpha owns the reaper)" section between slot binding and pipeline delegation: (A) fresh sweep + verdict in §Report, (B) ensure durable scheduled task, (C) arm persistent Monitor (added `Monitor` to `allowed-tools` specifically for this), (D) kill-switch awareness. So every `/checkin-alpha` invocation now formalizes the contract operator-visibly. The guardian hook remains the silent backstop for sessions that never run `/checkin-alpha`.


## Related
[[skills/checkin-alpha|/checkin-alpha]] • [[skills/checkin-golf|/checkin-golf]] • [[skills/fleet-reaper|/fleet-reaper]] • [[skills/disabled|/disabled]] • [[skills/fleet-reaper-bake-in|/fleet-reaper-bake-in]] • [[skills/commands|/commands]]
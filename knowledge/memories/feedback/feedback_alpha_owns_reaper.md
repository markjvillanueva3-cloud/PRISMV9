---
name: feedback_alpha_owns_reaper
description: "The chat slotted into `alpha` owns the fleet reaper — responsible for launching it and keeping it always active."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b6c4b196-15eb-4d95-9474-abf1c8fbcb8c
---

Standing rule (user directive, 2026-05-14): **"whoever is slotted into alpha, they're responsible for launching [the fleet reaper] and making sure it's always active."** The chat holding the `alpha` slot in `chat-slots.json` owns the FLEET-REAPER pipeline — it must keep the durable "PRISM Fleet Reaper" scheduled task registered + enabled and, ideally, run `/fleet-reaper` to also arm the in-session Monitor.

**Why:** PRISM runs up to 7 concurrent chats on a fork-storm-prone Windows box. When a chat crashes, its `node.exe`/`bash.exe`/`git.exe` children orphan and pin RAM — across several dead chats this is the commit-memory pressure that destabilizes the *surviving* chats. The reaper relieves it, but only if *someone* keeps it running; "everyone's responsibility" means no one's. Pinning ownership to a fixed slot (`alpha`) makes it deterministic and auditable, and a second chat running the Monitor is just redundant load on the host the reaper exists to protect.

**How to apply:** The `alpha-slot-reaper-guardian.mjs` hook (wired into SessionStart + UserPromptSubmit in `settings.json`) enforces this automatically — for the alpha chat it verifies the scheduled task, kicks a throttled detached `--once` sweep, and emits a LOUD advisory if the task is missing/disabled; every other chat is a silent no-op. If you ARE the alpha chat and see that advisory, run `/fleet-reaper` (installing the task needs an elevated shell). Don't run `/fleet-reaper` from a non-alpha chat — it's redundant. Knobs: `PRISM_ALPHA_GUARDIAN_DISABLE=1` (guardian off), `PRISM_FLEET_REAPER_DISABLE=1` (whole reaper off — darkens all three arms, use sparingly). Shipped as U-PHASE2-ALPHA-GUARDIAN of [[reference_fleet_reaper_ms1]]; pipeline doctrine in [[reference_fleet_reaper]]; reversal levers per [[feedback_never_delete_only_disable]].

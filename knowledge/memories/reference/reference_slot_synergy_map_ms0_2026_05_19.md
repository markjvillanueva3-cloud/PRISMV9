---
name: reference-slot-synergy-map-ms0-2026-05-19
description: "SLOT-SYNERGY-MAP-MS0 — /system-viz augmentation rendering 13 chat slots × 16 PRISM subsystems with per-slot edges showing end-to-end pipeline visibility per slot. Closes the \"synergy invisible in graph\" gap from the user's foxtrot work order."
aliases: reference_slot_synergy_map_ms0_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.207Z
---


**SLOT-SYNERGY-MAP-MS0 / U-SLOT-SYNERGY-MAP (2026-05-19, slot foxtrot, commit `6e39ec54c8`)**

Closes the user's foxtrot work order: *"synergize skills, scripts hooks, memories, wikis, tribal knowledge, claude.md, gsd, tdd, dsl, precompact, compact, session handoffs per chat slot, chat slot system, git tree commits per chat slot, task queue per chat slot, use /system-viz to plot out node connections."* The 16 named subsystems are now first-class graph nodes wired to each of the 13 chat slots, and `/system-viz` renders the cross-cutting end-to-end pipeline per slot.

**Architecture** — strictly additive, mirrors the 5 existing roost generators (priority-queue, bridge-synergy, misc-tasks, feature-gap, domain-pipeline):
- `scripts/generate-slot-synergy-features.mjs` (~330 LOC) — pure `generate(inputs)` + injectable deps + execFileSync git (no shell). Walks `SLOT_NAMES = [alpha..mike]` (drift-guarded against `chat-slots.mjs`) and emits per slot: handoff count (from `state/shared/handoffs/`), queue length (from `slot-task-queues.json`), claim count (from `slot-task-claims.json`), recent commit count (from `git log --format=%s -200` matching `(slot:<nato>)` modern OR `[<NATO>]` legacy), branch=1 if `slot/<nato>` worktree-bound, plus 11 always-on doctrine subsystems.
- `scripts/regen-viz.mjs` FAST[] +1 entry.
- `scripts/merge-augmentations.mjs` +loadOptional + +version + +30-line splice block (mirrors the 5 existing identical blocks).

**Live first run:** 30 new nodes (1 roost + 16 subsystem anchors + 13 slot nodes) + 174 new edges into `system-graph.json`. Golf slot color-coded amber (hygiene/integrator role); the 12 work slots color-coded blue.

**Subsystem-to-anchor mapping** (16 anchors, all under `ghost.slot_synergy.subsystem.<key>`):
- `handoff` · `queue` · `claims` · `commits` · `branch` (data-input subsystems, count varies live)
- `skills` · `scripts` · `hooks` · `memories` · `wikis` · `tribal` · `claudemd` · `gsd` · `precompact` · `compact` · `doctrine` (doctrine subsystems, always-on)

**Per-file scrutiny gate** (2 parallel reviewer agents per [[reference_per_file_scrutiny_gate]]): code-analyzer (arm-C) + reviewer (arm-B) both returned VERDICT: PASS, 0 P0/P1. Two convergent P2s addressed in-session: (1) `precompact` + `compact` originally rolled into `handoff` — split out as distinct anchors per the user's explicit 16-item list; (2) silent-degrade R12 gap — added `caveats[]` surface that writes input-unavailability to stderr (and into the augmentation JSON) so an operator never sees a silent all-zero graph.

**Drift guards** — the test suite (48 cases, all PASS) re-parses `SLOT_NAMES` from `chat-slots.mjs` and asserts byte-equality, so adding a 14th NATO slot (`november`?) will fail this test until the generator is updated. The 16-key SUBSYSTEMS invariant + per-key explicit anti-regression assertion catches silent subsystem-list drift.

**Operator-facing surface:**
- Open `/system-viz` → search "slot_synergy" → see all 13 slot nodes + their connection edges to each of the 16 subsystems. Per-slot info string shows live counts (`[<nato>] domain=... bound=yes/no queue=N claims=N handoffs=N commits=N branch=slot/<nato>|(unmigrated) totalConn=N`).
- Auto-regen: post-commit + hourly cron via `regen-viz.mjs`. No manual step.
- Knobs: none new. Honors existing `PRISM_REGEN_VIZ_*` knobs via merge-augmentations.

**Why this matters** — until now `/system-viz` had ghost roosts for the WORK (priority-queue, bridge-synergy, misc-tasks, feature-gap, domain-pipeline) but NOT for the PER-SLOT END-TO-END PIPELINE. A chat asking "which subsystems is my slot wired into?" had to grep handoff dirs + grep slot-task-queues + grep git log + grep chat-slots independently. Now it's a single graph subgraph rooted at `ghost.slot_synergy.slot.<nato>`.

**Cross-references** — [[reference_misc_tasks_extraction_2026_05_16]], [[reference_priority_queue_ms0_2026_05_16]], [[reference_bridge_synergy_2026_05_16]], [[reference_per_slot_claim_ms0_2026_05_16]], [[reference_slot_worktree_activation_2026_05_16]], [[reference_session_continuity_stack_2026_05_15]], [[feedback_fleet_design_10_chats]].

**Anti-regression** — the splice block in `merge-augmentations.mjs:1005-1028` follows the canonical 5-step dedup pattern (existingIds Set → dedup nodes → existingEdges Set via canonical edgeKey → dedup edges → meta key). Adding a 6th roost generator follows the same pattern; do NOT special-case slot-synergy.

**Verify:**
- `node --test H:/prism/scripts/generate-slot-synergy-features.test.mjs` → 48/48 PASS.
- `node H:/prism/scripts/generate-slot-synergy-features.mjs` → writes `state/shared/system-viz/slot-synergy-augmentation.json` with 30 nodes + 174 edges (live data).
- `git -C H:/prism show 6e39ec54c8d88994c9f3a890eb5dd474072aa8ae --stat` → 4 files +927 insertions.

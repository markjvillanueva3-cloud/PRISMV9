---
name: feedback_exhausted_work_hunt_inefficiencies
description: "when work is exhausted (e.g. overnight), pivot to hunting system/hook inefficiencies + high-ROI auto-enforcements"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.425Z
aliases: feedback_exhausted_work_hunt_inefficiencies
---


# When work is exhausted, hunt system inefficiencies + high-ROI enforcements (operator directive 2026-06-09)

Operator standing directive (2026-06-09, slot:sierra session): **"if you exhaust all work during the night, look for system inefficiencies, hook inefficiencies, suggestions that should be auto enforced and other high ROI enforcements we can build to improve overall system performance."**

**Why:** an idle autonomous chat with a goal-stop-hook should not spin on noise -- it should compound the system. Off-peak (overnight, low contention) is the right window for fleet-wide audits that are too heavy/noisy during active multi-slot work.

**How to apply (when the immediate backlog is genuinely clear):**
- **Hook efficiency** -- audit `.claude/hooks/*` for: fire-rate vs value (zero-fire wired hooks, over-firing injectors), per-prompt token cost, dedup opportunities, hooks doing work a cheaper tier (code/Ollama) should do. Tools: `scripts/hook-health-check.mjs`, fire-rate audits, `HOOK_DIGEST.md`.
- **Auto-enforceable patterns** -- recurring manual corrections / regressions that a deterministic hook or gate could prevent. Convert "I keep doing X wrong" into a PreToolUse/Stop gate. (e.g. the atomic-write lesson [[reference_viz_graph_truncation_atomic_fix_2026_06_09]]: a guard that flags a non-atomic write to a known canonical large file.)
- **System inefficiency** -- token waste (verbose injects, un-RTK'd bash, duplicate caches like the #6 memo-embedding dup), heavy-op risk (non-atomic large writes, V8 string-cap consumers, default-heap OOM on the 660MB graph), commit-charge / spawn-refusal pressure (MCP-FLEET-CAPACITY plan).
- **High-ROI enforcement** -- prefer deterministic code/hook enforcement over reminders (R5: a status code beats a model nudge). Each candidate goes through dedup -> tests -> 3-of-3 -> wiring; NEVER auto-wire a generated hook live (candidates only).

**Bounds:** still respect R6 budget (don't spiral at RED), per-file scrutiny, never-delete-only-disable, and the migration freeze (no scheduled-task arming). Survey READ-ONLY first, then build the highest-ROI one or two, fully (WIRE->TEST->VALIDATE->3-of-3), rather than many half-built. See [[feedback_utilize_ollama_for_efficiency]], [[feedback_build_comprehensive_route]].

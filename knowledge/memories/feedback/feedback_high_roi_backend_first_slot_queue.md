---
name: high-roi-backend-first-slot-queue
description: "When the operator points a chat at its slot-task-queue (/checkin-<slot>, /pick-unit, /loop, /goal), prioritize high-ROI backend-dev units before app/revenue/UI/CAD-CAM/docs. Standing rule."
aliases: feedback_high_roi_backend_first_slot_queue
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.429Z
---


# High-ROI backend-dev first when working the slot-task queue

**Rule:** When the operator asks you to work units/tasks in *your specific chat-slot task queue* (`/checkin-<slot>`, `/pick-unit --slot S`, `/loop`, `/goal` against the slot queue) — the pickup order is **high-ROI backend-dev units first**, then bridge/wiring, then everything else. App/revenue/UI/CAD-CAM/docs/cosmetic units wait.

**Why:** Backend-dev infrastructure (dispatcher wirings, engine round-trip seals, hook fire-rate fixes, drift-detector gaps, registry coverage, error-learn paths, cross-process bridges) compounds every downstream domain unit's leverage. The same hour spent on a CAD-CAM feature unblocks one feature; spent on a backend-dev wiring unblocks every CAD/CAM/lathe/wire-EDM unit that calls through the wired surface. Confirmed standing directive 2026-05-20 in slot alpha.

**How to apply:**
- Before claiming the next slot-queue unit, **first filter** the queue for: `U-WIRE-*`, `U-BRIDGE-*`, `U-HOOK-*`, `U-REGISTRY-*`, `U-DISPATCHER-*`, `U-FOUNDATION-*`, anti-regression / fail-loud / R12 fixes, drift-detector + auto-wiring + scrutiny + audit chain repairs, and dispatcher action-count anti-regression. Pick the highest-ROI item from THAT subset.
- Only after the backend-dev subset is empty (or every member is peer-claimed) drop down to bridge layer, then domain units.
- ROI signal sources (use what's already in `state/shared/`): `BUILD_STATE.NEEDS_WIRING.top_domains` (largest unwired domains = highest compounding payoff per wire), `ROADMAP-CONSOLIDATED.bridge_units` (26 wiring + 16 deep-integration), `priority-queue.mjs --pick --slot <S>` (already domain+backend-aware), per-slot leftover specs (e.g. `BRAVO-TRIAGE-2026-05-19.md` flags wire-unwired pairs prepared by peers).
- App/revenue/UI/CAD-CAM-feature units stay deferred *until the backend-dev queue is empty or peer-saturated for this slot's domain*. Document the deferral in the per-slot handoff RESUME if it's load-bearing.
- The 12-domain partition (CLAUDE.md §[[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0) still holds — alpha owns *mill-domain backend-dev first*, not generic backend-dev that belongs to another slot.

**Companion to:** [[feedback_prioritize_devtools_backend]] (the broader doctrine "dev-tooling + backend-infra are P0 ahead of app/revenue/CAD-CAM/docs in every pickup") — this one is the *slot-queue-specific* application of the same rule. The broader doctrine covers ad-hoc work; this one covers operator-pointed slot-queue work.

**Hook surface (already live, no new wiring needed):**
- `priority-queue.mjs` sorts backend-dev to the top via the [[reference_priority_queue_ms0_2026_05_16|PRIORITY-QUEUE-MS0]] color-coding (blue=backend-dev, amber=bridge, green=app); CLAUDE.md §`/checkin-<nato> /loop` §4. Use `node .claude/helpers/priority-queue.mjs --pick --slot <S>` and the first eligible unit is already the right pick by this rule.
- `pick-prefresh-inject.mjs` (UserPromptSubmit T2) surfaces MILESTONE_PROGRESS + BUILD_STATE staleness on `/pick-unit` / `/checkin` so the choice has fresh data.

**Anti-pattern to avoid:** picking the *top* of the alphabetically-/insertion-order slot queue without ROI sort. The slot-task-queues.json is a flat array — its order is not authoritative; the priority-queue + ROI filter is.

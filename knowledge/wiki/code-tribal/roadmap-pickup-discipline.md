---
name: roadmap-pickup-discipline
category: code-tribal
domain: backend-dev
tags: [roadmap, pick-unit, priority-queue, slot-task-claim, prism-development, ai-development]
last_updated: 2026-05-18
---

# Roadmap Pickup Discipline — choosing the next unit

PRISM has 5826 remaining units across 849 milestones. Picking the wrong unit wastes a turn; picking the right one compounds. The discipline minimizes wasted picks.

## Pick order (deterministic, automated)

1. **/pick-dev** — locked to backend-devtools roadmap (priority=0); never falls back to revenue. Use when "pick a dev unit" or "pick the next devtools thing to ship".
2. **/pick-unit** — generic deterministic picker from devtools (first) then revenue (second). Filters: already-shipped (via MILESTONE_PROGRESS), peer-claimed (via slot-task-claims with --chatId), priority + tier sorted.
3. **node .claude/helpers/priority-queue.mjs --pick --slot S --top N** — the runtime PRIORITY-QUEUE-MS0 picker. Backend-dev units sorted to the top, color-coded in /system-viz.
4. **Hand-curate** — only when programmatic picks are stale or wrong.

## Priority signals (highest → lowest)

| Priority | Source | Use |
|----------|--------|-----|
| P0 | atomic-roadmap.json  | backend-devtools (compounds for everything else) |
| Bridge | DEEP_INTEGRATION_BRIDGES + WIRING_BRIDGES | wires already-built capability |
| Tier 1 | milestone meta  | safety / production-critical |
| Domain match | slot.topic ↔ unit milestone | reduces context-switch cost |
| Age | unit  | older = more likely stale, audit before pick |

## The "is it actually pending?" check

Before claiming a unit, verify it's not silently-shipped. Cross-reference:

- MILESTONE_PROGRESS.shipped (post-2026-05-12 tagged commits)
- git log --grep [SCOPE]/U-ID (the canonical evidence)
- Silent close-out drift (CLAUDE.md SILENT-CLOSE-OUT-DRIFT)

The "envelope says pending, units already shipped" class hits 25-30% of milestones. Never trust the envelope status alone — union git+envelope.

## Slot-task-claim (concurrent-race prevention)

After picking but before building:

node .claude/helpers/slot-task-claim.mjs claim --slot lima --unit "MILESTONE-ID::U-XXX"

Locks the unit so peer chats can't race-build it. Forward-only phase (claimed→building→testing→committing); the post-commit hook auto-releases on [SCOPE]/U-ID commit subjects. Heartbeat every iteration.

## Reading the spec

Specs live in state/shared/specs/UNITS/U-XXX.md (or per-milestone subdirs). Read end-to-end before writing any code; the spec is the contract.

If the spec is missing or stale, write a fresh spec FIRST (state/shared/specs/UNITS/) then build. The spec doubles as the canonical "what did this ship" reference.

## When to skip the deterministic picker

- User specifies a unit by name: build that.
- /checkin <task> args carry a concrete deliverable: that IS the work order (feedback_checkin_args_are_primary_work_order).
- Bridge unit blocking other work: pick the bridge ahead of any picker.

## The "DONE_STATUSES allowlist" gotcha

Unit status field is chaotic across files: done, complete, shipped, closed, merged. The U-VIZ-FIND-CACHE unblock-detector uses an explicit DONE_STATUSES allowlist; don't add a new status spelling without updating the allowlist.

## Bridge-unit priority

26 wiring + 16 deep-integration bridge units in ROADMAP-CONSOLIDATED are the highest-leverage starting set because they connect already-built capability. Picking a bridge before a green-field unit is almost always correct.

## Related

- [[engine-creation-playbook]] — what happens after the pick
- [[multi-chat-coordination]] — slot-task-claim + chat-bus
- [[regression-prevention-doctrine]] — silent close-out drift class
- CLAUDE.md /checkin-loop fullstack contract
- CLAUDE.md ROADMAP CONSOLIDATION + PRIORITY-QUEUE-MS0

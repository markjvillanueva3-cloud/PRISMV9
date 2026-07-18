---
title: "feedback-pick-unit-routing"
name: feedback-pick-unit-routing
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_pick_unit_routing.md
promoted_at: 2026-06-06T04:55:50.276Z
source_refs: 4
---

# When the user says "pick a unit" — use /pick-unit, devtools-first

User directive (2026-05-13): *"there were 2 master road maps (prism revenue and development tool) I think we consolidated all remaining road maps and did deep searches for everything else missing. can you make it so when I say pick a unit, units are picked from those 2 road maps with development tools taking first priority"*

## The rule

When the user says any of:
- "pick a unit"
- "pick the next thing to ship"
- "what should I work on"
- "continue working on the roadmap"
- "/loop" iter wakes up without a specific target

**Always invoke `/pick-unit` (or `node scripts/pick-unit.mjs` directly).** Never grep the milestone envelopes, never sample at random, never pick by gut feel from `MILESTONE_PROGRESS.md`.

**Why:** Earlier iterations had me re-reading 200KB+ milestone envelope JSONs each turn to find candidates. `/pick-unit` does the routing in one ~50ms script run + returns deterministic ranked picks.

**How to apply:**
1. Default: `/pick-unit` → top 5 from current slot's lane, devtools-only
2. If "ship now": `/pick-unit --limit 1` → top single recommendation
3. If devtools lane shows zero candidates: `/pick-unit --priority revenue`
4. If task is heavy/multi-file: `/pick-unit --tier 0` (highest within roadmap)
5. Read the `spec:` path the picker emits BEFORE claiming the unit — full build_description + exit_conditions live there

## The two master roadmaps (canonical)

Both are encoded in `state/shared/atomic-roadmap.json` via the `roadmap_priority` field:

| Priority | Source | Field test | Count |
|----------|--------|------------|-------|
| **0 — devtools, FIRST** | `BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP` | `roadmap_priority === 0` | 3078 |
| **1 — revenue, second** | `REVENUE-ROADMAP-v7.6` | `roadmap_priority === 1` and `track === "revenue"` | 585 |

3663 total units across 6 chat lanes. The consolidation referenced by the user happened in a prior session — all other surfaced milestones are either rolled INTO these two via `atomic-roadmap.json` or are deep-search-derived units that ALSO carry a `roadmap_priority`.

## What this rule replaces

- Don't pick from `mcp-server/data/milestones/*.json` directly without checking it's in atomic-roadmap.json's lane assignment for the current chat
- Don't pick by "what's interesting" — pick by what the lane assignment + priority say
- Don't skip the shipped-subtract step — `/pick-unit` does it via `MILESTONE_PROGRESS.json`; manual picks tend to forget

## Shipped artifacts (so this rule is enforceable)

| Artifact | Where |
|----------|-------|
| Picker script | `scripts/pick-unit.mjs` |
| Skill | `.claude/commands/pick-unit.md` (`/pick-unit`) |
| This memory | `feedback_pick_unit_routing.md` |

## Companion rules

- [[reference_awareness_stack]] — `/awareness-snapshot` + `/master-index` for context before working on the picked unit
- [[feedback_roadmap_close_out]] — when the unit ships, regenerate the 4 surfaces (envelope, MILESTONE_PROGRESS, BUILD_STATE, chat-bus)
- [[feedback_always_close_out]] — finish every facet of the unit, no "deferred to follow-up"

Origin: OBSIDIAN-[[feedback_prism_os|PRISM-OS]]-MS0 / U-PICK-UNIT loop iter 9 (slot alpha, claude-7f79dd78).


## Related
[[skills/pick-unit|/pick-unit]] • [[skills/loop|/loop]] • [[skills/multi-file|/multi-file]] • [[skills/shared|/shared]] • [[skills/atomic-roadmap|/atomic-roadmap]] • [[skills/data|/data]] • [[skills/milestones|/milestones]] • [[skills/commands|/commands]] • [[skills/awareness-snapshot|/awareness-snapshot]] • [[skills/master-index|/master-index]]

## Source

Promoted from memory [[feedback_pick_unit_routing]] (referenced 4x across the vault). The memory remains the editable source of truth.

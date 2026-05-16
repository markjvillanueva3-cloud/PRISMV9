---
name: roadmap-consolidation
type: architecture
layer: automation
created: 2026-05-16
boost_keywords: [roadmap consolidation, consolidated roadmap, remaining work, bridge units, synergy layer, ROADMAP-CONSOLIDATED, pending units, wire the galaxy, what is left to do]
description: Unifies every PRISM roadmap (MILESTONE_PROGRESS + roadmap-index + 694 envelopes + BUILD_STATE + MISC-TASKS-INVENTORY + 6 prose roadmaps) into one consolidated inventory of remaining work, plus a bridge/synergy layer that wires and connects the built galaxy.
links:
  - script: scripts/consolidate-roadmaps.mjs
  - script: scripts/generate-bridge-synergy-features.mjs
  - test: scripts/consolidate-roadmaps.test.mjs
  - test: scripts/generate-bridge-synergy-features.test.mjs
  - reports: state/shared/specs/ROADMAP-CONSOLIDATED.json, state/shared/specs/ROADMAP-CONSOLIDATED.md, state/shared/specs/ROADMAP-CONSOLIDATED.html
  - augmentation: state/shared/system-viz/bridge-synergy-augmentation.json
  - wired: scripts/regen-viz.mjs (FAST[]), scripts/merge-augmentations.mjs (splice)
  - memory: reference_roadmap_consolidation_2026_05_16
  - companion: misc-tasks-extraction, close-out-audit
---

# PRISM Roadmap Consolidation + Galaxy Bridge Layer

## Problem

PRISM's planned work was scattered across uncoordinated sources — `roadmap-index.json`
(750 milestones), `MILESTONE_PROGRESS.json` (680 ms / 5,128 units), 694 envelopes,
and several un-consolidated prose roadmaps (REVENUE v7.6, BACKEND-DEVTOOLS-MEGA,
UNIFIED-v2, prism-stabilization, GIT-TREE-REMEDIATION, OBSIDIAN-INTELLIGENCE-MS3).
No single source answered "what is actually left to do." Separately, 836 built
engines were unwired — capability not connected into the galaxy.

## What it does

`scripts/consolidate-roadmaps.mjs` (pure, unit-tested) merges all sources into one
inventory `state/shared/specs/ROADMAP-CONSOLIDATED.{json,md,html}`:

- **milestones[]** — every milestone unified, with shipped/pending + which roadmaps it appears in.
- **pending_units[]** — every un-shipped unit (the master remaining-work set, from MILESTONE_PROGRESS `shipped` flags).
- **unconsolidated_prose[]** — prose-roadmap units whose unit-id is in NO envelope (work that was planned in a doc but never formalized). Found by cross-referencing 6-agent prose extractions against the envelope/MILESTONE_PROGRESS id set.
- **bridge_units** — the NEW synergy layer:
  - *wiring* — domain-grouped units covering all 836 built-but-unwired engines (top-25 domains from BUILD_STATE + a long-tail catch-all).
  - *deep_integration* — 16 curated cross-subsystem units (`DEEP_INTEGRATION_BRIDGES`) connecting SFC → the 6 CAM bridges, Master Post → CAM, CAD↔CAM AI handoff, the 3-tier AI hierarchy, closed-loop shop-floor learning, ERP ↔ scheduling/quoting, operator-in-the-loop gates.

`scripts/generate-bridge-synergy-features.mjs` emits a system-viz augmentation:
`ghost.bridge_synergy` roost + one `bridge-unit` child per wiring/deep-integration
unit. Registered in `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice.

## First run (2026-05-16, slot juliett)

849 milestones (555 with pending) · **4,497 pending units** · 1,133 prose units
extracted → **969 un-consolidated** · 318 misc orphans · bridge layer = 26 wiring
units (836 engines) + 16 deep-integration units. **Grand total remaining: 5,826
work items.**

## Why bridge units, not just wiring

`/forge7` framing: the 4,497 pending units are already tracked (as
`generate-stagnant-features` ghosts). The genuinely new value is the bridge layer
— the units that make PRISM function as ONE organism rather than a pile of built
engines: wire the 836 orphans, and connect the subsystems that should talk
(SFC↔CAM↔post, the AI tiers, closed-loop learning).

## Safety

Advisory only — never mutates a roadmap or flips an envelope. Inventory is
`mustHumanVerify`. Execution of the 5,826 items is downstream (separate /loop
or milestone passes).

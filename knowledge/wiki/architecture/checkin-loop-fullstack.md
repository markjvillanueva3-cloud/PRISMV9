---
name: checkin-loop-fullstack
type: architecture
layer: orchestration
created: 2026-05-16
boost_keywords: [checkin loop, full stack pipeline, checkin-alpha loop, autonomous loop, slot worktree pipeline, dev tool orchestration, one command pipeline]
description: The /checkin-<nato> /loop <task> contract — single canonical entry that activates the entire PRISM dev stack autonomously (slot claim + slot worktree cutover + per-iter inject chain + ROADMAP-CONSOLIDATED pickup + error-learn + slot-routed commits + auto-handoff).
links:
  - skill: .claude/commands/checkin.md
  - skill: .claude/commands/checkin-alpha.md (and 11 other NATO shortcuts)
  - skill: .claude/commands/loop.md
  - report: state/shared/specs/ROADMAP-CONSOLIDATED.json
  - companion: roadmap-consolidation, misc-tasks-extraction
  - memory: checkin-loop-fullstack-2026-05-16, reference_slot_worktree_activation_2026_05_16
---

# `/checkin-<nato> /loop` — Full-Stack Dev Pipeline Contract

## Promise

Typing `/checkin-alpha /loop <task>` is the **only** command needed to spin
up an autonomous, slot-isolated, dev-tool-saturated PRISM development session.
Slot claim, worktree cutover, file routing, per-iteration tool injection,
parallel agent dispatch, tribal-knowledge surfacing, Ollama offload, mistake
learning, and continuity-across-compact all activate without further input.

## What fires (in order)

1. `/checkin-<nato>` skill → force-claim slot → standard `/checkin` body.
2. `/checkin` §2c → migrate chat to `slot/<nato>` branch + `H:/prism-slot-<nato>` worktree (SLOT-WORKTREE-MS0 — peer-shipped activation `b8dfbf208 + 912f10fff`, 2026-05-16).
3. Three default-on routing hooks arm: `main-tree-write-block`, `git-add-lane-guard`, `worktree-commit-route` (golf slot is integrator-exempt).
4. Every `/loop` iteration = fresh UserPromptSubmit → injects fire: `master-index-precheck-inject` · `wiki-precheck-inject` · `memory-relevance-inject` · `tribal-by-domain-inject` (slot-domain-aware) · `ollama-pipeline-injector` + prewarm · `comprehensive-build-enforce`.
5. Subagent spawns get per-task pre-search (`subagent-start-context.mjs`).
6. Pickup pool = `atomic-roadmap` + `MILESTONE_PROGRESS` (shipped subtraction) + the 5826-item **ROADMAP-CONSOLIDATED** (bridge units are highest-leverage).
7. Error-learn loop: `error-pattern-capture` + `error-block-prewarn` + `error-learn-store` ledger feed Qdrant similarity into the next iter's prewarn.
8. Per-file scrutiny (multi-file builds) + end-of-task 3-of-3 Stop gate.
9. Slot-routed commits (`[SCOPE]/U-ID: title`). Golf lands into `cad-fusion-live-ms0` via `slot-integrator.mjs --land`.
10. `/compact` auto-writes the handoff; `session-start-auto-resume` continues.

## Why this entry exists

Every piece in the stack was built individually over many milestones. Until
now, no single doctrine entry named the **contract** end-to-end. New chats
re-derived the wiring; the operator had to type many commands. This is the
single pointer — read it once, then `/checkin-<nato> /loop <task>` is enough.

## Highest-leverage pickup target

`ROADMAP-CONSOLIDATED.bridge_units` — 26 wiring units (the 836 unwired
engines, domain-grouped) + 16 deep-integration units (SFC → 6 CAM bridges,
Master Post → CAM, CAD↔CAM AI, 3-tier AI hierarchy, closed-loop learning,
ERP, operator gates). Building these connects already-built capability into
one organism, faster than building the 4,497 pending units.

## Safety

Slot routing fails OPEN when a chat has no slot binding (pre-cutover state)
or is in the integrator slot. `PRISM_*_DISABLE=1` kill switches always win.
Conflict-fork rule still applies (peer-claimed files surface in the chat bus).

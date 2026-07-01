---
name: feedback_prioritize_devtools_backend
description: Standing rule — development tools and backend tools take priority over ALL other tasks
aliases: feedback_prioritize_devtools_backend
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.440Z
---


**Standing rule (user directive, 2026-05-18):** *"make it a memory to
prioritize development tools and back end tools over all other tasks"*.

Development-tooling and backend-infra units are **P0 — ahead of everything
else**: ahead of app-functionality, ahead of revenue UI, ahead of CAD/CAM
feature work, ahead of cosmetic/docs. When picking the next unit in any
`/loop`, `/checkin-<slot> /loop`, `/pick-unit`, or `/goal` cycle, sort the
eligible pool so dev-tools + backend-tools rise to the top and pick from
there first.

**Why:** dev/backend tooling is the compounding-leverage layer — it makes
every subsequent task across the whole fleet faster, safer, or cheaper. A
shipped backend tool pays dividends on all 13 slots; a shipped app feature
pays once. Pre-revenue, the multiplier matters more than the feature.

**How to apply:**
- At pickup, classify the candidate: is it dev-tooling (hooks, scripts,
  CI, scrutiny, slot/worktree infra, telemetry, dashboards, META audit
  tools) or backend (engines, dispatchers, wiring, infra-consensus,
  routing, memory/knowledge plumbing, Ollama/offload, system-viz)? If yes
  → it outranks any app-functionality / revenue / CAD-CAM-feature unit in
  the same pool.
- The priority-queue already encodes this (`lastSort` policy
  "dev-tools-first ROI sort", T0 = backend-dev/devtools/infra highest;
  blue=backend-dev sorted to TOP of `ghost.priority_queue`). This memory
  makes it an explicit standing rule so a post-`/compact` chat that
  re-derives from skill text doesn't lose it.
- Cross-cutting infra items in golf's FLEET-PENDING-EXTRACT (e.g.
  INFRA-CONSENSUS-WIRE-MS0, INFRA-AGI-ROUTER-MS2) are correctly
  highest-priority under this rule — pick them before domain feature work.
- Only deviate when the user explicitly names a non-backend task, or a
  safety/regression gate is actively blocking (a red gate outranks
  everything — it IS backend hygiene).

Reinforces [[feedback_backend_before_frontend]] and the JULIETT
dev-tools-first ROI sort. Sibling: [[feedback_ai_training_first_before_revenue]]
(AI-training is P0 within revenue sessions; this rule is the fleet-wide
generalization — backend/devtools P0 across ALL sessions).

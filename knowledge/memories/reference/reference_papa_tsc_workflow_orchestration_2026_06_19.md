---
name: reference_papa_tsc_workflow_orchestration_2026_06_19
description: "Ultracode Workflow for papa tsc-fix (38->12) -- a 14-concurrent agent burst RATE-LIMITED all agents dead; chunking to 3-concurrent worked. Agents edit, papa curates+verifies+commits. Route mechanical fan-out to LOCAL Ollama next time."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.724Z
aliases: reference_papa_tsc_workflow_orchestration_2026_06_19
---


# Papa tsc-fix via ultracode Workflow: orchestration learnings (slot:papa 2026-06-19)

Operator turned on ultracode + said "push through" at ~487k context. Drove the remaining 38 mcp-server tsc
errors down to **12 (-26)** via a one-agent-per-file Workflow, then curated + committed. Key learnings:

## 1. Concurrency: a wide burst RATE-LIMITS every agent dead
First attempt spawned 19 fix-agents + 1 verify in ONE `parallel()` barrier. The Workflow concurrency cap
(min(16, cores-2)) let ~14 spawn at once -> **the server-side rate limit ("temporarily limiting requests,
not your usage limit") killed ALL 20 agents before any did work.** Zero edits, ~1.6M tokens burned.
**Fix:** chunk the tasks -- `for (i+=CHUNK) { await parallel(slice.map(...)) }` with **CHUNK=3**. 7 sequential
batches of 3 spread the spawns over time -> 11 of 19 agents completed before the SESSION token limit hit
(the 2nd, different limit). This matches [[feedback_workflow_concurrency_and_local_routing_2026_06_08]]
(bound concurrency <=3-4) and [[feedback_ultracode_fanout_local_gpu_not_claude]] (route mechanical fan-out to
the LOCAL 96GB Blackwell via ollama, NOT N Claude subagents -- I violated this; do it next time via
ask-ollama in the script for the mechanical rewires).

## 2. Agents edit; PAPA curates -- "compiles" != "correct"
The workflow agents edited the live tree (no commit). I then: (a) ran my OWN 16GB-heap cold tsc (the workflow's
verify agent died on the session limit), (b) read every risky diff, (c) committed by EXACT PATH (the shared
tree has concurrent PEER edits -- never blanket `git add`). Outcomes:
- **InventorCAD agent REGRESSED 2->26** -- its `new Set<CADOperationKind>` + requireArg change unmasked a
  24-error cascade (the same cascade risk I'd flagged solo). **REVERTED.** A fix that compiles its own 2 lines
  can explode the file; always re-verify the whole-program count, not the agent's "fixed" claim.
- **7 files cleanly fixed** (constants.ts EDM-sinker, Chatter safety API-rewrite, FiveAxis materials, Fusion,
  LatheMaster, LatheQuality, Adaptive). The Chatter one was high-quality: it correctly identified the singleton,
  rewrote both methods to the REAL StabilityLobeDiagram.validate/.calculate API (the old code called a FABRICATED
  API that never worked) -- a real safety-path restore (the 2026-05-30 U-CHATTER-SLD-RESTORE missed these paths).
- **2 files left 1 residual error** (NXCAM `?? null` into a no-null Record; CADPartArchetype Object.freeze
  inference) -- I FINISHED both solo (conditional-spread; `Object.freeze<Archetype[]>` contextual typing).
- **CADAdapter** agent swapped a non-existent export for a real one that doesn't satisfy ICADCodeGenerator ->
  error just relocated -> REVERTED (deep conformance, route echo/CAM).

## 3. Physics/safety agent fixes: commit with REVIEW-PENDING routing, don't silently bless
constants.ts (EDM sinker, PURELY ADDITIVE + cited) + Chatter (safety) + FiveAxis (materials) were committed as
`U-TSC-PHYSICS-WF2` with explicit physics-review-pending notes routing to mike/wedm, foxtrot/oscar, india. R12:
flag what needs domain validation loudly rather than hide it; reverting would lose good work + re-break 12 errors.

## Commits (cad-fusion-live-ms0): U-TSC-CONTRACT-WF1 (4 CAM/lathe) · U-TSC-PHYSICS-WF2 (3 physics/safety) ·
U-TSC-CONTRACT-WF3 (NXCAM+CADPartArchetype). Remaining 12 = the session-limit-killed agents (TurningStochastic/
SolidCAM/CadQuery missing-API, WEDM envelope physics, ShopMachine shape, OfflineRL domain) + InventorCAD/CADAdapter
reverts -- routed to owners in PAPA-TSC-TRIAGE-2026-06-19.md.

Related: [[reference_tsc_default_heap_crash_false_green_2026_06_19]] · [[reference_chatter_new_on_singleton_missed_paths_2026_06_19]] · [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] · [[feedback_ultracode_fanout_local_gpu_not_claude]].

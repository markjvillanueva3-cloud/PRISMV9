---
name: harness-only-tools-wall-2026-06-14
description: FLEET-WIDE doctrine (slot:bravo 2026-06-14) — harness-only tools (CronCreate/CronList/Workflow/Agent) CANNOT be driven from a hook (.mjs) or dispatcher (.ts); they live in the harness, callable only by the chat model. Many "agentic" bridge units silently fabricated a Node-side surface that could drive them. Verify the cross-boundary wall before building.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.428Z
aliases: feedback_harness_only_tools_wall_2026_06_14
---


2026-06-14 (slot:bravo, AGENTIC-SUBSTRATE-BRIDGE /loop) — building the agentic-substrate bridge, THREE more planned units (after the 3 already caught in PLAN CORRECTIONS round 1) were falsified against live code. The common root cause is a **cross-boundary wall**.

## THE WALL (verify before building any "agentic" unit)
**Harness-only tools — `CronCreate`, `CronList`, `CronDelete`, `Workflow`, `Agent`, `Task*`, `Skill` — live in the Claude Code harness and are callable ONLY by the chat model.** A PRISM **hook** (`.mjs`) and a PRISM **dispatcher** (`.ts`) are plain Node processes; they CANNOT call these tools. `cron-registry-reconcile.mjs`'s own header says it plainly: *"Claude's CronList tool is not callable from Node -- it lives in the harness. So this helper consumes a CronList SNAPSHOT."*

So any unit framed as "a hook/dispatcher that calls CronList / starts a Workflow / spawns an Agent" is **not buildable as framed**. The model has to call the harness tool; Node-side code can only consume a SNAPSHOT the model dumps, or emit an advisory.

## What WAS falsified this stretch (R12)
- **#6 cron-registry-autoreconcile** — a SessionStart hook cannot produce a live CronList snapshot any more than the reconcile script can. Only buildable as a registry-staleness advisory, NOT an autoreconcile.
- **round-2 agentworkflow-control-actions** — REDUNDANT: `orchestrationDispatcher` already has `plan_create/plan_execute/plan_status/agent_execute/agent_parallel/agent_pipeline/swarm_*`. The harness `Workflow` tool is model-only. Building workflow_start/status/resume/cancel = dedup violation (R8).
- **round-2 atcs-queue-push** — likely redundant with `atcsDispatcher` `task_init/queue_next/replan/unit_complete`.

## The genuinely-buildable shape (what the 3 substituted units ARE)
Node-side agentic units that DO work: **pure-file/compute hooks** (read state/registry/handoff -> advisory) + **engine-wrapping dispatcher actions** (read files / call a TS engine). The 3 units I shipped instead — `prism_session:cag_stats` (dispatcher reads the telemetry JSON), the CLI OOM-bound (`partitionBySize`), the CAG SessionStart headline (hook imports the .mjs summarizer) — are all in this shape. They actuate; the harness-tool ones can't.

**LESSON: treat any multi-agent build plan as a HYPOTHESIS. Before building each unit, grep/read the actual file (R8) AND check the cross-boundary wall: does this require a harness-only tool from Node? If yes, re-scope to advisory/snapshot, or hand the actuation to the chat model.** → [[reference_agentic_substrate_bridge_2026_06_14]] · sibling fabrications [[reference_cag_hitrate_telemetry_2026_06_14]]

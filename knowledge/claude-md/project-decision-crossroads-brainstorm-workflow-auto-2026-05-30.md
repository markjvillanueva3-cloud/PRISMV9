---
source: project
section: DECISION CROSSROADS -> BRAINSTORM-WORKFLOW (auto, 2026-05-30)
slug: decision-crossroads-brainstorm-workflow-auto-2026-05-30
indexed_at: 2026-06-06T05:18:36.816Z
---

## DECISION CROSSROADS -> BRAINSTORM-WORKFLOW (auto, 2026-05-30)

At a genuine **crossroad** (>=2 valid paths, real/irreversible consequences, no obvious default) **auto-run the `brainstorm-path-forward` multi-agent Workflow** -- don't guess one path or ask a bare either/or. Fans out 5 strategic-lens agents (safety-first, root-cause, fastest-unblock, distributed-ownership, adversarial) -> 1 synthesis agent -> a dependency-ordered recommended path + operator-only decisions + immediate-safe-actions + risks. **Plain-text agents, NO JSON schema** (the default subagent can't reliably emit StructuredOutput -- [[reference_alpha_explore_agent_schema_incompat]]); on synthesis rate-limit or resume, re-pass the SAME `args.crossroad` (resuming without args re-runs blind). Template + trigger criteria: wiki [[crossroad-brainstorm-workflow]]. Doctrine: [[feedback_crossroad_brainstorm_workflow]]. Skip trivial decisions with an obvious default.

---
name: reference_alpha_workflow_inventory_pattern
description: For a domain inventory, an existing galaxy CLAUDE.md beats re-running a parallel-agent fan-out
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.020Z
aliases: reference_alpha_workflow_inventory_pattern
---


2026-05-29 (slot:alpha): fired a `Workflow` with 4 parallel inventory agents to enumerate the token-optimization domain. It failed (Explore+schema no-op, [[reference_alpha_explore_agent_schema_incompat]]) — but it didn't matter: the existing galaxy `CLAUDE.md` already held a prior session's *verified* inventory (10 engines, 5+ hooks, 13 skills, paths). Re-running the fan-out would have re-derived what an artifact already recorded.

**Lesson (efficiency-slot dogfood):** before launching an expensive inventory fan-out, check whether a galaxy `CLAUDE.md` / `PATHS.md` / `ENGINE_DIGEST` already enumerates the domain. The cheapest fan-out is the one you don't run. When you DO need a Workflow with structured returns, use `agentType:'general-purpose'` (not `Explore`) with the schema. Related: [[reference_alpha_token_engines_inventory]].

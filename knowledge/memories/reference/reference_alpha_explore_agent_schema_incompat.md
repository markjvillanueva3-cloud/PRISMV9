---
name: reference_alpha_explore_agent_schema_incompat
description: Workflow agent with agentType Explore + schema no-ops — completes without calling StructuredOutput
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.014Z
aliases: reference_alpha_explore_agent_schema_incompat
---


In a `Workflow`, `agent({agentType:'Explore', schema:{...}})` fails: the Explore subagent "completed without calling StructuredOutput (after 2 in-conversation nudges)" → returns empty, 0 subagent_tokens, ~8s. Observed 2026-05-29 (slot:alpha) — all 4 parallel Explore inventory agents no-op'd, workflow returned `{surfaces:[]}`.

Cause: the Explore agent's read-only excerpt-oriented system prompt doesn't honor the appended StructuredOutput instruction. **Fix:** use `agentType:'general-purpose'` when a `schema` is required, OR drop the schema for Explore agents and parse their free-text. Lesson reinforced: for a domain *inventory*, an existing galaxy `CLAUDE.md` often already holds the verified list — re-running a fan-out is wasteful ([[reference_alpha_workflow_inventory_pattern]]).

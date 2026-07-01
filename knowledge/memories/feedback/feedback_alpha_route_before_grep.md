---
name: feedback_alpha_route_before_grep
description: Route via master_index_query before Grep/Glob/Agent — 1 call vs N-file scan
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.397Z
aliases: feedback_alpha_route_before_grep
---


For "where is X?" / "what handles Y?" / "is Z built/wired?", call `prism_session:master_index_query keyword=<x>` (ranked top-K against the ~110K-node system graph + wiki + memory) BEFORE Grep/Glob/Agent. Grep is the fallback only when confidence < 0.5.

**Why:** one dispatcher call returns the answer + provenance vs an N-file scan that dumps raw content into context. The fleet route-nudge take-rate is ~0.5% — this rule is widely ignored, leaving ~120K tokens/session on the table.

**How to apply:** master_index_query first → if it whiffs, `dispatcher_map_compact` / `action_search` → only then Grep with a tight pattern. Alpha (the efficiency slot) must eat this dogfood. Related: [[feedback_system_viz_first_audit]], TOOLBELT.md.

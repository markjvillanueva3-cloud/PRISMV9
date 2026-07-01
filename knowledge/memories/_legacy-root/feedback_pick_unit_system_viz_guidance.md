---
name: feedback-pick-unit-system-viz-guidance
description: "/pick-unit and /pick-task must surface system-viz research commands as the next action after picking a unit — overall visual, file search, wiring, dedup."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.024Z
aliases: feedback_pick_unit_system_viz_guidance
---


User directive (2026-05-13): "*make sure that pick-unit or pick-task guides you to the system-viz to help for file searching, research, wiring and overall system visual. ... I just want you to improve output.*"

**The rule.** Every output of `/pick-unit` and `/pick-task` MUST emit a "Research before claiming" block that names the concrete commands the chat should run BEFORE touching code. The block is the OUTPUT — it's not optional; the user explicitly asked for the output to be improved with this guidance.

**Why:** When the chat starts a unit cold, the default move is Grep/Glob exploration to find related files. The system-viz graph + master-index already index this — the research-pack tells the chat "use the indexes you already have." Avoids 5–10 min of wasted token-cost on each unit pick.

**How to apply:**
1. `/pick-unit` — handled by `scripts/pick-unit.mjs` `researchPack(pick)` function. Emits in text mode after the picks; JSON mode exposes per-pick `research[]` array of `{cmd, why}`. Auto-extracts asset tokens (PascalCase `XxxEngine`/`XxxHook`/`XxxSkill`/etc., or `/slash-skill` names, or milestone id fallback).
2. `/pick-task` — handled by Step 5.5 in `H:/.claude/commands/pick-task.md`. Chat must print the same research block manually before Step 6 (Claim).
3. Required command surface (in this order):
   - `/system-viz` — 3D map at :8765 for *overall visual*
   - `node scripts/system-viz-query.mjs find <token>` — for *file searching* (graph node lookup)
   - `node scripts/system-viz-query.mjs blast-radius <token>` — for *wiring* (refactor impact)
   - `prism_session:master_index_query q="<token>"` — unified text/semantic search BEFORE Grep/Glob
   - `/awareness-snapshot` — built/wired/drifted state (see if deliverables already partially exist)
   - `/orphan-inventory` — built-but-unwired engine punch list
   - `/dedup` — mandatory before creating ANY new engine / hook / skill / script

4. Order is deterministic: **system-viz → master_index → awareness-snapshot → orphan-inventory → dedup → code.**

When updating either skill, preserve this block — the chat that reads the output should never have to ask "what do I do next."

Related: [[reference_system_viz]] (the 3D viewer), [[reference_master_index_surface]] (unified index), [[reference_awareness_stack]] (the 6-surface awareness stack the research-pack ties together).

Shipped: pick-unit.mjs + pick-unit.md + pick-task.md edits on 2026-05-13 by claude-0d2e1b74 (slot BRAVO) per this directive.


## Related
[[engines/XxxEngine|XxxEngine]] • [[dispatchers/prism_session|prism_session]] • [[skills/pick-unit|/pick-unit]] • [[skills/pick-task|/pick-task]] • [[skills/etc|/etc]] • [[skills/slash-skill|/slash-skill]] • [[skills/commands|/commands]] • [[skills/system-viz|/system-viz]] • [[skills/system-viz-query|/system-viz-query]] • [[skills/semantic|/semantic]]
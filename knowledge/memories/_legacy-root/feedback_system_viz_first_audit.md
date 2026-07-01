---
name: feedback-system-viz-first-audit
description: "Standing rule (2026-05-15 doctrine, SYSTEM-VIZ-BRAIN-MS0/U-P0-SVB-DOCTRINE) — query /system-viz BEFORE Grep/Glob/Agent on any \"does X exist / is X wired / are there orphan Y\" question. Grep is fallback when graph confidence < 0.5."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.085Z
aliases: feedback_system_viz_first_audit
---


**Rule:** Before any cross-cutting discovery question — exists / wired / depends / duplicate / orphan — run `node H:/prism/scripts/system-viz-query.mjs find <noun>` first. Grep / Glob / Agent search is the FALLBACK when graph confidence is below 0.5, not the first move.

**Why:** Three independent agent reports on 2026-05-15 claimed PRISM was missing capabilities — `OllamaHookBridgeEngine` (claimed orphan; was 10-ref wired), `QdrantMemoryEngine` (claimed no action; was 4-ref wired), `CrossDisciplinaryDeepLearningEngine` (claimed orphan; was 3-ref wired), `distill-tribal` (claimed missing; existed as skill + script), RTK auto-wrap (claimed missing; 3 hooks already wired). Each took grep < 30 seconds to "answer" wrong; `/system-viz` took < 30 seconds to answer right. Grep matches *text*; the graph materializes edges (dispatcher imports, wiki backlinks, test coverage, milestone refs). The cost of grep-only audits isn't just wrong answers — it's hours of duplicate engine work that ships before the wrongness surfaces.

**How to apply:**
1. Detect the question is *discovery* (keywords: exists / wired / orphan / duplicate / where is / find all / how many / list all / audit / inventory / gap analysis / are there any). The [[audit-viz-first-skill]] hook auto-detects on UserPromptSubmit.
2. Extract the candidate noun. Quoted > CamelCase > kebab-case > first non-stopword token.
3. Run `node H:/prism/scripts/system-viz-query.mjs find <noun>`. Interpret layers: L5=engine, L6=script/hook/skill/test, L8=wiki, L9=worktree/milestone, L10=vault. Multi-layer match = high confidence.
4. Drill with `system-viz-query.mjs node-status <id>` for dispatcher wiring + buildClass.
5. Free-text concepts → `prism_session:master_index_query` (semantic search on the same graph).
6. Only grep when none of the above produces a hit with confidence ≥ 0.5 — and post the gap to the chat bus so the graph can be backfilled.

**Forge integration:** every new audit/regen/discovery script MUST declare its system-viz-query call before any grep. Per-file scrutiny rejects forge stubs that grep without graph-first. This is the envelope-level `doctrine_principle` of SYSTEM-VIZ-BRAIN-MS0.

**Surfaces:** [[reference_master_index_surface]] (search-first discipline, same graph) · [[reference_awareness_stack]] (6-surface fleet awareness) · [[system-viz-first-audit]] (full wiki entry) · `.claude/hooks/audit-viz-first-inject.mjs` · `.claude/commands/audit-viz-first.md`

**Knobs:** `PRISM_AUDIT_VIZ_FIRST_DISABLE=1` · `PRISM_AUDIT_VIZ_FIRST_K=N` (default 5) · `PRISM_AUDIT_VIZ_FIRST_TIMEOUT_MS=N` (default 8000).


## Related
[[engines/OllamaHookBridgeEngine|OllamaHookBridgeEngine]] • [[engines/QdrantMemoryEngine|QdrantMemoryEngine]] • [[engines/CrossDisciplinaryDeepLearningEngine|CrossDisciplinaryDeepLearningEngine]] • [[dispatchers/prism_session|prism_session]] • [[skills/prism|/prism]] • [[skills/scripts|/scripts]] • [[skills/system-viz-query|/system-viz-query]] • [[skills/system-viz|/system-viz]] • [[skills/hook|/hook]] • [[skills/skill|/skill]]
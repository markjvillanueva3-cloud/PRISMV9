---
name: feedback-system-viz-first-audit
description: "Standing rule (2026-05-15; reinforced 2026-05-27) — for any assessment, deep system search, or discovery question, automatically use the trio /system-viz + master-index + system-graphs BEFORE Grep/Glob/Agent. Grep is fallback when graph confidence < 0.5."
aliases: feedback_system_viz_first_audit
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.446Z
---


**Rule:** Before any **assessment**, **deep system search**, or cross-cutting discovery question — exists / wired / depends / duplicate / orphan / "where is X used" / "how many of Y" / "what's the blast radius" / "give me the full picture of Z" — **automatically reach for the three-graph stack first:**

1. **`/system-viz`** (or `node H:/prism/scripts/system-viz-query.mjs find <noun>`) — visual + queryable 110K-node knowledge graph
2. **`prism_session:master_index_query`** — ranked unified search across system-graph + wiki + memory (auto-injects top-K on UserPromptSubmit)
3. **System graphs on disk** — `state/shared/system-viz/system-graph.json`, `state/shared/architecture-graph.json` (read raw when query helpers can't express the question)

Grep / Glob / Agent search is the FALLBACK when the three-graph stack returns confidence below 0.5 — never the first move. The user codified this on 2026-05-27 as a no-exceptions doctrine for assessment + deep-search work.

**Why:** Three independent agent reports on 2026-05-15 claimed PRISM was missing capabilities — `OllamaHookBridgeEngine` (claimed orphan; was 10-ref wired), `QdrantMemoryEngine` (claimed no action; was 4-ref wired), `CrossDisciplinaryDeepLearningEngine` (claimed orphan; was 3-ref wired), `distill-tribal` (claimed missing; existed as skill + script), RTK auto-wrap (claimed missing; 3 hooks already wired). Each took grep < 30 seconds to "answer" wrong; `/system-viz` took < 30 seconds to answer right. Grep matches *text*; the graph materializes edges (dispatcher imports, wiki backlinks, test coverage, milestone refs). The cost of grep-only audits isn't just wrong answers — it's hours of duplicate engine work that ships before the wrongness surfaces.

**How to apply:**
1. **Detect the question is *assessment* or *deep search***. Trigger keywords: exists / wired / orphan / duplicate / where is / find all / how many / list all / audit / inventory / gap analysis / are there any / **assess / assessment / survey / inspect / deep dive / full picture / blast radius / map out / show me everything about / what depends on / what does X touch**. The [[audit-viz-first-skill]] hook auto-detects on UserPromptSubmit; the broader-scope keywords (assess/deep/full picture/blast radius) should be added to the trigger list when next edited.
2. **Extract the candidate noun.** Quoted > CamelCase > kebab-case > first non-stopword token.
3. **Run all three graph surfaces in parallel** (one tool-call block):
   - `node H:/prism/scripts/system-viz-query.mjs find <noun>` — layer-tagged hits
   - `prism_session:master_index_query` with the same noun — semantic/ranked search
   - For deep-graph traversal (not just lookup), read `state/shared/system-viz/system-graph.json` and follow edges
4. **Interpret layers:** L5=engine, L6=script/hook/skill/test, L8=wiki, L9=worktree/milestone, L10=vault. Multi-layer match = high confidence. Cross-reference the three surfaces; they should agree.
5. **Drill with `system-viz-query.mjs node-status <id>`** for dispatcher wiring + buildClass on a specific hit.
6. **Only grep** when all three surfaces produce hits with confidence < 0.5 — and post the gap to the chat bus so the graph can be backfilled.

**Anti-pattern (do NOT do this):** Open with `Grep -r "MyEngine"` or `find . -name "*config*"` on an assessment task. That's how the 2026-05-15 false-orphan incidents happened (5 engines claimed missing, 5 actually wired). The graph stack would have shown wiring in < 30 seconds; grep took 30 minutes to be wrong.

**Forge integration:** every new audit/regen/discovery script MUST declare its system-viz-query call before any grep. Per-file scrutiny rejects forge stubs that grep without graph-first. This is the envelope-level `doctrine_principle` of SYSTEM-VIZ-BRAIN-MS0.

**Surfaces:** [[reference_master_index_surface]] (search-first discipline, same graph) · [[reference_awareness_stack]] (6-surface fleet awareness) · [[system-viz-first-audit]] (full wiki entry) · `.claude/hooks/audit-viz-first-inject.mjs` · `.claude/commands/audit-viz-first.md`

**Knobs:** `PRISM_AUDIT_VIZ_FIRST_DISABLE=1` · `PRISM_AUDIT_VIZ_FIRST_K=N` (default 5) · `PRISM_AUDIT_VIZ_FIRST_TIMEOUT_MS=N` (default 8000).

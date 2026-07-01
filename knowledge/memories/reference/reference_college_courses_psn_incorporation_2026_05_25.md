---
name: reference-college-courses-psn-incorporation-2026-05-25
description: "College-course → PSN 11-leg cross-walk. 220-course corpus (94 MIT-OCW + 17 academy + 109 triplet-stubs) ALREADY largely incorporated; the missing layer is the cross-cutting map. Top 5 multiplier courses + named open follow-up U-COURSE-FORGE-P1-DISPATCHER + per-leg bridge candidates."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.524Z
aliases: reference_college_courses_psn_incorporation_2026_05_25
---


# College courses → PSN incorporation — papa /loop 2026-05-25

User directive (interrupting earlier arc): *"utilize nodes from college course work and do deep research on all and how to incorporate them into PSN"*.

## What surfaced when I queried the live graph

Master-index reports **1,483 college-related nodes** in the 546MB system-graph.json (queried via `readGraphStreaming`):
- **94 MIT-OCW course wiki nodes** (19 MIT 2.x mech-eng + 10 MIT 6.x EECS + 65 other-prefix) at `wiki.architecture.courses_mit-*`
- **17 PRISM Academy course nodes** at `academy-course-*`
- **109 triplet-stub subprimitive dirs** at `wiki/architecture/courses/triplet-stubs/`
- **188 outgoing edges** from course nodes (= they're already wired into the graph)
- **7 algorithm primitives** in `mcp-server/src/algorithms/` derived from MIT-OCW courses (india /loop bc83bbdb, 2026-05-17 — see [[reference_course_forge_conversions_2026_05_17]])
- **`PRISM_UNIVERSITY_ALGORITHMS.js`** monolith module + `kb-university-algorithms` KB registry entry

## The state-of-incorporation picture

Most of the work the user's directive implies is ALREADY DONE — the india slot session 2026-05-17 took the [[reference_knowledge_conversion_ms0_2026_05_17|KNOWLEDGE-CONVERSION-MS0]] forge-queue and shipped 8 tested primitives + tooling. The **missing layer** was a cross-cutting *map* that any chat can use to answer "which PSN leg does course X inform" or "what college course covers physics topic Y" — that map is what this session built.

## The deliverable

`knowledge/wiki/architecture/college-courses-psn-incorporation.md` — comprehensive per-leg incorporation table:

| Leg | Already-incorporated | Bridge candidate (named, low-risk) |
|---|---|---|
| Obsidian brain | 4 ref memos | per-algorithm `reference_<algo>_origin_<course>.md` memos |
| PRISM OS | `prism_session:knowledge_base_query` exposes KB | `prism_operating_system:college_course_query` action |
| Wiki | 94 MIT + 17 academy + 109 triplet-stubs | promote stub-frontmatter entries via Ollama-summarize pass |
| Memories | 4 ref memos | doctrine memos extracting course teachable principles |
| Tribal | [[reference_tribal_by_domain_inject|tribal-by-domain-inject]] surfaces course tips | `course-to-tribal-tips.mjs` extractor |
| System Viz | 94 nodes + 188 edges | `ghost.college_corpus` roost overlay |
| Engines | none directly (primitives in algorithms/) | algorithm → engine dependency edge generator |
| Algorithms | 7 primitives + 148 tests | **`U-COURSE-FORGE-P1-DISPATCHER`** (named open follow-up) |
| Formulas | no inline constants in primitives (R7 compliance) | `formula_provenance` field |
| NN/GNN | 6.S191 cited conceptually | course-wiki embedding pass (sister to engine-wiki embedder) |
| PRISM AI | KB registry exposed via `aiSystemRouterEngine` | `searchCollegeCorpus()` step in `prismCreativeReasoningEngine.explore()` |

## Top 5 high-leverage multiplier courses (touch ≥3 legs)

1. **MIT-OCW 2.830 Control of Manufacturing Processes** — Wiki + Algorithms + Tribal + Engines + PRISM AI
2. **MIT-OCW 2.008 Design and Manufacturing II** — Wiki + Algorithms + Engines + Tribal
3. **MIT-OCW 6.S191 Introduction to Deep Learning** — Wiki + NN/GNN + PRISM AI
4. **MIT-OCW 2.813 Energy, Materials, and Manufacturing (Sustainable)** — Wiki + Tribal + Engines
5. **MIT-OCW 2.003 / 2.003j Dynamics** — Wiki + Algorithms + Engines

These five are the highest-ROI entry points for any future course→PSN incorporation work.

## The named open follow-up

`U-COURSE-FORGE-P1-DISPATCHER` — wire the 7 algorithm primitives to MCP dispatcher surface using `SafeExpressionEvaluator` (Option A keystone already shipped). Decision spec: `state/shared/specs/U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md`. **Operator-gated** because `algorithmDispatcher.ts` is heavily peer-claimed.

## How a chat queries this map at runtime

```bash
cd H:/prism/scripts && node --input-type=module -e "
import { readGraphStreaming } from './lib/graph-io.mjs';
import path from 'node:path';
const g = readGraphStreaming(path.resolve('../state/shared/system-viz/system-graph.json'));
const courseId = 'wiki.architecture.courses_mit-2-830-control-of-manufacturing-processes';
const edges = (g.edges||[]).filter(e => (e.from||e.source)===courseId || (e.to||e.target)===courseId);
console.log('Course edges:', edges.length);
for (const e of edges) console.log('  ', e.from||e.source, '→', e.to||e.target);
"
```

## Sister deliverables this session

- **46 V8 graph-read crashes fixed** (3 manual + 43 via new `scripts/migrate-legacy-graph-reads.mjs`) — root cause: `JSON.parse(fs.readFileSync(GRAPH, "utf8"))` against the 546MB graph hits V8's ~512MB max-string-length ceiling. The 2026-05-17 spec misdiagnosed this as heap-OOM. The streaming-gate at 256MB threshold uses `readGraphStreaming` from `scripts/lib/graph-io.mjs` (papa /loop 2026-05-23 fix).
- **system-viz regen** now succeeds for previously-failing generators (`generate-hooks-atomic`, `generate-tests-atomic`, `generate-wiring-overlay`, etc.) — `validate-ghost-wires.mjs` line 264 is the 1 remaining V8 crash my migration regex missed (different variable name from `GRAPH`).
- **master-index queries now resolve** — was emitting `system-graph.json unavailable` fallback; now reports 110K nodes available. Confirmed by the auto-inject in this session's later prompts.

## How to apply

- Operator query: `/master-index "mit 2.830"` or any other course → returns the wiki entry + linked algorithms + tribal hits.
- Any chat picking a unit that touches college coursework: read this map first to see whether work is already shipped (saves duplicate effort).
- Future `/loop` on PSN-incorporation: pick from the bridge-candidate column — each row is sized for a single autonomous iteration.

## Related

- [[reference_course_forge_conversions_2026_05_17]] — the 7 primitives + composition graph
- [[reference_knowledge_conversion_ms0_2026_05_17]] — parent milestone
- [[reference_engine_wiki_embedder_2026_05_24]] — sister data-side (engine wiki embedding for NN tier-5)
- [[feedback_psn_definition]] — canonical PSN 11-leg taxonomy
- Wiki: `knowledge/wiki/architecture/college-courses-psn-incorporation.md`

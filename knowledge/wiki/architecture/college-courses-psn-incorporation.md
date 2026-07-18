---
title: College courses → PSN 11-leg incorporation map
created: 2026-05-25
slot: papa
related:
  - [[knowledge-conversion-ms0]]
  - [[course-forge-conversions]]
  - [[course-forge-stubs-emitter]]
  - [[feedback_psn_definition]]
status: built
---

# College courses → PSN 11-leg incorporation map

A research-grade cross-walk between PRISM's 220-course corpus (94 MIT-OCW + 17 PRISM Academy + 109 other) and the canonical PRISM Synergy Network (PSN) 11-leg taxonomy. Every course is either already incorporated into a leg, **could** be incorporated via a named bridge, or is documented as out-of-scope. This is the substrate that lets *any* chat answer "what college course informs PSN leg X" or "what PSN leg should ingest course Y".

## What this answers

1. **Per-leg incorporation status** — which courses already live in each leg, which courses *could* go there via a named bridge.
2. **Cross-leg multipliers** — courses that touch ≥3 legs are high-leverage entry points.
3. **The dispatcher-wiring blocker** — the 7 algorithm primitives shipped by [[course-forge-conversions]] live in `mcp-server/src/algorithms/` but are not yet MCP-callable; the bridge spec is `U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md` and its keystone (`SafeExpressionEvaluator`) is built — wiring is the named open follow-up.

## Existing substrate (live counts, queried 2026-05-25)

| Surface | Count | Path |
|---|---:|---|
| MIT 2.x mechanical-engineering course wiki nodes | 19 | `knowledge/wiki/architecture/courses/mit-2-*.md` |
| MIT 6.x EECS course wiki nodes | 10 | `knowledge/wiki/architecture/courses/mit-6-*.md` |
| MIT other-prefix course wiki nodes | 65 | `knowledge/wiki/architecture/courses/mit-*.md` |
| PRISM Academy course wiki nodes | 17 | `knowledge/wiki/architecture/courses/academy-course-*.md` |
| Triplet-stubs (Q&A subprimitives extracted from courses) | 109 dirs | `knowledge/wiki/architecture/courses/triplet-stubs/` |
| Algorithm primitives extracted from college coursework | 7 | `mcp-server/src/algorithms/{OperatorSplittingMethod, ODEIntegrator, LinearStateSpaceModel, FiniteDifferenceMethod, GradientDescent, FiniteElementMethod1D, LagrangianMechanics}.ts` |
| `PRISM_UNIVERSITY_ALGORITHMS.js` monolith module | 1 (4 wiki refs) | `knowledge/wiki/architecture/monolith-modules/` |
| KB registry entry | 1 | `reg.knowledgebaseregistry.entry.kb-university-algorithms` |
| Total college-related graph nodes | **1,483** | system-graph.json (queried via `readGraphStreaming`) |
| Course-outgoing edges in graph | **188** | course nodes → wiki/algorithm/topic |

## PSN 11-leg incorporation table

> *Already-incorporated* = course content has shipped, wired, and is queryable through the leg's surface today.
> *Bridge candidate* = course content is ingested but not yet routed into this leg; named action below.
> *Out of scope* = course is a foundational-only reference that does not contribute working PSN state.

### Leg #1 — Obsidian brain (cross-session memory)

- **Already-incorporated**: every reference memo for shipped college-derived work (`reference_course_forge_conversions_2026_05_17.md`, `reference_knowledge_injection_pipeline_2026_05_17.md`, `reference_knowledge_conversion_ms0_2026_05_17.md`, `reference_course_forge_stubs_emitter_2026_05_17.md`).
- **Bridge candidate**: per-course derivation memos. Today the 7 algorithm primitives have their lineage cited *in the source `.ts` files* (NOT in Obsidian) — `OperatorSplittingMethod` cites MIT-OCW 10.34 only in its docblock. A per-algorithm `reference_<algo>_origin_<course>.md` memo would close that gap.
- **Out of scope**: PRISM Academy curriculum (lives in [[academy-courses]] index, not the cross-session brain).

### Leg #2 — PRISM OS (`prism_operating_system` ~45 actions)

- **Already-incorporated**: KB registry exposes `kb-university-algorithms` via `prism_session:knowledge_base_query`.
- **Bridge candidate**: a `prism_operating_system:college_course_query` action that takes a topic and returns the courses + their derived algorithms (today operators must hit the wiki directly).
- **Out of scope**: academic prerequisite chains (not a runtime concern).

### Leg #3 — Wiki (Karpathy LLM-wiki)

- **Already-incorporated**: 94 MIT course nodes + 17 academy nodes + 109 triplet-stubs already live in `knowledge/wiki/architecture/courses/`. Outgoing edges: 188. This is the densest leg.
- **Bridge candidate**: most MIT course wiki entries are titled "(title pending — MIT 2.003j-fall-2007)" — they exist but have stub frontmatter. A scan + Ollama-summarize pass (per [[wiki-morning]] cadence) would lift them out of stub status.
- **Out of scope**: none — wiki is the canonical home for course knowledge.

### Leg #4 — Memories (`knowledge/memories/{feedback,reference,project}/`)

- **Already-incorporated**: 4 reference memos (listed under Leg #1).
- **Bridge candidate**: a `feedback_<topic>` doctrine memo capturing each course's *teachable principle* (e.g., `feedback_lyapunov_stability_first_design` from MIT 2.14). Today the doctrines are scattered through the algorithm source comments. A consolidated extraction is a single-loop run.
- **Out of scope**: none — every shipped course-derived primitive should have a memory pointer.

### Leg #5 — Tribal (3,919 tip corpus + 296 playbook rules)

- **Already-incorporated**: tribal-by-domain-inject already surfaces course-derived tips when a slot's domain matches.
- **Bridge candidate**: a `course-to-tribal-tips.mjs` extractor that walks each course's triplet-stub Q&A subprimitives and emits `KnowledgeTip[]` entries with `source: "college-course-<id>"` provenance. Today triplet-stubs are documented but NOT promoted into the tribal corpus.
- **Out of scope**: pure-math topics with no shop-floor application.

### Leg #6 — System Viz (the render substrate)

- **Already-incorporated**: 94 course nodes + 188 outgoing edges + L10 vault-pointer nodes all visible in `/system-viz`.
- **Bridge candidate**: a `ghost.college_corpus` roost overlay (sister to `ghost.bridge_synergy`, `ghost.priority_queue`) showing the 220-course corpus as a discoverable layer with academy / MIT-2.x / MIT-6.x / other-prefix sub-clusters and edges to the 7 algorithm primitives. Generator: `scripts/generate-college-corpus-features.mjs`. Splice into `merge-augmentations.mjs` per the established augmentation pattern.
- **Out of scope**: none.

### Leg #7 — Engines (`mcp-server/src/engines/`)

- **Already-incorporated**: none of the 7 college-derived algorithm primitives are *engines* — they live in `src/algorithms/` deliberately (composable primitives, not domain hubs). Engines that COMPOSE them (e.g., `RegenerativeChatterEngine` uses ODE integration) are the surface.
- **Bridge candidate**: an `algorithm → engine` dependency edge generator. Today the algorithm primitives aren't shown as dependencies of the engines that use them. Generator: walk `import` statements in `src/engines/` against `src/algorithms/`, emit edges in `merge-augmentations.mjs` (matches the pattern in `generate-engine-import-edges.mjs`).
- **Out of scope**: hand-rebuilding engines that already work — the algorithm primitives are *additive substrate*, not replacements.

### Leg #8 — Algorithms (`mcp-server/src/algorithms/`)

- **Already-incorporated**: 7 college-derived primitives (`OperatorSplittingMethod`, `ODEIntegrator`, `LinearStateSpaceModel`, `FiniteDifferenceMethod`, `GradientDescent`, `FiniteElementMethod1D`, `LagrangianMechanics`) + `SafeExpressionEvaluator` keystone, 148 tests. See [[course-forge-conversions]] for composition graph.
- **Bridge candidate**: **`U-COURSE-FORGE-P1-DISPATCHER`** — wire 5 of 7 to the MCP dispatcher surface using `SafeExpressionEvaluator` to pass closure-input as expression strings. Decision spec: `state/shared/specs/U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md`. **This is the single highest-leverage open follow-up for college-course work in PRISM.**
- **Out of scope**: rebuilding optimizers — `BayesianOptimizer`/`GeneticOptimizer` already exist; `GradientDescent` complements (not replaces) them.

### Leg #9 — Formulas (`FormulaRegistry`)

- **Already-incorporated**: course-derived primitives do NOT inline physics constants (Karpathy R7 — every algorithm is a numerical/algebraic primitive; masses, lengths, gravity, cutting coefficients are caller-supplied).
- **Bridge candidate**: a `formula_provenance` field on every `FormulaRegistry` entry that references its course-of-origin (today `kc1.1`, `Taylor n/c`, etc. cite their published source, not the academic course that teaches them). Low-priority — provenance lives in `src/physics/constants.ts` docstrings.
- **Out of scope**: course-derived primitives that are *not* physics (`GradientDescent`, `OperatorSplittingMethod` — pure numerical methods).

### Leg #10 — NN/GNN (tier-5 wiring-inference, GraphSAGE)

- **Already-incorporated**: `MIT-6.S191 Introduction to Deep Learning` is a course node; the GraphSAGE implementation in `mcp-server/src/ml/` cites it conceptually.
- **Bridge candidate**: course-derived knowledge as a training-feature corpus for the wiring-inference cascade. Today the NN tier-5 model is trained on graph-structural features (node degree, neighborhood overlap) + 768-d embeddings of wiki text. The 220-course corpus is exactly the kind of *domain-grounded textual feature* that could lift AUROC past the 0.78 promotion gate. The engine-wiki embedder running in this session ([[reference_engine_wiki_embedder_2026_05_24]]) is the data-side. A sister run that embeds the course wiki entries would add another ~220 feature-rich nodes to the training corpus.
- **Out of scope**: NN training on academy-only curriculum (too domain-narrow to generalize).

### Leg #11 — PRISM AI (capability registry, `prism_ai` dispatcher)

- **Already-incorporated**: `kb-university-algorithms` is in the knowledge-base registry that `aiSystemRouterEngine.route()` queries.
- **Bridge candidate**: when `prismCreativeReasoningEngine.explore(problem, "optimal")` runs, it does NOT currently consult the college-course corpus for cross-domain analogies. A `searchCollegeCorpus(domain, problem)` step in the explore pipeline would surface, e.g., "MIT 2.830 Control of Manufacturing Processes" when a chatter-stability problem is on the table.
- **Out of scope**: routing PRISM AI to *teach* a course — academy curriculum is for human operators, not AI-loop consumption.

## Cross-leg high-leverage multipliers

Courses that touch **3+ legs** simultaneously are the highest-ROI entry points for any future work:

| Course | Legs touched | Why it's a multiplier |
|---|---|---|
| **MIT-OCW 2.830 Control of Manufacturing Processes** | Wiki, Algorithms (via LinearStateSpaceModel), Tribal (SPC + control rules), Engines (would inform ChatterStabilityLobe), PRISM AI | Direct match to PRISM's safety-critical CNC domain |
| **MIT-OCW 2.008 Design and Manufacturing II** | Wiki, Algorithms (FEM via FiniteElementMethod1D), Engines (DFM/DFMA), Tribal | The manufacturing-design bridge course |
| **MIT-OCW 6.S191 Introduction to Deep Learning** | Wiki, NN/GNN (direct training reference), PRISM AI | Underpins tier-5 wiring inference |
| **MIT-OCW 2.813 Energy, Materials, and Manufacturing (Sustainable)** | Wiki, Tribal, Engines (MaterialRegistry, ECO costing) | Energy/sustainability ROI for shop-floor decisions |
| **MIT-OCW 2.003 / 2.003j Dynamics** | Wiki, Algorithms (LagrangianMechanics, ODEIntegrator), Engines (deflection, dynamics) | Mechanism modeling foundation |

## The named open follow-up

**`U-COURSE-FORGE-P1-DISPATCHER`** — wire the 7 algorithm primitives to the MCP dispatcher surface. Decision spec: `state/shared/specs/U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md` (3 options, Option A keystone shipped). Operator-gated (not autonomous /loop) because `algorithmDispatcher.ts` is heavily peer-claimed; the wiring touches a high-collision surface and should be a deliberate operator-reviewed step.

## How to query this map at runtime

Query a course's PSN-leg incorporation status via the live system-graph:

```bash
cd H:/prism/scripts
node --input-type=module -e "
import { readGraphStreaming } from './lib/graph-io.mjs';
import path from 'node:path';
const g = readGraphStreaming(path.resolve('../state/shared/system-viz/system-graph.json'));
const courseId = 'wiki.architecture.courses_mit-2-830-control-of-manufacturing-processes';
const courseNode = g.nodes.find(n => n.id === courseId);
const edges = (g.edges||[]).filter(e => (e.from||e.source)===courseId || (e.to||e.target)===courseId);
console.log('Node:', courseNode?.label);
console.log('Edges:', edges.length);
for (const e of edges) console.log('  ', e.from||e.source, '→', e.to||e.target, '(', e.type, ')');
"
```

Or via the master-index dispatcher action:

```js
prism_session:master_index_query({ query: "mit 2.830 control of manufacturing", k: 5 })
```

## Doc-reflection per [[feedback_reflect_all_changes_post_update]]

- Memory: `reference_college_courses_psn_incorporation_2026_05_25.md` (this entry's sister memo)
- CLAUDE.md: no §-level addition (pointer-only — the 11-leg taxonomy already lives in [[feedback_psn_definition]])
- Obsidian: auto-fed by `stop-obsidian-memory-feed.mjs`

## See also

- [[knowledge-conversion-ms0]] — parent milestone (3-lane router: direct-wire / port-verify / forge-queue)
- [[course-forge-conversions]] — the 7 algorithm primitives + composition graph (india 2026-05-17)
- [[course-forge-stubs-emitter]] — the operator-action tooling layer
- [[feedback_psn_definition]] — canonical PSN 11-leg taxonomy
- [[reference_engine_wiki_embedder_2026_05_24]] — sister data-side: engine wiki embedding (closes NN tier-5)
- `state/shared/specs/COURSE-FORGE-PROPOSALS.md` — P1-P10 hand-curated stubs
- `state/shared/specs/COURSE-FORGE-STUBS.md` — 62-stub auto-bundle
- `state/shared/specs/U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md` — the wiring decision record

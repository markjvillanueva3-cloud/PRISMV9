# mit-curriculum Galaxy MEMORY.md

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="mit curriculum" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:mit-curriculum]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/mit-curriculum_synthesis.md` (qwen2.5-coder:7b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Harvest-on-Demand**: The MIT-OCW corpus is harvested on-demand. This means that data extraction occurs as needed rather than being pre-extracted.
- **Departmental Categorization**: Courses are categorized based on their department and subject matter (e.g., optimization, manufacturing).
- **Engine Synergy**: Consuming engines such as `systemhealthengine`, `paretooptimizeengi`, etc., work in conjunction to process and utilize the extracted data.
- **Course Structure**: Courses are typically organized into semesters (fall, spring) and departments (e.g., Sloan / ESD, EECS).
- **Data Extraction**: Data is extracted on-demand rather than pre-extracted. The path `H:/PRISM/extracted/mit-ocw/` does not exist; the real slot is `data/extracted-knowledge/mit-courses/`.
- **Category Consistency**: Courses are categorized consistently within their respective departments (e.g., optimization, manufacturing).

## Indexed memories
- **Domain corpus (live counts):** 32 curated memory file(s) · 346 wiki entr(y/ies) · 31 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 441 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="mit-curriculum" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/reference/reference_a2_mit_ai_textbooks_registered_2026_06_08.md` · `knowledge/memories/reference/reference_ahmad_osman_llm_curriculum_2026_05_25.md` · `knowledge/memories/reference/reference_api_ratelimit_wsl_commit_2026_06_08.md` · `knowledge/memories/reference/reference_commit_coord_ms0_2026_05_20.md` · `knowledge/memories/reference/reference_cross_chat_commit_misattribution_2026_05_18.md`
- **Sample wiki:** `knowledge/wiki/software-engineering/commit-message-conventions.md` · `knowledge/wiki/reference/reference-cross-chat-commit-misattribution-2026-05-18.md` · `knowledge/wiki/lessons/commit-pressure-find-the-real-committer.md` · `knowledge/wiki/lessons/conflict-fork-rule-reliably-defeats-commit-ownership-guard-hollowing.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/commit-subject-discipline.md` · `knowledge/wiki/code-tribal/learnings/academy-corpus-ms0-u-a2-mit-ai-textbooks-metadata-contract.md` · `knowledge/wiki/code-tribal/learnings/academy-corpus-ms0-u-a2-mit-ai-textbooks-register.md`

## Cross-galaxy bridges
- **academy** (`engines/academy/`) — CONSUMER: teaches courses/curriculum/lessons sourced from here (master `MEMORY.md` `[galaxy:academy]`; `knowledge-conversion-ms0.md` adjacency).
- **knowledge-conversion** (`engines/knowledge-conversion/`) — CONSUMER/router: routes MIT-OCW source into the 6-node-type pipeline (project `CLAUDE.md` §KNOWLEDGE-CONVERSION-MS0; galaxy `CLAUDE.md` §Related galaxies).
- **pdf-corpus** (`engines/pdf-corpus/`) — sibling SOURCE corpus (master `MEMORY.md` `[galaxy:pdf-corpus]`; galaxy `CLAUDE.md` cross-galaxy edge `↔ pdf-corpus`).

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Course Title Pending**: Many courses have pending titles, which need to be addressed for better organization.
- **Data Path Verification**: The path `H:/PRISM/extracted/mit-ocw/` should be verified or updated to reflect the actual slot `data/extracted-knowledge/mit-courses/`.
- **Engine Integration**: Further integration and optimization of consuming engines to ensure efficient data processing and utilization.

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Primary domain
MIT OpenCourseWare is this galaxy's source corpus: raw OCW course exports (lecture notes, assignments, exams, readings, transcripts) are ingested and indexed so PRISM can convert academic course material into manufacturing-relevant knowledge nodes. It is a SOURCE/extraction galaxy — it produces course knowledge that the academy galaxy teaches and the knowledge-conversion galaxy routes into algorithms/formulas/engines. It is NOT a physics or G-code domain.

## Key engines & paths
Verified under `mcp-server/src/engines/` (name-matched to this domain, each exists on disk):
- `MitCourseIndexEngine.ts` — "Indexes 200+ MIT OpenCourseWare courses" (per `ENGINE_DIGEST.md`).
- `MITCourseRegistryEngine.ts` — course registry.
- `MITCourseKnowledgeEngine.ts` — course knowledge extraction.
- `MITCourseDeepLearningEngine.ts` — deep-learning over course content.
- `MITCourseIntegrationEngine.ts` — "PP-AGI Academic Course Integration" (per `ENGINE_DIGEST.md`).
- `MITCourseFullIntegrationEngine.ts` — Phase 0.23 U-UTL9 (per `ENGINE_DIGEST.md`).
- `MITCourseExpansionEngine.ts` — "Additional MIT Courses for U-AWR33" (per `ENGINE_DIGEST.md`).

Source corpus root (verified): `H:/PRISM/resources/MIT COURSES/` — raw OCW exports, one dir per course-id (e.g. `10.34-fall-2015/`) with `pages/{lecture-notes,assignments,exams,readings,syllabus}/` + per-resource `data.json`. Wired into this galaxy as a domain-relevant critical-resource root (`PATHS.md`, `resources/MIT COURSES`).

NOTE: `mcp-server/src/data/mit-courses-registry.ts` (cited "verify" in the galaxy CLAUDE.md) does NOT exist on disk — only `mitsubishi-*` data files match `mit*` there (unrelated WEDM catalogs). Do not cite it.

## Standing patterns / invariants
- **No dedicated `prism_*` dispatcher for this domain.** A grep of `DISPATCHER_DIGEST.md` returns zero mit/ocw/curriculum/course action pairs — these engines are not exposed as a domain dispatcher. Do not invent one; route course-extraction work through the engines directly or the adjacent knowledge-conversion galaxy.
- **NEVER inline a physics constant** — any constant a converted course formula needs comes from `mcp-server/src/physics/constants.ts` (project `CLAUDE.md` §SAFETY). Course-derived math must reference, not duplicate, canonical values.
- **Extraction galaxy, not authoring** — this galaxy reads OCW source; the 6-node-type routing of that source (knowledge/algorithm/formula/engine/skill/pipeline) is the knowledge-conversion galaxy's domain (project `CLAUDE.md` §KNOWLEDGE-CONVERSION-MS0). Keep the producer/router split.

## Known assets
Wiki (verified real entries under `knowledge/wiki/`):
- `architecture/courses-index.md` + ~115 `architecture/courses/mit-*.md` per-course leaves (e.g. `mit-18-06-linear-algebra-gilbert-strang.md`, `mit-6-s191-introduction-to-deep-learning.md`, `mit-2-830-control-of-manufacturing-processes.md`).
- `architecture/college-courses-psn-incorporation.md`, `architecture/college-course-autogen-specs.md`.
- `architecture/knowledge-conversion-ms0.md`, `architecture/course-forge-conversions.md`, `architecture/course-forge-stubs-emitter.md` (the downstream routing of MIT-OCW source).

Memory (verified on disk under `C:/Users/wompu/.claude/projects/H--prism/memory/`):
- `reference_knowledge_conversion_ms0_2026_05_17.md`
- `reference_course_forge_conversions_2026_05_17.md`
- `reference_course_forge_stubs_emitter_2026_05_17.md`

## Cross-galaxy edges
- **academy** (`engines/academy/`) — CONSUMER: teaches courses/curriculum/lessons sourced from here (master `MEMORY.md` `[galaxy:academy]`; `knowledge-conversion-ms0.md` adjacency).
- **knowledge-conversion** (`engines/knowledge-conversion/`) — CONSUMER/router: routes MIT-OCW source into the 6-node-type pipeline (project `CLAUDE.md` §KNOWLEDGE-CONVERSION-MS0; galaxy `CLAUDE.md` §Related galaxies).
- **pdf-corpus** (`engines/pdf-corpus/`) — sibling SOURCE corpus (master `MEMORY.md` `[galaxy:pdf-corpus]`; galaxy `CLAUDE.md` cross-galaxy edge `↔ pdf-corpus`).

## Cross-refs
[`./CLAUDE.md`](CLAUDE.md) · [`./PATHS.md`](PATHS.md) · [`./TOOLBELT.md`](TOOLBELT.md) · parent: [`../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
MIT-OCW course source corpus. Domain IS open courseware.
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/mit-curriculum/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**Authoritative free external sources (VERIFIED, papa AI/software domain):**
- [MIT OpenCourseWare](https://ocw.mit.edu/)
- [MIT OCW - Mechanical Engineering](https://ocw.mit.edu/courses/mechanical-engineering/)
R12: nameable free authoritative references for an AI/software domain (papa's expertise) -- VERIFIED + integrated live, not owner-gated. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->

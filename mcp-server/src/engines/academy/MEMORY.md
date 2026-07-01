# Academy Galaxy MEMORY.md — per-domain memory cascade index (P1+P4 hybrid, 2026-05-27)

> **Per-domain memory cascade (Pillar P1 extended)** per SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md §Q2. Auto-loads when Claude edits under `mcp-server/src/engines/academy/`. Companion to `./CLAUDE.md` (galactic center) — that's domain doctrine, this is domain memory index.
>
> **Status: STUB / awaiting U-GALAXY-MS1-C1 migration** — the per-galaxy memory population pilot (bravo-targeted in MS1 envelope) classifies 641 existing flat memories at `knowledge/memories/{feedback,reference,project}/` and migrates academy-domain ones into `knowledge/memories/academy/{feedback,reference,project}/`. Until that ships, this index points at the candidate flat memories that would land here.

---

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="academy" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:academy]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/academy_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- The academy domain includes 18 distinct engines, each serving specific purposes such as Curriculum, CourseBuilder, and Instructor [reference/reference_lima_academy_engine_map].
- Knowledge vault schema defines five namespaces: memory, wiki, commands, handoffs, and specs, with CLAUDE.md acting as the doctrine pointer index [reference/reference_u_vault01_knowledge_vault_schema].
- Academy courses are indexed using node pointers to ensure detailed documentation and accessibility [e.g., reference/node_course_academy_course_21_business_management_expand_each_feature_to_cover_business_management].
- Custom PRISM-awareness surfaces for domain-specific needs, such as Lima's custom academy-domain awareness surface [reference/reference_lima_academy_awareness_surface_2026_05_29].
- Full UX overhauls to address specific issues and enhance user experience, like the AcademyHub overhaul by Lima [reference/reference_academy_hub_ux_overhaul_2026_05_27].
- Use of multiple namespaces for course-related actions to disambiguate intent, e.g., `prism_knowledge` vs. `prism_operating_system` [reference/reference_lima_course_namespaces].

## Indexed memories
- **Domain corpus (live counts):** 59 curated memory file(s) · 436 wiki entr(y/ies) · 56 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 484 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="academy" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/reference_course_forge_conversions_2026_05_17.md` · `knowledge/memories/_legacy-root/reference_course_forge_stubs_emitter_2026_05_17.md` · `knowledge/memories/reference/reference_a2_mit_ai_textbooks_registered_2026_06_08.md` · `knowledge/memories/reference/reference_academy_frontend_gap_2026_05_25.md` · `knowledge/memories/reference/reference_academy_hub_drilldown_2026_05_27.md`
- **Sample wiki:** `knowledge/wiki/software-engineering/commit-message-conventions.md` · `knowledge/wiki/reference/reference-cross-chat-commit-misattribution-2026-05-18.md` · `knowledge/wiki/lessons/commit-pressure-find-the-real-committer.md` · `knowledge/wiki/lessons/conflict-fork-rule-reliably-defeats-commit-ownership-guard-hollowing.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/commit-subject-discipline.md` · `knowledge/wiki/code-tribal/learnings/academy-corpus-ms0-u-a2-mit-ai-textbooks-metadata-contract.md` · `knowledge/wiki/code-tribal/learnings/academy-corpus-ms0-u-a2-mit-ai-textbooks-register.md`

## Cross-galaxy bridges
- _(no edges recorded yet — add `academy ↔ <other-galaxy>` lines as integrations land)_

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- The academy domain has diverged across integration trees, with slot/lima carrying the course-35..60 backend expansion while the integration tree lags behind [reference/reference_lima_branch_drift_academy].
- Tag-metadata remains unresolved in the AcademyHub UX overhaul, indicating an ongoing issue that needs addressing [reference/reference_academy_hub_ux_overhaul_2026_05_27].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Candidate academy-domain memories (flat → to-migrate)

Memory files at `knowledge/memories/` that likely belong in the academy namespace (heuristic: filename mentions academy, course, learning, training, lesson, quiz, certification, mit, role-academy):

- `reference/reference_ahmad_osman_llm_curriculum_2026_05_25.md` — Ahmad Osman 34-project LLM curriculum (dormant per SCOPE-EXPANSION §Q4 #2)
- `reference/reference_mit_courses_*` — MIT OCW course extraction work (juliett's domain, cross-galaxy with knowledge-conversion)
- `reference/reference_knowledge_conversion_ms0_2026_05_17.md` — MIT-OCW + monolith → PRISM via 3-lane router with 7 algorithms shipped
- `reference/reference_course_forge_conversions_2026_05_17.md` — course-forge stub emitter

## What goes WHERE under academy/

Once U-GALAXY-MS1-C1 ships, the proposed structure (mirrors existing flat layout):

```
knowledge/memories/academy/
├── feedback/    # academy rules: "course-DAG never cycles", "test/train split avoids same-operator contamination"
├── reference/   # shipped academy units, MIT-OCW extraction reports, AHMAD curriculum design
└── project/     # academy milestone envelope state (AHMAD-MS0, MIT-OCW-MS0)
```

## Cascade load order (when migration ships)

1. **universal/** memories (always)
2. **academy/** memories (this directory's children, loaded when CWD enters academy/)
3. **slot-soul** (when chat is bound to a slot)
4. **cross-galaxy/** memories (when current edit touches 2+ galaxies)

## Until migration: search semantically

Per [[reference_domain_galaxy_doctrine_2026_05_26]] — flat memories remain authoritative; use `memory_search "<academy-related query>"` MCP for retrieval. Migration is a CONVENIENCE not a CORRECTNESS layer.

## Cross-refs

- Galactic center: [`./CLAUDE.md`](CLAUDE.md)
- Migration unit: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` → `U-GALAXY-MS1-C1-PER-GALAXY-MEMORY-MIGRATE` (bravo, mill pilot first, academy/post-proc/quoting/business follow)
- Parent doctrine: [`state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- Scope-expansion §Q2: [`state/shared/specs/SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md`](../../../../state/shared/specs/SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for academy (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (36 sources: T1=22/T2=0/T3=14). Top primary:
- [NIMS homepage](https://www.nims-skills.org/)
- [NIMS Credentialing](https://www.nims-skills.org/credentialing)
- [NIMS Machining Level I Standards (PDF)](https://www.nims-skills.org/sites/default/files/media/document/NIMS%20Machining%20Level%20I%20Standards.pdf)
Deep cited domain research (partially promoted): institutional + established-pedagogy facts are VERIFIED + LIVE at `knowledge/wiki/academy/academy-pedagogy-foundations.md` (papa WebFetch-confirmed 29 CFR 29.5 / O*NET 51-4041.00 / NIMS two-component / Bloom / Dreyfus / Ericsson / 70-20-10 / MIT free courses 2026-06-09). Remaining [lima-gate] specifics (NIMS exam question counts, exact OJT-hour figures, "eleven Level-1 certs") stay UNVERIFIED in `knowledge/wiki/academy/_staging/deep-domain-research-2026-06-09.md` for lima. R12: source pointers verifiable; numeric specifics owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.

<!-- AI-CAPABILITIES:BEGIN (auto: scripts/inject-galaxy-ai-capabilities.mjs) -->
## AI capabilities

The `academy` galaxy is wired into PRISM's fleet AI substrate (PSN leg #10 NN/GNN + the Obsidian brain). It has no domain-prefixed AI engine of its own; it reasons via the live-validated generic reasoning bridge.

- **Deep-reasoning** -- reason over THIS galaxy's own context (CLAUDE + synthesis + posture) via the local-Ollama reasoning bridge:
  `node scripts/lib/galaxy-reasoning-bridge.mjs academy "<question>"`
- **NN / GNN** -- the GraphSAGE tier-5 wiring-inference cascade classifies this galaxy's ghost nodes; typed cross-substrate edges (owned-by-slot, documented-by) connect it to the system-viz graph.
- **LoRA** -- this galaxy is fed into the vault->LoRA training dataset (`academy_synthesis.md`).
- **RAG / CAG** -- the fleet's retrieval-augmented + cache-augmented recall (deep-learning retrieval, not keyword grep) covers this galaxy's wiki + tribal entries as they are authored.
- **Embeddings** -- the fleet's 384/768d neural embedding index covers this galaxy's notes as they are embedded, feeding semantic recall + the GNN node-feature bridge.

_Auto-maintained by `scripts/inject-galaxy-ai-capabilities.mjs` (AI-SYNERGY-AUDIT-MS0). Live posture: `state/shared/specs/AI-SYNERGY-AUDIT.md`; per-galaxy detail: this dir's `AWARENESS.md`._
<!-- AI-CAPABILITIES:END -->

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->

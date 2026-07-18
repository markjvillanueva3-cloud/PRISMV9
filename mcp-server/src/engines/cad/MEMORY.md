# CAD Galaxy MEMORY.md — per-domain memory cascade index (2026-05-27)

> Per SCOPE-EXPANSION §Q2. Auto-loads when editing under `engines/cad/`. STUB / awaiting U-GALAXY-MS1-C1 migration + cad-soul slot assignment.

## 🔑 Single-read context-regain (START HERE)
> **`state/shared/DELTA-CONTEXT-LEDGER.md`** — the curated, ROI-ordered, git-reconciled open-threads ledger for delta/CAD. Read it FIRST on `/startup-delta` to regain full domain context in ONE read (supersedes stitching handoff + 39 KB goal-roadmap + 14 KB task-queue + synthesis + git-log). Reconcile §2 (done) + §3 (open) on each `/handoff-delta`. Last reconcile 2026-06-10.

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="cad" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:cad]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/cad_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Operator Directives**: Operators are directed to add relevant information to the memory system based on session activities and goals. [reference/reference_cad_live_regen_ms0_2026_05_26]
- **CAD Topology Iterations**: Iterative improvements in CAD pipeline wire MS0, focusing on tooling layers and bulk predictors for better performance. [reference/reference_cad_topology_iter14_17_2026_05_25]
- **Domain Rules Implementation**: Implementing specific rules for mill/lathe/wedm/cam/cad pipelines to ensure structural integrity and operational consistency. [reference/reference_u_domain_rules_2026_05_16]
- **Asset Generation**: Regular generation of high-ROI assets involves mining previous sessions and creating memories, CLAUDE.md rules, GSD, wikis, and tribal knowledge. [reference/reference_delta_cad_asset_generation_2026_05_29]
- **PDF Extraction Pipelines**: Expanding the scope to include multi-source PDF manifest extraction with full text and HTML extraction pipelines is a recurring task. [reference/reference_cad_cam_pdf_extraction_2026_05_26]
- **CAD Live Regeneration**: Continuous training of CAD drawing systems and template generation through live-regen processes, ensuring high corpus coverage and operation success rates. [reference/reference_cad_live_regen_ms0_2026_05_26]

## Indexed memories
- **Domain corpus (live counts):** 104 curated memory file(s) · 1452 wiki entr(y/ies) · 277 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 598 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="cad" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/project_cad_bridge.md` · `knowledge/memories/_legacy-root/project_continue_cad_trigger.md` · `knowledge/memories/_legacy-root/project_continue_cad_work.md` · `knowledge/memories/_legacy-root/reference_feature_gap_audit_cad_dedup_wins_2026_05_18.md` · `knowledge/memories/_legacy-root/reference_u_ppl_d4_ext_cad_archive_join_augmenter.md`
- **Sample wiki:** `knowledge/wiki/training/cad-corpus-index.md` · `knowledge/wiki/os/commands/agi-cad-generate.md` · `knowledge/wiki/os/commands/cad-corpus.md` · `knowledge/wiki/os/commands/cad-dfm-generate.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/math-cad-geometry-nurbs-gdt.md` · `knowledge/wiki/code-tribal/templates/cad-catia__animation.md` · `knowledge/wiki/code-tribal/templates/cad-catia__assembly.md`

## Cross-galaxy bridges
- cad ↔ cam (strategy input)
- cad ↔ quoting (auto-quote from print)
- cad ↔ academy (CAD examples → training corpus)
- cad ↔ NN/GNN (CAD-RAG + CAD-train)

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **GPU Embedder Migration**: The migration of the GPU embedder from 768-d CPU ONNX to nv-embedqa-e5-v5 with a dimension increase to 1024 is deferred and out of current scope. [reference/reference_u_rag_6_gpu_embedder_deferred_2026_05_22]
- **CAD Archive Join Augmenter**: The CADArchiveJoinAugmenterEngine, while shipped, needs further integration or testing to ensure it complements the existing U-PPL-D4 ProgramEquivalentIndexEngine effectively. [reference/reference_u_ppl_d4_ext_cad_archive_join_augmenter]

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Text→CAD generation + seat-UI knowledge (zulu population pass, 2026-06-12)
> Shipped under the operator directive "populate delta's galaxy with maximum information / Ollama CAD generation." Read these BEFORE re-deriving seat navigation or text→CAD architecture.
- **Ollama text→CAD lane (LIVE):** `scripts/cad-text-to-cadquery.mjs` — engine canonical prompt + hard-coded JM doctrine → qwen2.5-coder:32b → gated CadQuery staging (`state/shared/cad-text-gen/`). Wiki [[cad-text-to-cad-landscape]] (open-source landscape: Seek-CAD / Text-to-CadQuery 170K / STEP-LLM + 3-generation live validation set). Buildout queue: `state/shared/specs/DELTA-CAD-GALAXY-MAX-BUILDOUT-2026-06-12.md`.
- **Seat-UI navigation (hard-coded):** [[ui-fusion360-navigation]] (incl. the **2.54 cm API-unit trap** vs 25.4 mm) · [[ui-hypermill-hypercad-navigation]] (v31 NOT v33; macro/feature automation = the native hook) · [[ui-mastercam-navigation]] (X8 classic menus; NET-Hook = modern lane). All three: `knowledge/wiki/cad/ui-*.md`.
- **Navigate-by-reference beats UI:** kilo's `PRISM_Fusion_Drive` add-in `:18365` endpoints ([[fusion-backend-nav-map]], `state/shared/fusion-backend/BACKEND-NAV-MAP.md`) — query JSON, never screenshots.
- **Resources→data (already mined, india):** STEP-corpus dimensional signals — radii `a872dbcfa8`, part-envelope bbox `e485a0ac18`, surface-topology composition `22be177ec3`; coverage matrix `mcp-server/data/state/CAD_COVERAGE_MATRIX.json`.
- **Nightly UI-knowledge feeds:** night-queue ids `fusion-ui-navigation` / `fusion-api-scripting` / `mastercam-ui-navigation` / `hypermill-ui-navigation` (staged → attended promote).

## Candidate cad-domain memories (flat → to-migrate)

Filename heuristic: cad, dfm, tolerance, feature-recognition, blueprint, assembly, step, iges, parasolid, fusion-live, cad-rag.

## Proposed structure

```
knowledge/memories/cad/
├── feedback/    # cad rules
├── reference/   # cad bug-fixes, RAG outcomes, format-conversion gotchas
└── project/     # cad-fusion-live + CAD-AI milestone state
```

## Cross-galaxy edges
- cad ↔ cam (strategy input)
- cad ↔ quoting (auto-quote from print)
- cad ↔ academy (CAD examples → training corpus)
- cad ↔ NN/GNN (CAD-RAG + CAD-train)

## Available algorithm primitives (wired by tango, ALGO-SYNERGY 2026-05-29)
Invokable via `prism_algorithm` for CAD geometry (PSN leg #8 → this brain):
- `spatial_ransac_fit` (RANSACHyperplane) — robust line(2D)/plane(3D)/hyperplane(N-D) fit that REJECTS outliers + TLS-refits on inliers. Use for planar-face extraction from noisy point clouds, robust edge/axis fitting, primitive recognition where stray points wreck plain least-squares. Reports inliers/outliers/RMS, deterministic given seed. Detail: `reference_tango_algo_synergy_batch_2026_05_29` · wiki [[architecture/algo-synergy-ml-batch]].

## Cross-refs
[`./CLAUDE.md`](CLAUDE.md) · migration: `U-GALAXY-MS1-C1` · soul-assign: `U-GALAXY-MS1-D3` (extend) · parent doctrine: [`../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for cad (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (29 sources: T1=8/T2=1/T3=20). Top primary:
- [ISO — "ISO 1101:2017 — Geometrical product specifications (GPS) — Geometrical tolerancing](https://www.iso.org/standard/66777.html)
- [ISO — "ISO 10303-242:2025 — Application protocol: Managed model-based 3D engineering](https://www.iso.org/standard/84300.html)
- [NIST — "Portrait of an ISO STEP tolerancing standard" (tsapps pub 915430)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=915430)
Deep cited domain research (UNVERIFIED -- delta verifies vs source before any live engine/doctrine use): `knowledge/wiki/cad/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
VERIFIED institutional/method subset promoted: `knowledge/wiki/cad/cad-foundations.md` (status VERIFIED-PARTIAL, papa-workflow 2026-06-09) -- MBD standards (ASME Y14.41/ISO 16792), representation-vs-presentation PMI + NIST conformance, AP242 tolerance/PMI capability, the 4-family feature-recognition taxonomy are WebFetch-confirmed. Owner-gate split: every numeric GD&T/tolerance/MMC/stack-up constant + the ISO.org/ProSTEP-blocked AP242-merger + named AFR attributions stay UNVERIFIED in _staging for delta.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->

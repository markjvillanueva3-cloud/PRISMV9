---
type: system-map
source: hand-authored (zulu, 2026-06-10)
purpose: top-level orientation layer — every PRISM knowledge/AI system, where it lives, how to query it
audience: Claude fleet slots, Hermes agent, operator
---

# PRISM SYSTEM MAP — the 2nd-brain index

One note that answers "where does PRISM keep X and how do I ask it?" for every major system.
All paths verified on disk 2026-06-10. Vault-internal targets use [[wikilinks]]; everything else is a literal path.

## The spine: galaxy brains (34 domains)

- **Master digest** (read THIS first, not 34 brains): `H:/prism/state/shared/galaxy-cards/MASTER-DIGEST.md`
- All 34 cards: `H:/prism/state/shared/galaxy-cards/ALL-CARDS.md`
- Per-galaxy brain INDEX: `H:/prism/mcp-server/src/engines/<galaxy>/MEMORY.md` (mirrored into vault at [[memories/galaxies/]])
- Who-knows-what lookup: `node H:/prism/scripts/galaxy-knows-map.mjs who <topic>` → which galaxy holds context on X
- Transcript-mined galaxy memos: [[memories/reference/]] `*_transcript_synthesis.md` (filled nightly by `scripts/overnight-vault-compound.mjs` / `scripts/mine-galaxy-transcripts.mjs`)

## Memories (persistent, cross-session)

- **Source of truth** (C:, synced → vault): `C:/Users/wompu/.claude/projects/H--prism/memory/` — index `MEMORY.md`, one fact per file, types user/feedback/project/reference
- Vault mirror (Obsidian-graphed): [[memories/user/]] · [[memories/feedback/]] · [[memories/project/]] · [[memories/reference/]] · per-galaxy copies in [[memories/galaxies/]]
- Sync job: `scripts/obsidian-memory-sync.mjs` (Stop-hook driven, lock-serialized, full-rewrite)
- Programmatic recall: `prism_memory:brain_recall`, `prism_memory:semantic_search`, `prism_memory:remember`, `prism_memory:qdrant_vector_search`
- Embeddings sidecar: `scripts/build-memory-embeddings-sidecar.mjs` (nomic-embed-text via Ollama)

## Wiki (39K+ files) & tribal knowledge

- Wiki root + index: [[wiki/index]] (`H:/prism/knowledge/wiki/index.md`) — query BEFORE re-deriving from digests
- Code-tribal learnings (4,300+): `H:/prism/knowledge/wiki/code-tribal/` — BM25-retrieved, per-ship distillations
- Tribal tips (vault slice): [[tribal/]] · full corpus `H:/prism/mcp-server/data/state/TRIBAL_TIPS_FULL.json`
- Query: `prism_knowledge:search`, `prism_knowledge:tribal_search`, `prism_shop_practice:tribal_search`
- Skills: `/wiki-query`, `/wiki-ingest`, `/wiki-morning`

## system-viz (the system graph)

- Graph data: `H:/prism/state/shared/system-viz/` (system-graph.json + staging)
- Query adapter: `node H:/prism/scripts/system-viz-query.mjs <query>` — graph-grounded answers before Grep/Glob
- Hooks inject top graph hits pre-Read/Grep/Bash automatically
- Dispatcher: `prism_session:master_index_query`, `prism_session:hybrid_search`, `prism_session:node_card`

## PSN (PRISM Synergy Network — 11 interlocking substrates)

- Canonical definition: PRISM is a synergized network of 11 knowledge/compute/orchestration legs, each with its own home, write-path, consumers, and health signal — a PSN-aware tool consults the right leg instead of re-deriving from raw files (see memory [[memories/feedback/feedback_psn_definition]])
- Inspect synergy: `prism_intelligence:psn_synergy_inspect` / `psn_synergy_summarize` / `psn_synergy_legs` · coverage `prism_quality:psn_coverage_audit`
- Token-savings telemetry surface: `H:/prism/state/shared/dashboards/psn-savings-aggregate.json` (rtk, dedup, rewriter, multi-tool, read-auto substrates; SessionStart banner injects the headline)

## AI systems (routing + reasoning)

- Three-tier hierarchy: Claude (Tier-1) → FullSystemAICoordinator (Tier-2) → 7 domain specialist AIs (Tier-3) — see `H:/prism/state/shared/CLAUDE-BRIEF.md`
- Router: `aiSystemRouterEngine.route(task)` · `prism_intelligence:ai_route_task` / `ai_classify_task` / `ai_backend_health`
- Deep reasoning: `prism_ai` dispatcher (creative_solve, causal_analyze, cot_reason, neural_route, consensus_decide)
- Local offload: Ollama qwen2.5-coder:32b (code), gpt-oss:120b (deep local reasoning), gpt-oss:20b (mid triage) — `/ollama-*` skills, `OllamaHookBridgeEngine`

## LoRA systems (per-domain adapter training)

- Per-domain LoRA stacks: lathe (`prism_turning:lathe_lora_*` — cadence, registry, deploy, monitor, ensemble), mill (`prism_mill:mill_lora_*`), WEDM (`prism_edm:wedm_lora_*`), CAM (`prism_cam:cam_lora_*`, cam_ml_train_lora)
- Vault→LoRA training-pair extractor: built this cycle (Task #20) — feeds vault memos into training sets
- Blueprint LoRA: `prism_ai:blueprint_lora_prepare_set` / `blueprint_lora_export`

## CAG (cache-augmented generation)

- Cold-tier doctrine router: `H:/prism/scripts/lib/cag-router.mjs` (`COLD_SOURCES` = CLAUDE.md, ENGINE_DIGEST, physics constants, wiki index, galaxy cards…)
- SessionStart anchors cold sources for Anthropic prompt-cache; sidecar `state/shared/cag-route/cold-cache-anchor-<sid>.json`

## RAG (retrieval-augmented generation)

- Vector: Qdrant via `prism_memory:qdrant_vector_search` / `vector_search_unified` · embeddings nomic-embed-text
- Lexical: tribal BM25, wiki index, `prism_session:hybrid_search` (fused)
- 7 recall injectors fuse memory+wiki+tribal pre-turn (hook-driven)
- RAG eval: `prism_dev:rag_eval_score` / `rag_eval_run`

## Loops & harness systems

- `/loop` skill (dynamic pacing via ScheduleWakeup) · Stop-hook chains (scrutinize-before-stop, error-pattern-promote) · 5-min fleet reaper · nightly dream-cycle-synth (Jaccard) · weekly self-reflect
- Workflow tool: journaled resume, worktree isolation, 6 canonical multi-agent patterns
- ZULU master orchestrator (slot-less conductor over 25 worker slots): helpers in `H:/prism/.claude/helpers/` (chat-slots.mjs, mcp-tool-domains.mjs); slot-brief channel `state/shared/slot-briefs/<slot>.md` (TEACHER → next-prompt injection)
- Hermes agent: config + skills + cron at `C:/Users/wompu/AppData/Local/hermes/` — see [[hermes-outputs/]] for its vault write-lane; verification spec `H:/prism/state/shared/specs/ZULU-HERMES-ARTICLE-VERIFY-2026-06-09.md`

## Development pipelines

- Roadmap: 700+ milestones — `prism_orchestrate:roadmap_*` (plan, next_batch, claim, advance) · envelope drift in BUILD_STATE
- Build state: `H:/prism/state/shared/BUILD_STATE.md` (+ .json) — engines wired/unwired, pending units, frontend merges
- Build/test: `prism_dev:build`, `build_guard_*`, `/forge-triple`, scrutiny gates (2-arm), `prism_atcs` (autonomous task completion)
- Commit format `[SCOPE]/U-ID: title`; slot worktrees `H:/prism-slot-<name>`

## Slash commands / skills (~440)

- User-level: `C:/Users/wompu/.claude/commands/*.md` · project: `H:/prism/.claude/commands/*.md`
- Query: `prism_skill_script:skill_search` / `skill_find_for_task` / `skill_recommend`
- Hermes skills: `C:/Users/wompu/AppData/Local/hermes/skills/prism/` (prism-vault-loop = READ→ACT→WRITE-BACK contract)

## Resources & digests (zero-IO discovery)

- `H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md` (every engine, 1 line) · `DISPATCHER_DIGEST.md` (dispatchers + action counts) · `DIRECTORY_DIGEST.md` · `CODE_SYSTEM_INDEX.json` (shortcode→path)
- Live counts: `H:/prism/PRISM-INVENTORY-LATEST.md`
- H-drive atlas (what's on the drive): [[h-drive-atlas/]]
- GSD protocol: [[gsd/]] + `prism_gsd:core`

## JM Die (test shop database)

- Root: `H:/prism/JM DIE/` — customer programs, prints, financials (DocuStrata)
- Profile API: `jm-die-profile.ts` · `prismSelfAwarenessEngine.getJMDieCustomerPath()`
- Query: `prism_quoting:jm_die_*` (docs_by_customer, historical_material_price, training pipelines) · `prism_resource_harvester:jm_program_*` · `prism_inbox:inbox_seed_jm_*`

## PRISM awareness (self-knowledge)

- Snapshot: `H:/prism/state/shared/AWARENESS-SNAPSHOT.md` (engines built/wired/orphans, galaxy federation) — regen `/awareness-snapshot`
- Brief: `H:/prism/state/shared/CLAUDE-BRIEF.md` (what PRISM is, regenerated each SessionStart)
- Programmatic: `prism_session:self_awareness_build` / `awareness_unified_query` · `prism_dev:self_awareness_manifest`

## PRISM app features (the product)

- Saleable: Speed/Feed Calculator (`prism_calc:sf_orchestrate`, `prism_product:sfc_*`) + Master Post (`prism_cam:master_post_*`, `prism_product:ppg_*`)
- Six tier-1 CAM bridges: Fusion 360, hyperMILL, Mastercam, Esprit, Inventor HSM, SolidWorks (`prism_cam:cam_<system>_*`)
- Print-to-program: mill/lathe/WEDM/multiaxis pipelines (`prism_mill:mill_print_to_program`, `prism_turning_program`, `prism_edm:wedm_print_to_program`)
- Closed-loop learning: `prism_outcome` dispatcher (capture bus → replay → RL/drift/episodic bridges)

---
*Maintained by hand (not sync-generated). The auto-generated root note [[PRISM Knowledge Vault]] links here. Update when a system's authoritative path moves.*

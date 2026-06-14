# tribal-knowledge Galaxy MEMORY.md

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="tribal knowledge" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:tribal-knowledge]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/tribal-knowledge_synthesis.md` (qwen2.5-coder:7b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Automated Promotion of Tribal Tips**: The script `promote-tribal-to-wiki.mjs` auto-promotes confidence>=90 tribal tips into knowledge/wiki/code-tribal/, ensuring that high-quality tribal knowledge is integrated into the broader system.
- **Regular Domain Memory Compilation**: During DISCOVER phases, it's crucial to write durable domain memories as you go, not just at close-out. This ensures that all relevant tribal knowledge is captured and available for future use.
- **Tribal Knowledge Injection**: The `UserPromptSubmit` hook surfaces top-3 tribal entries on every prompt, keyed on the active chat-slot's milestone domain via `tribal-rerank.mjs --domain`. This ensures that relevant tribal knowledge is readily accessible to users.
- **Domain Mapping Gap**: The `tribal-by-domain-inject DOMAIN_MAP` has a gap for speed-feed/database/business domains, causing oscar/juliett/hotel tribal injection never to fire despite having tips already in `tribal-embed-in`. This highlights the need for comprehensive domain mapping.

## Indexed memories
- **Domain corpus (live counts):** 52 curated memory file(s) · 233 wiki entr(y/ies) · 720 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 1129 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="tribal-knowledge" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/reference_post_ship_system-viz-brain-ms0-u-p1-tribal-by-domain-inject.md` · `knowledge/memories/_legacy-root/reference_tribal_by_domain_inject.md` · `knowledge/memories/_legacy-root/reference_tribal_enrichment_engine_bug.md` · `knowledge/memories/_legacy-root/reference_tribal_graph_ms0_content_mine.md` · `knowledge/memories/_legacy-root/tribal_auto_categorization.md`
- **Sample wiki:** `knowledge/wiki/reference/tribal-knowledge-access---jm-die-test-shop---3-700--machinist-tips.md` · `knowledge/wiki/os/commands/distill-tribal.md` · `knowledge/wiki/lessons/psn-synergy-obsidian-tribal-blindspot.md` · `knowledge/wiki/lessons/tribal---obsidian---system-viz-utilization-protocol.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/cimco-verification-tribal.md` · `knowledge/wiki/code-tribal/tribal-bc-001.md` · `knowledge/wiki/code-tribal/tribal-bc-002.md`

## Cross-galaxy bridges
- **knowledge-conversion** — `engines/knowledge-conversion/` consumes Lane-A tribal tips (symmetric edge in CLAUDE.md §Related galaxies)
- **cam / mill / lathe / wedm** — per-domain producers + consumers (CAM/Mill/Lathe/WEDM Tribal engines above)
- **post-processor** — `PostProcessorTribalKnowledgeIntegrationEngine.ts` (cited-tip pipeline output, PP-TRIBAL-INT)
- **ai-training** — LoRA augmentation feed via `lathe_lora_tribal_*` actions + `TribalKnowledgeTrainingEngine.ts`
- **database-expansion** — juliett-owned KnowledgeDB intake (PATHS.md registered-db-intake block)

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Tribal Training Bridge Unwiring**: The tribal↔training plumbing for print→mill-program mostly exists but is unwired. There's a need to ensure that content/injection is properly wired to leverage the existing infrastructure.
- **Mill Training Assessment**: The mill training assessment revealed narrow gaps in tribal knowledge transfer. Further investigation and potential adjustments are needed to address these issues.

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Primary domain
Operator tribal knowledge: the cited-tip store every PRISM galaxy emits to and consumes from. Distill shop-floor wisdom into structured tips, embed them into a domain-tagged rerank corpus, and inject the top hits back into every chat (parent prompt + per-edit + per-subagent). There is no domain-specific physics here — this galaxy is the cross-cutting knowledge substrate. Per `engines/tribal-knowledge/CLAUDE.md` §Scope, golf hosts pipeline hygiene; per-domain tips live in each domain galaxy's own MEMORY.md index.

## Key engines & paths
Engines (verified in `data/docs/ENGINE_DIGEST.md`, source under `mcp-server/src/engines/`):
- `TribalKnowledgeEngine.ts` — Manufacturing Intelligence Layer (the core tip store; auto-categorization is built in per `knowledge/wiki/index.md` [[tribal_auto_categorization]])
- `TribalKnowledgeAdvisorEngine.ts` — Manufacturing Parameter Advisor
- `TribalRAGEngine.ts` (U-LEARN-04) · `TribalEvolutionEngine.ts` · `TribalExplanationEngine.ts`
- `TribalPlaybookEnforcementEngine.ts` — validates machining parameters against playbook rules
- `TribalEnrichmentCoordinatorEngine.ts` — single P2P entry to fetch tribal knowledge
- `TribalKnowledgeOutcomeBridgeEngine.ts` (XPROC-NEURAL-CONNECT-MS0/U-CN04) · `TribalTipExportEngine.ts` (U-OBS-TRIBAL03) · `TribalKnowledgeActivationEngine.ts` (Dormant Tip Activation)
- Domain consumers: `CAMTribalKnowledgeEngine.ts`, `CAMTribalRAGEngine.ts`, `MillTribalKnowledgeEngine.ts`, `LatheTribalInjectorEngine.ts`, `WEDMTribalRuntimeEngine.ts`, `WEDMTribalTipLearnerEngine.ts`, `PostProcessorTribalKnowledgeIntegrationEngine.ts`

Dispatcher (`data/docs/DISPATCHER_DIGEST.md` → `shopPracticeDispatcher` = `prism_shop_practice`, 53 actions; action names from `mcp-server/src/tools/dispatchers/shopPracticeDispatcher.ts`):
- `prism_shop_practice:tribal_search` / `tribal_add` / `tribal_get` / `tribal_list` / `tribal_categories`
- `prism_shop_practice:tribal_enrich` (+ `_check`, `_tips_only`, `_playbook_only`, `_controller_only`)
- `prism_shop_practice:tribal_apply` / `tribal_apply_stats`
- `prism_shop_practice:tips_add` / `tips_get` / `tips_conflicts`
- `prism_shop_practice:playbook_advise` / `playbook_sequence` / `playbook_setup` / `playbook_antipatterns` / `playbook_rules_query` / `playbook_rules_safety`
- `prism_shop_practice:lathe_lora_tribal_augment` / `lathe_lora_tribal_extract` (LoRA training feed)

Injection + rerank pipeline (verified scripts/hooks):
- `.claude/scripts/tribal-rerank.mjs` — L2: embeds query via Ollama nomic-embed-text over `state/shared/tribal-embed-index.json`, `--domain <mill|lathe|wedm|cad|cam|backend-dev|general>` doubles in-domain cosine before sort; appends `state/shared/tribal-citation-log.jsonl`
- `.claude/hooks/tribal-by-domain-inject.mjs` — UserPromptSubmit T2 advisory; infers slot domain, surfaces top-3 in-domain tribal hits per prompt
- `state/shared/tribal-embed-index.json` — the ~200 MB rerank corpus (an entry not in it can never auto-inject)
- Embedders: `scripts/embed-cited-tips-into-tribal-index.mjs`, `embed-knowledge-store-into-tribal-index.mjs`, `embed-wiki-into-tribal-index.mjs`; pruner `scripts/prune-stale-tribal-entries.mjs`

## Standing patterns / invariants
- **Tribal-index writes need an atomic lock.** Five unguarded RMW embedders share `tribal-embed-index.json`; correct primitive is the O_EXCL `scripts/lib/exclusive-file-lock.mjs` via adapter `scripts/lib/tribal-index-lock.mjs`. Do NOT use `system-graph-write-lock.mjs` for contention (TOCTOU). Source: `reference_alpha_tribal_index_race_2026_05_30.md`.
- **Domain-keyed injection is load-bearing in declaration order.** `tribal-by-domain-inject` infers the domain first-match-wins (mill→lathe→wedm→cad→cam→general); `tribal-rerank --domain` only boosts, never filters. Source: `reference_tribal_by_domain_inject.md`.
- **Every galaxy emits + consumes.** Per `engines/tribal-knowledge/CLAUDE.md` §Cross-galaxy edges, mill/lathe/wedm/all-galaxies write and read tips; this galaxy is the shared substrate, not a leaf.
- **Never inline a physics constant.** Tip parameters that touch machining physics reference `mcp-server/src/physics/constants.ts` — do not bake kc1.1 / Taylor values into a tip record.

## Known assets
- Wiki: `knowledge/wiki/index.md` entries [[TribalRAG]], [[TribalKnowledgeMaximizer]], [[TribalPlaybookEnforcement]], [[TribalEnrichmentCoordinator]], [[CAMTribalRAG]], [[CAMTribalTipLinker]], [[WEDMTribalTipLearner]], [[WEDMDeviationToTip]], [[LatheLoRATribalExtractor]]; decision [[tribal_auto_categorization]]
- Memory: `reference_tribal_by_domain_inject.md`, `reference_alpha_tribal_index_race_2026_05_30.md`, `reference_u_wiki_tribal_audit_2026_05_21.md`, `reference_whiskey_lathe_lora_tier_complete_2026_05_30.md`
- Data: `state/shared/tribal-embed-index.json`, `state/shared/tribal-citation-log.jsonl`; corpus root `H:/PRISM/JM DIE/TRIBAL + WIKI` (PATHS.md critical-resource-roots); KnowledgeDB `data/knowledge/` (58 entries) via `prism_data:database_search`
- Skill: `/distill-tribal` (shop-knowledge → structured tip)
- Galaxy docs: `engines/tribal-knowledge/{CLAUDE.md,PATHS.md,TOOLBELT.md}`

## Cross-galaxy edges
- **knowledge-conversion** — `engines/knowledge-conversion/` consumes Lane-A tribal tips (symmetric edge in CLAUDE.md §Related galaxies)
- **cam / mill / lathe / wedm** — per-domain producers + consumers (CAM/Mill/Lathe/WEDM Tribal engines above)
- **post-processor** — `PostProcessorTribalKnowledgeIntegrationEngine.ts` (cited-tip pipeline output, PP-TRIBAL-INT)
- **ai-training** — LoRA augmentation feed via `lathe_lora_tribal_*` actions + `TribalKnowledgeTrainingEngine.ts`
- **database-expansion** — juliett-owned KnowledgeDB intake (PATHS.md registered-db-intake block)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Tribal-tip store + Karpathy LLM-wiki pattern. Primary corpus is the PRISM wiki + tribal index (internal).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/tribal-knowledge/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**External free-source corpus:** none applies -- this domain is PRISM-internal (codebase + wiki + operator article-set). The internal anchors above ARE the corpus. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->

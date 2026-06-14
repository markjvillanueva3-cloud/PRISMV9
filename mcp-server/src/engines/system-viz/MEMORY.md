# SIERRA Galaxy Memory — System-Viz Upgrades, Integration & Utilization

Cross-session working brain for the **sierra** slot (position 17 of 26 NATO). Append-only; older entries collapse to `state/shared/MEMORY-RECENT.md` per the central `MEMORY.md` size discipline.

## Master-brain link
> Galaxy brain for domain **system-viz**. Cloned + fine-tuned from `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical) — brain wiring NOT re-derived.
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="system-viz graph regen-viz ghost-roost master-index utilization drift" topK=20` (fallback when MCP :3100 down → `node scripts/system-viz-query.mjs find <noun>`).
- **DOWN (push to master):** write `<type>_sierra_<topic>.md` → `C:/Users/wompu/.claude/projects/H--prism/memory/` → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs` every Stop.
- **MASTER-INDEX edge:** master `MEMORY.md` `### Galaxy brain back-pointers` carries the `[galaxy:system-viz] …` row (added 2026-05-29).
- **Last master-sync:** 2026-05-29   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work.


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/system-viz_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **U-REGEN-VIZ-MERGE-FAILLOUD Implementation**: The system aborts post-merge stages if merge-augmentations.mjs fails to prevent stale-graph corruption. [reference/reference_u_regen_viz_merge_faillod_2026_05_17]
- **Master Index Query Contract Fixes**: Iterative fixes are applied to the master_index_query contract to address issues like silent violations and mis-diagnosis. [reference/reference_master_index_filter_contract_fix_2026_05_18]
- **System-Viz Roost Completion**: The /system-viz roost completes producer/consumer/viz triplets, ensuring comprehensive data handling and visualization capabilities. [reference/reference_u_ai_memo_viz_roost_2026_05_21], [reference/reference_u_link_audit_viz_roost_2026_05_21]
- **Cross-Substrate Synergy**: Typed ADD-only cross-substrate edges are created to connect system-viz graph nodes with the Hermes slot fleet, enhancing inter-system communication. [reference/reference_cross_substrate_synergy_ms0_2026_06_03]
- **Master Index Priority**: Searches consistently prioritize the master-index, master-graph, and /system-viz before other tools like Grep/Glob/Agent. [feedback/feedback_master_index_system_viz_first]
- **Telemetry Integration**: Telemetry counters are integrated into system components to track usage and performance metrics. [reference/reference_master_index_hit_counter_2026_05_18]
- **Hybrid Retrieval Features**: Generator scripts emit hybrid retrieval features that enhance the system's ability to retrieve information from multiple sources. [reference/reference_psn_hybrid_viz_roost_2026_05_25]

## Indexed memories
- **Domain corpus (live counts):** 44 curated memory file(s) · 697 wiki entr(y/ies) · 100 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 575 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="system-viz" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/reference_nn_graph_ms0_2026_05_16.md` · `knowledge/memories/_legacy-root/reference_nn_graph_ms2_nn1_768d_features_2026_05_17.md` · `knowledge/memories/_legacy-root/reference_nn_graph_ms2_u1_2026_05_17.md` · `knowledge/memories/_legacy-root/reference_nn_graph_ms2_u2_2026_05_17.md` · `knowledge/memories/_legacy-root/reference_post_ship_system-viz-brain-ms0-u-p0-audit-viz-first.md`
- **Sample wiki:** `knowledge/wiki/reference/prism-system-viz.md` · `knowledge/wiki/reference/reference-graph-octopus-autowire-ms0-2026-05-22.md` · `knowledge/wiki/os/commands/system-viz-drift.md` · `knowledge/wiki/os/commands/system-viz.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/obsidian-graph-view-discovery.md` · `knowledge/wiki/code-tribal/system-viz-graph-navigation.md` · `knowledge/wiki/code-tribal/learnings/cross-substrate-synergy-ms0-u-xsub-galaxy-roost.md`

## Cross-galaxy bridges
- **india (`engines/ai-training/`)** — india's GNN tier-5 CONSUMES sierra's `seed-ghost` ref-pool + `_node-embeddings.jsonl`; sierra PRODUCES graph + feature vectors via `xproc_kg_project_features`.
- **golf (`engines/fleet-hygiene/`)** — golf QUERIES the system-graph for orphan/utilization classification (golf's MEMORY.md declares this — symmetric ✓).
- **alpha (`engines/token-optimization/`)** — alpha audits the call-graph for token-waste hotspots.
- **delta (`engines/cad/`) + echo (`engines/post-processor/`)** — their ghost nodes flow through merge-augmentations.
- **All 26 slots** — master-index / awareness / pre-*-graph hits resolve against this graph.

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Octopus Loader Leg Starvation Bug**: The octopus-corpus-loader degrades performance due to loading issues, affecting PSN legs and latency. [reference/reference_octopus_loader_leg_starvation_bug_2026_05_31]
- **Domain-Aware Corpus Issue**: A bug in the domain-aware octopus corpus causes it to silently filter markdown-only data, impacting overall functionality. [reference/reference_octopus_domain_aware_corpus_2026_05_31]
- **Memory Truncation Ceiling**: The master MEMORY.md file truncates fleet-wide recall past 24576 bytes, which may lead to data loss or incomplete information retrieval. [reference/reference_alpha_memory_truncation_ceiling]

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## High-ROI memories (PULL target — top master hits as pointers)
- [[reference_u_regen_viz_merge_faillod_2026_05_17]] — silent stale-graph clobber when merge SIGKILLs; the fail-loud merge-guard
- [[reference_psn_enhance_ms0_closeout_2026_05_23]] — prior sierra PSN-enhance ship (7 iters)
- [[reference_psn_master_index_aliases_synthesis_2026_05_23]] — prior sierra master-index alias synthesis (iters 8-9)
- [[reference_hook_orphan_reconcile_2026_05_17]] — SYSTEM-VIZ-BRAIN-MS0 close-out wave (echo)
- [[reference_nn_graph_ms0_2026_05_16]] · [[reference_nn_graph_ms1]] · [[reference_nn_graph_ms2_u1_2026_05_17]] — GNN tier-5 wiring-inference (india owns model; sierra owns graph + ref-pool)
- [[reference_silent_close_out_drift_2026_05_17]] — ghost-roost render of hidden-shipped units
- [[feedback_system_viz_first_audit]] — for any assessment/discovery use system-viz-query BEFORE Grep/Glob
- [[feedback_psn_definition]] — the 11-leg PSN taxonomy sierra's graph is leg #6
- [[reference_skill_trigger_ledger_revive_2026_05_20]] — stale-fingerprint short-circuit lesson

## Indexed memories — domain pointers (sierra's own per-file memories, written 2026-05-29)
- [[reference_sierra_galaxy_buildout_2026_05_29]] — this buildout record + deferred items
- [[reference_sierra_one_writer_per_path]] — system-graph.json single-canonical-writer doctrine
- [[reference_sierra_fast_splice_dual_registration]] — FAST[] + merge-augmentations splice, both-or-neither
- [[reference_sierra_graph_oom_classes]] — the 548MB parse/stringify OOM (exit 134) failure family
- [[reference_sierra_viz_first_search]] — system-viz-query before Grep/Glob (huge-tree timeout)
- [[reference_sierra_split_out_file]] — generate-system-viz → architecture-graph.json (no merged-graph clobber)
- [[reference_sierra_regen_pipeline_stages]] — the regen-viz FAST→merge→repair→dedup→reparent→edges→seed-ghost→drift stage order
- [[reference_sierra_graph_writers_history]] — the 3-writer race (generate-system-viz/regen-viz/add-node) + the split-out fix
- [[feedback_sierra_graph_correctness_is_fleet_search]] — a sierra graph mistake = fleet-wide search outage
- [[reference_sierra_psn_legs_for_system_viz]] — how system-viz satisfies each of the 11 PSN legs
- [[reference_sierra_domain_gsd_2026_05_29]] — the system-viz GSD operating protocol (galaxy 5th brain file: GSD.md)
- [[reference_sierra_viz_query_subcommands]] — verified system-viz-query CLI surface (find/headline/roadmap-candidates/blast-radius/...)
- [[reference_sierra_three_graphs_consumer_map]] — merged vs architecture vs embeddings graphs + their distinct consumers
- [[reference_sierra_dispatcher_id_ssot]] — graph dispatcher-id is `disp.` not `dispatcher.` (dead-pixel prevention)
- [[reference_sierra_token_savings_cag_2026_05_29]] — sierra's CAG-route + injector-consume token-savings work (TOKEN-SAVINGS-PIVOT)
- [[reference_sierra_regen_fast_registration_gap_2026_05_29]] — 9 *-features.mjs absent from regen-viz FAST[]; merge loads by output-json name not generator filename (U-VIZ-FAST-REGISTER-9). 2/9 wired (quoting+hotel); 7 blocked on merge-OOM
- [[reference_sierra_leverage_ranked_wiring_queue]] — leverage-ranked wiring queue (graph-0→derived fallback so the 69-engine MiscDomains bucket ranks #1 not last)
- [[reference_sierra_ranked_hybrid_n1_2026_05_29]] — N1 ranked-hybrid-graph-search: RRF-fuse master-index confidence vs utilization → prism_session:master_index_ranked_hybrid (OOM-safe)
- [[reference_sierra_node_path_template_2026_06_03]] — node→path template (U-SV-NODE-PATH-TEMPLATE): resolveCodePath +type/+byCode/+repoPath/+opt-in-line, wired into master-index + pre-bash exact-match banners (`→ Read <repoPath>`) + nav-savings telemetry. P1 fix: emit repoPath (`mcp-server/`+path), NOT bare `src/` (opens untracked top-level dup). [[feedback_node_path_must_be_repo_root_relative]]
- U-SV-NAV-INJECT-GREP-WRITE (33753f4c67): extended exact-path nav inject to **pre-grep + pre-write** via shared `scripts/lib/graph-exact-match.mjs` (exactMatchHit + navPathLine + exactMatchBanner); pre-bash refactored to share it (DRY). pre-write framed "already exists, Read before write" (dedup signal). pre-read excluded (already has the path). 80/80, 3-of-3 PASS. Nav inject now spans pre-bash/grep/write + master-index.

## Standing focus (sierra-canonical)
1. **System-viz IS the canonical task/roadmap surface** — every remaining unit fleet-wide renders as a ghost roost (priority-queue, misc-tasks, bridge-synergy, feature-gap-audit, domain-pipelines).
2. **One-writer-per-path** — `system-graph.json` has exactly ONE canonical writer (`regen-viz.mjs`, post-U-VIZ-SPLIT-OUT-FILE). Concurrent writers silently clobber.
3. **Atomic-rename + compact JSON** for all viz writes — never partial-write or pretty-print a 548MB file.
4. **FAST[] + splice, both or neither** — every new ghost-roost generator needs BOTH the regen-viz FAST[] registration AND the merge-augmentations splice block.
5. **The graph is the fleet's search substrate** — master-index / awareness / pre-*-graph hooks query it; a degraded graph is a fleet-wide search outage. Verify schemaVersion + node count + fsCoverage after every regen.

## Known regression classes (sierra tribal — preserve)
- **Silent clobber** — an independent generator writing `system-graph.json` (2026-05-17: generate-system-viz overwrote regen-viz merged graph → fixed by split-out to architecture-graph.json).
- **Merge OOM / exit 134** — merge-augmentations hits the V8 external-allocation / ~512MB string cap on the 548MB graph (`.last-regen-failure.json` 2026-05-29T01:47 exit 134); `regen-viz-merge-guard` fail-louds; leftover `.tmp.system-graph.json.<pid>` + `_node-embeddings.jsonl.partial` are orphaned scratch (golf reaps).
- **Merge SIGKILL silent-continue** — merge subprocess OOM-killed, parent continued through stages reading a stale graph (2026-05-17 lima U-REGEN-VIZ-MERGE-FAILLOUD-FIX).
- **Stale fingerprint** — `.wiki-regen-fingerprint` / `.viz-regen-guard-manifest-hash` locking out re-emit even when source changed (2026-05-20 skill-trigger-ledger-revive class).
- **Schema-read-blindness** — META tools assuming v1 shape vs v2 schema (2026-05-17 high-roi-skill-rank).
- **Un-spliced generator** — added to FAST[] but no merge-augmentations splice → ghost data silently dropped.

## Cross-galaxy bridges (PSN edges OUT — symmetric)
- **india (`engines/ai-training/`)** — india's GNN tier-5 CONSUMES sierra's `seed-ghost` ref-pool + `_node-embeddings.jsonl`; sierra PRODUCES graph + feature vectors via `xproc_kg_project_features`.
- **golf (`engines/fleet-hygiene/`)** — golf QUERIES the system-graph for orphan/utilization classification (golf's MEMORY.md declares this — symmetric ✓).
- **alpha (`engines/token-optimization/`)** — alpha audits the call-graph for token-waste hotspots.
- **delta (`engines/cad/`) + echo (`engines/post-processor/`)** — their ghost nodes flow through merge-augmentations.
- **All 26 slots** — master-index / awareness / pre-*-graph hits resolve against this graph.

## Wiki cross-refs
- [[architecture/system-viz-add-node]] · [[architecture/regen-viz-merge-guard]] · [[architecture/viz-domain-coverage]] · [[architecture/system-viz-galaxy]]
- [[feedback_system_viz_first_audit]] · [[feedback_psn_definition]] · [[feedback_commit_prefix_main_on_shared_tree]]

## Live session 109ba448 (2026-05-29) — sierra completes + owns its galaxy
Scaffolded 2026-05-28 by slot:alpha (claude-168624b9); sierra was occupied. This session sierra (claude-109ba448) executed the full 11-step buildout: realigned the soul (was generic stub), corrected alpha's stale hook/script names (e.g. `viz-first-redirect`→`audit-viz-first-inject`, `pre-bash-graph-context-inject`→`pre-bash-graph-inject`), added PATHS.md + TOOLBELT.md + master-brain link + ≥10 memories + ≥5 tribal + `/viz-audit-sierra` skill + symmetric PSN edges + the master-index back-pointer. Inventory used a parallel-agent Workflow (the user's explicit ask) + targeted on-disk verification. Live finding: a recurring merge-augmentations OOM (exit 134) on the 548MB graph; last regen nonetheless succeeded 2026-05-29T13:00.

## Available algorithm primitives (wired by tango, ALGO-SYNERGY 2026-05-29)

Invokable via `prism_algorithm` — relevant to sierra's wiring graph (PSN leg #8 → this brain):

- `graph_heterophily_aggregate` (HeterophilyAwareAggregator, H2GCN ego/neighbour-separation + k-hop) — operates on the **heterophilous** engine↔dispatcher topology of `system-graph.json` (unlike-types-connect: an engine node links to a dispatcher node, not to sibling engines). It's the model-side lever india's GNN tier-5 needs (AUROC 0.096 heterophily collapse) and consumes the same `seed-ghost` ref-pool + `_node-embeddings.jsonl` sierra produces. Sierra produces the graph/features; india + this aggregator consume them.

Batch detail: `reference_tango_algo_synergy_batch_2026_05_29` · wiki [[architecture/algo-synergy-ml-batch]].

— Scaffolded 2026-05-28 by slot:alpha (claude-168624b9). **Completed + owned 2026-05-29 by slot:sierra (claude-109ba448).**

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Obsidian-vault audit + node-access map (2026-06-08, slot:sierra, claude-0e5669d2)
Operator goal: "make sure the obsidian vault is built+operational like the X articles I've fed you; map paths to each vault node for cheaper/free token usage." Persisted here per operator directive *"whatever full context you gain needs to be persistent for your domain."* This IS sierra's domain — CHEAP-NODE-ACCESS-MS0 (`U-SV-NODE-VAULT-PATHS`) + OBSIDIAN-VAULT-OPS are sierra-owned. Verified via 6-agent ultracode workflow `wf_a6916cfe`.

**Doctrine** (cyrilXBT + Hamza Khalid @humzaakhalid X threads): vault = a **retrieval/thinking system, not storage**; any note findable <30s via Type/Time/Topic/Status; context **compounds** (Knowledge→Connection→Synthesis→Intelligence) and eventually **writes back**. PRISM token-economy = cheapest read ≈ 200-token card, NEVER the 186K-token full-graph read. → [[feedback_obsidian_low_token_2nd_brain_protocol]], [[reference_humza_khalid_obsidian_article_2026_06_08]], [[reference_cyrilxbt_obsidian_article_delta_2026-05-07]].

**Verdict: OPERATIONAL-WITH-GAPS.** Vault built+dense (39K+ wiki, 11,767 H: mem, 3,920 tribal, 34 galaxy-cards, 301,216 node-cards). Cheap-read path the operator asked for is **LIVE + fresh today**: `node scripts/system-viz-query.mjs node-card <id>` → ~136 tok, seek-path (offset index regenerated today, mtime==live graph), 99.93% cut. Cards carry `wikiEntries`/`memoryEntries` = the node→Obsidian edge. `pre-bash-graph-inject` (📂 vault paths inline) + `node-card-prefetch-inject` both wired + tested.

**The NODE-ACCESS MAP** (cheapest token path per vault node type) lives in wiki [[obsidian-vault-node-access-map]] (`knowledge/wiki/architecture/obsidian-vault-node-access-map.md`) — the core deliverable. Every populated node type has a free ≤200-token path; 3 GAPs (empty wiki dirs; canvas has no seek path; `memory-rag-inject` DEAD).

**Gap ladder (A→B→C, R13)** — all in the self-maintenance/write-back layer, none block reading:
- **A (P0 silent failures):** `memory-rag-inject.mjs` wired 0/0/0 (header falsely claims wired — R12) → U-VAULT-RAG-WIRE; `obsidian-memory-sync.mjs:342` crashes on one locked file (UNKNOWN -4094) aborting the C:→H: pass → U-VAULT-SYNC-RESILIENT (per-file try/catch+retry).
- **B (P1 works-but-manual):** promote-memory-to-wiki + vault-rot-sentinel unscheduled → U-VAULT-MAINT-CRON; wiki/index.md frontmatter stale → U-VAULT-INDEX-META.
- **C (P2 net-new write-back):** 4,136 broken `[[wikilinks]]` (nothing heals) → U-VAULT-LINK-HEAL (first bidirectional unit); tribal→wiki 31.5%; re-inject dedupe; inbox/mistakes empty (no daily-process writer); DailyFlashReportEngine.ts:149 email is a `console.log` stub.

Full memory: [[reference_obsidian_vault_audit_2026_06_08]]. R12 flag: `H:/last.md` corrupted (hook-error noise); canonical cyril body intact at `C:/Users/wompu/OneDrive/Pictures/last.md`.

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
System-graph regen + ghost-roost search substrate. Primary corpus is the 644MB system-graph + node-card index (internal).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/system-viz/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**External free-source corpus:** none applies -- this domain is PRISM-internal (codebase + wiki + operator article-set). The internal anchors above ARE the corpus. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->

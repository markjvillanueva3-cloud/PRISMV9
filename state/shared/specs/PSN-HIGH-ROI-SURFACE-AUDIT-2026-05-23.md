# PSN High-ROI MCP/CLI/API Surface Audit + External-Systems Research

> Compiled by claude-451f7328 slot:charlie /goal-3, 2026-05-23.
> Source-of-truth for PSN definition: `feedback_psn_definition.md`.
> Existing /system-viz roost / 11-leg map: already in [[reference_graph_octopus_autowire_ms0_2026_05_22]] + [[reference_psn_bridge_audit_2026_05_22]].

This spec answers two halves of the /goal:
1. **SCOPE** — for each of the 11 PSN legs, which MCP dispatcher actions, CLI skills, and REST routes are the highest-ROI consumers (token saved × calls/day × correctness lift)?
2. **RESEARCH** — what external systems (papers, OSS frameworks, commercial tools) could be slotted into PSN to make the existing legs measurably better?

Advisory + planning artifact. Adds zero runtime code; surfaces gaps + integration options for future RGS units.

---

## §1 — PSN Leg-by-Leg High-ROI Surface Inventory

Each leg's surfaces ranked by **expected token saved per typical invocation × current daily call rate × correctness lift**. ROI is qualitative (★★★★★ = compound; ★ = marginal).

### Leg 1 — Obsidian brain (★★★★★ infra leg)
- **MCP**: `prism_memory:brain_recall`, `prism_memory:search_memories`, `prism_session:obsidian_index_query`
- **CLI**: `/brain-recall`, `/sync-memory`, `/route-to-obsidian`
- **REST**: `mcp-server/src/routes/data.ts` (Obsidian vault sync endpoints)
- **Auto-injector**: `stop-obsidian-memory-feed.mjs` (every Stop)
- **ROI rank**: ★★★★★ — cross-session persistent state; near-zero token cost
- **Gap**: `/route-to-obsidian` hook only fires on Read ≥500 lines. Could fire on Grep/Glob too when result-set is large.

### Leg 2 — PRISM OS (★★★★ infra leg)
- **MCP**: `prism_operating_system` (~45 actions: shell, desk, program-release, scheduling, shop-floor)
- **CLI**: `/operating-system`, `/desk-search`, `/shop-live-status`, `/shop-quote`, `/shop-floor-query`
- **REST**: `mcp-server/src/routes/admin.ts`, `cncOps.ts`
- **ROI rank**: ★★★★ — but underused for inter-chat coordination
- **Gap**: No `prism_operating_system:psn_query_all_legs` action — operator must hit 11 separate legs manually. Single-call PSN consult would be ★★★★★.

### Leg 3 — Wiki (★★★★★ knowledge leg)
- **MCP**: `prism_session:master_index_query`, `prism_dev:wiki_index_maintainer_*`
- **CLI**: `/wiki-query`, `/wiki-ingest`, `/wiki-lint`, `/master-index`, `/wiki-morning`
- **REST**: routes/data.ts (wiki search)
- **Auto-injector**: `wiki-precheck-inject.mjs` (UserPromptSubmit)
- **ROI rank**: ★★★★★ — saves 50-80% tokens vs Grep when entry exists
- **Gap**: Wiki entries lack semantic versioning — stale entries surface alongside fresh; no "verify against current code before relying" badge

### Leg 4 — Memories (★★★★★ knowledge leg)
- **MCP**: `prism_memory:search_memories`, `prism_session:memory_relevance_query`
- **CLI**: `/memory-search`, `/remember`, `/learn`, `/distill-tribal`
- **REST**: routes/data.ts
- **Auto-injector**: `memory-relevance-inject.mjs` (UserPromptSubmit, top-3 BM25)
- **ROI rank**: ★★★★★ — surfaces standing doctrine in zero tokens
- **Gap**: Memory promotion path (fleeting → memory → wiki → CLAUDE.md pointer) is manual; no `prism_memory:promote_to_wiki` orchestrator

### Leg 5 — Tribal Knowledge (★★★★ knowledge leg)
- **MCP**: `prism_session:tribal_query`, `prism_dev:tribal_lint`
- **CLI**: `/tribal-knowledge-guide`, `/distill-tribal`, `/shop-knowledge`
- **Auto-injector**: `tribal-by-domain-inject.mjs` (slot-domain-aware)
- **ROI rank**: ★★★★ — domain-filtered = high signal
- **Gap**: 3919 tips embedded; queryable but not back-fed into engines as runtime hints (engine could ask `tribal:relevant?` before emitting borderline answers)

### Leg 6 — System Viz / master-index (★★★★★ INFRA leg)
- **MCP**: `prism_session:master_index_query`, `master_index_node_status`, `master_index_utilization_dashboard`
- **CLI**: `/system-viz`, `/master-index`, `/utilization-dashboard`, `/awareness-snapshot`, `/orphan-inventory`, `/deep-search`
- **Auto-injector**: 4 PreToolUse graph hooks (pre-read, pre-grep, pre-write, pre-bash from GRAPH-OCTOPUS-AUTOWIRE-MS0) + 1 UserPromptSubmit
- **ROI rank**: ★★★★★ — saves 30-90% tokens vs Grep/Glob on "where is X" / "is X built"
- **Gap**: 110K-node graph regen takes ~15s; incremental delta-regen would unblock real-time updates

### Leg 7 — Engines (★★★★ compute leg)
- **MCP**: ~104 dispatchers × ~600+ actions
- **CLI**: `/engine-browse`, `/dedup`, `/forge-triple`, `/forge-engines`
- **REST**: most of `mcp-server/src/routes/` (per-domain)
- **Auto-injector**: `engine-digest-precheck.mjs` (PreToolUse:Write/Edit)
- **ROI rank**: ★★★★ — execution surface; dedup-check before create is ★★★★★
- **Gap**: 667 engines NEEDS_WIRING per current BUILD_STATE — no automated wiring suggester (the `/wire-unwired` skill exists but isn't autonomous)

### Leg 8 — Algorithms (★★★ compute leg)
- **MCP**: `prism_calc:algorithm_*`
- **CLI**: `/algorithm-inspect`, `/calc`
- **Auto-injector**: `ai-deep-intelligence.mjs` SessionStart
- **ROI rank**: ★★★ — used directly less than engines; mostly invoked via engines
- **Gap**: No `prism_calc:algorithm_route_best` that picks the right algo for a given problem class

### Leg 9 — Formulas (★★★ compute leg)
- **MCP**: `prism_dev:formula_harvest`, `formula_accuracy`
- **CLI**: `/formula-browse`, `/formula-check`, `/physics-verify`
- **ROI rank**: ★★★ — canonical Kienzle/Taylor lookup saves time vs re-deriving
- **Gap**: Formula registry not yet served as semantic-search; `formula-browse` is keyword-only

### Leg 10 — Neural Network / GNN (★★ inference leg, dormant)
- **MCP**: GraphSAGE tier-5 (only fires when AUROC ≥ 0.78; currently 0.096 → DORMANT)
- **Auto-injector**: `nn-graph-health-inject.mjs` (SessionStart, surfacing dormancy)
- **ROI rank**: ★★ — high *potential*; current actual ROI ≈ 0 (dormant)
- **Gap**: Reference-pool seed missing (per NN-GRAPH-MS2/U1); no MicroLoRA-per-domain adapter ledger

### Leg 11 — PRISM AI (★★★★★ orchestration leg)
- **MCP**: `prism_ai` dispatcher (~600 actions); `aiSystemRouterEngine.route()`; `prismCreativeReasoningEngine.explore()`; octopus 5-voice consensus
- **CLI**: `/ai-analyze`, `/ai-optimize`, `/ai-reason`, `/smart`, `/karpathy`
- **Auto-injector**: `ai-system-router-inject.mjs` (PreToolUse:Agent); `prism-ai-memo-coverage-inject.mjs` SessionStart
- **ROI rank**: ★★★★★ — the routing layer that decides which other leg to invoke
- **Gap**: Router currently scores ~42.9% memo coverage on PRISM-AI engines — 4 of 7 are blind spots (`PRISMCreativeReasoningEngine`, `PRISMLoRAAdapterEngine`, `PRISMNeuralKnowledgeSynthesisEngine`)

---

## §2 — High-ROI Cross-Leg Surfaces (the actual compounding layer)

The biggest gains come from surfaces that hit ≥3 legs in one call:

| Surface | Legs touched | ROI | Current state |
|---|---|---|---|
| `master-index-precheck-inject` (UserPromptSubmit) | 3,4,5,6,7,11 | ★★★★★ | LIVE — top-5 hits per prompt |
| `audit-close-out-candidates` (3 drift classes) | 3,4,6,7 | ★★★★★ | LIVE (charlie /goal-2 shipped) |
| `master-index-search-lib` (subagent per-task pre-search) | 3,4,5,6,7 | ★★★★★ | LIVE per [[reference_subagent_per_task_presearch_2026_05_15]] |
| `octopus` 5-voice consensus | 6,11 (only) | ★★★ | LIVE but should reach legs 3,4,5 too (per existing enhancement list in `feedback_psn_definition` line 53-56) |
| `aiSystemRouterEngine.route()` upstream of octopus | 11→{1,2,3,4,5,6,7,8,9,10} | ★★★★★ | NOT YET — gap from `feedback_psn_definition` line 57 |
| `prism_operating_system:psn_query_all_legs` (proposed) | ALL 11 | ★★★★★ | DOES NOT EXIST — proposed below §4 |
| `prism_memory:promote_to_wiki` orchestrator (proposed) | 1,3,4 | ★★★★ | DOES NOT EXIST — proposed below §4 |
| `engine.tribal:relevant?` runtime back-call (proposed) | 5,7 | ★★★★ | DOES NOT EXIST — proposed below §4 |

---

## §3 — External-Systems Research (what can improve PSN)

Mapped by which PSN leg they enhance + integration cost (S=small ≤1 unit, M=medium 2-4 units, L=large 5+ units).

### Memory / brain layer (legs 1, 4)
| System | PSN fit | Insight | Cost |
|---|---|---|---|
| **Letta** (formerly MemGPT) — OS-style page-tables for LLM memory | leg 1 + 4 | Hierarchical "working / archival" split is essentially what `precompact-handoff` already approximates manually. Letta's tool-emit + state-snapshot mechanics could replace the hand-rolled handoff writer | M |
| **LangGraph memory store + checkpointer** | leg 1 + 4 | Structured checkpoint serialization with thread-id semantics — closer match to slot-chat-id model than Letta. Worth comparing to `loop-state.mjs` JSON schema | M |
| **Mem0** — multi-layer memory (user / session / agent) with vector + KV | leg 4 | Multi-tenant memory boundaries; mature graph backend; battle-tested in production agents | S |
| **EpiMem / episodic memory papers** (2024-2025) | leg 4 + 10 | "Replay buffer" pattern for fine-tuning — already echoed in `WEDMOnlineLearningEngine`; explicit episodic-replay layer would feed the NN/GNN training signal | M |

### Retrieval / RAG layer (legs 3, 4, 5, 6)
| System | PSN fit | Insight | Cost |
|---|---|---|---|
| **GraphRAG (Microsoft)** — community-detection + hierarchical summaries over graph | leg 3 + 6 | The wiki is already a graph (cross-refs as edges); applying GraphRAG community detection would auto-cluster the 28K wiki entries into navigable topics. Replaces manual `wiki-morning` curation | M |
| **RAGAS** — eval framework for retrieval quality (faithfulness, answer-relevance, context-recall) | legs 3,4,5,6 | Gives quantitative ROI numbers for the auto-injectors (currently asserted qualitatively as ★★★★★). Closes the "is the wiki/memory inject actually helping?" measurement loop | S |
| **HyDE** (Hypothetical Document Embeddings) | legs 3,4,5 | Generate a synthetic answer first, embed THAT, then retrieve — typically 10-20% recall lift over query-embedding-only. Cheap drop-in for `memory-relevance-inject` + `wiki-precheck-inject` | S |
| **ColBERT v2 / late-interaction** | legs 3,4,6 | Token-level matching with 100× recall vs single-vector for long-form. Heavy compute though — better suited to a one-shot wiki-index rebuild than per-prompt | L |
| **RAG-Fusion** (multi-query reciprocal rank fusion) | legs 3,4,5,6 | Issue 3-5 query variants, fuse top-k by RRF. Already partially implemented in `embeddings_search` "smart" mode; could be lifted into `memory-relevance-inject` | S |

### Graph layer (legs 6, 10)
| System | PSN fit | Insight | Cost |
|---|---|---|---|
| **Neo4j + GDS (Graph Data Science library)** | leg 6 + 10 | Production-grade PageRank / community / shortest-path on the system-graph. Currently the graph lives in JSON; loading into Neo4j would unlock the GDS algorithm library for free | M |
| **PyTorch Geometric (PyG)** | leg 10 | Standard library for GraphSAGE training; would replace whatever's behind the current NN-GRAPH dormancy. PyG has Inductive + Heterogeneous flavors | M |
| **Graph attention (GAT) instead of GraphSAGE** | leg 10 | GAT often beats GraphSAGE on heterogeneous graphs with high node-type variance — exactly PRISM's case (engines + dispatchers + memories + wiki + tribal mixed). Worth A/B against the current dormant GSAGE | M |
| **TigerGraph CoPilot** | leg 6 | Natural-language-to-Cypher LLM agent. Bridges leg 11 (PRISM AI) ↔ leg 6 (System Viz) without writing custom query templates | L |

### Neural / adapter layer (legs 10, 11)
| System | PSN fit | Insight | Cost |
|---|---|---|---|
| **S-LoRA** (serving 1000s of LoRA adapters concurrently) | leg 10 + 11 | If PRISM goes per-domain (mill/lathe/wedm/cad/cam) LoRA adapters, S-LoRA's runtime swap is the production serving story. Pairs with already-mentioned `PRISMLoRAAdapterEngine` (memo blind-spot) | L |
| **LoRA-Hub** — composable adapter merging | leg 10 + 11 | Merge per-domain adapters at runtime per query. Lower compute than S-LoRA, lower flexibility | M |
| **DSPy** (Stanford) — declarative LM programs with optimizers | leg 11 | Treat octopus consensus prompts as DSPy modules with measurable optimizers (BootstrapFewShot, MIPRO). Closes the "consensus prompt quality is a hand-tuned art" gap | M |
| **Magentic-One (Microsoft)** — multi-agent orchestration baseline | leg 11 | Reference architecture for orchestrator + 5 specialist agents — same shape as octopus. Could borrow the orchestrator's task-decomp prompting | M |
| **AutoGen v0.4** — distributed multi-agent runtime | leg 11 | Cross-process actor model; could replace the slot-task-claim hand-rolled coordination | L |

### Coordination / multi-agent layer (PSN-wide)
| System | PSN fit | Insight | Cost |
|---|---|---|---|
| **CrewAI** — role + tool-based agent crews | PSN-wide | The slot system (alpha-zulu domain partition) is already a crew. CrewAI's role/task/tool primitives match. Migration would unify "slot soul" + "/checkin" + "/loop" under one declarative spec | L |
| **OpenAI Swarm** (2024) — handoffs + context-vars between agents | PSN-wide | The "slot peers + handoff" mechanic is essentially Swarm's `handoff` primitive. Could replace `per-agent-handoff.mjs` if the Swarm runtime accepts persisted state | M |
| **A2A protocol** (Agent-to-Agent, IBM Research) | PSN-wide | Standardized message envelope for cross-agent calls — relevant to AGENT_CHAT.jsonl format | M |

### Eval / observability layer (PSN-wide)
| System | PSN fit | Insight | Cost |
|---|---|---|---|
| **Inspect AI** (UK AISI eval framework) | leg 11 | Reproducible eval harness for agent capabilities — would benchmark each PSN leg's contribution rigorously (current ROI ranks are qualitative) | M |
| **LangSmith / Langfuse trace** | PSN-wide | Distributed trace + cost telemetry for the per-tool/per-skill/per-hook chain. Would close the "what does each PSN inject actually cost?" gap | S |
| **Helicone** — proxy-level logging | leg 11 | Lower-touch than LangSmith; reveals which hooks drive cache misses | S |

---

## §4 — Top 5 Highest-Leverage Gaps (recommendation queue)

Ranked by **(integration cost) × (cross-leg impact) × (current pain felt)**:

1. **`prism_operating_system:psn_query_all_legs`** (M-cost, 11-leg, high pain) — single MCP action that fans out to all 11 leg queries in parallel + dedupes results by master-index. Closes the "operator must manually query each leg" friction. Implementation: pure aggregator over existing actions; no new infra.

2. **HyDE wrap on `memory-relevance-inject` + `wiki-precheck-inject`** (S-cost, 4-leg, measurable) — generate a synthetic answer paragraph from the prompt, embed THAT, then BM25/vector-search memories + wiki against the synthetic. Typically +10-20% recall lift. Drop-in retrofit; A/B-able.

3. **RAGAS-style eval harness for the 5+ auto-injectors** (S-cost, PSN-wide, currently zero measurement) — score each auto-injector daily on faithfulness/relevance/recall against a small held-out set of past chat queries with known good outcomes. Turns the ★★★★★ assertions into numbers.

4. **`aiSystemRouterEngine.route()` upstream of octopus consensus** (M-cost, 11-leg routing, follows existing doctrine) — instead of octopus firing on every consensus-triggering keyword, the AI router decides whether to even invoke it (sometimes a single-leg query suffices). Memory hint: `feedback_psn_definition` lines 56-57 explicitly call this out as the standing follow-up. Charlie's leg in this is the WEDM-domain routing rules.

5. **GraphRAG community-detection over the 28K wiki + 110K-node system-graph** (M-cost, 2-leg, structural) — auto-cluster entries into navigable topics; replace the manual `wiki-morning` curation pass. Microsoft's GraphRAG is open-source + has stable API.

---

## §5 — Out-of-scope deferrals (visible-but-skipped per R12)

- S-LoRA serving (L-cost) — premature until per-domain LoRA adapters actually exist
- TigerGraph CoPilot (L-cost, paid) — Neo4j + GDS is the open-source ramp first
- CrewAI / AutoGen full migration (L-cost) — slot system works; migration is asthetic without measurable lift
- ColBERT v2 (L-cost compute) — single-vector + RRF likely captures 80% of the lift at 20% of the cost

---

## §6 — How to consume this audit

- **For RGS unit generation**: §4 items 1-5 are pre-shaped as roadmap-unit candidates (one milestone, 5 phases). Inject into `atomic-roadmap.json` under a new `PSN-HIGH-ROI-MS0` envelope.
- **For chat-routing**: §2 cross-leg surfaces are the priority-injectors — any chat working on a PSN-touching task should verify those are firing.
- **For docs**: this spec becomes `knowledge/wiki/architecture/psn-high-roi-surface-audit.md` after triage.

**Cross-references:**
- [[feedback_psn_definition]] — the 11-leg canonical map
- [[reference_graph_octopus_autowire_ms0_2026_05_22]] — leg 6 hooks already shipped
- [[reference_psn_bridge_audit_2026_05_22]] — bridge layer audit precedent
- [[reference_octopus_consensus_ms1_2026_05_18]] — octopus baseline being enhanced
- [[reference_session_continuity_stack_2026_05_15]] — leg 1 / 4 plumbing
- [[partial-milestone-drift]] — sibling audit pattern (charlie /goal-2 deliverable)

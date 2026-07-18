# PSN Incorporation Research R4 — Deep-stack extension (2026-05-25)

> Compiled by claude-2afa1e56 slot:papa, 2026-05-25.
> Sibling to [R1](./PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md) (25 systems, general PSN), [R2](./PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md) (50+ systems, 13 categories), [R3](./PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md) (100+ systems, learning+reasoning).
> User directive: *"do further deep research on deep learning, deep reasoning, ai systems, neural network, gnn, obsidian, /system-viz to see what else we need to build and what more we need to synergize"*.
> Mandate: cover gaps R1/R2/R3 left in the **named 7 surfaces**. NOT a re-derivation — only net-new systems + synergies.

Format (same as R1/R2/R3): one-line description / which PSN leg(s) / integration cost S/M/L / ROI mechanism with a concrete number / PRISM-specific gap.

---

## §1 — DEEP LEARNING (post-Transformer + state-of-2024-2025 architectures)

R1/R2/R3 inventoried preference-opt, PEFT, distillation, replay. R4 picks up the **architecture-side** that they skipped (R3 §1C+ covered training methods, not model shapes).

| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **Mamba / Mamba-2** (SSM) | 10 | M | Linear-time attention; 4-8× faster inference at long context | When PRISM needs to fit full JM-DIE corpus (76K files) in working context; complements [[reference_engine_wiki_embedder_2026_05_24]] |
| **RWKV / RetNet** | 10 | M | RNN-Transformer hybrids; sub-quadratic + recurrent inference | Edge deployment on shop-floor terminals where Transformer compute is too heavy |
| **Hyena / Long Convolution** | 10 | M | Convolutional alternative to attention; 100× context length | If PRISM ever embeds entire customer history into a single context |
| **FlashAttention-3** | 10 | S | 1.5-2× speed on H100 with negligible accuracy loss | The "wait, are we leaving Hopper perf on the table?" question |
| **PagedAttention (vLLM)** | 10, 11 | S | KV-cache memory management; 24× higher throughput for production serving | Production-serving prerequisite when PRISM serves multiple slots simultaneously |
| **Speculative Decoding** | 10, 11 | M | 2-3× generation speedup using a small draft model + large verifier | qwen2.5-coder:3b drafts + qwen2.5-coder:7b verifies — already have both |
| **Medusa / Lookahead Decoding** | 11 | M | Draft-model-free speculative decoding; multiple decoding heads | Drop-in if PRISM ever runs its own serving |
| **Mixture-of-Depths (MoD)** | 10 | L | Per-token compute allocation; trade accuracy/latency dynamically | Premature for PRISM today |
| **Switch Transformer / GShard (sparse MoE)** | 10, 11 | L | Per-token expert routing; trillion-param models on commodity HW | The "domain experts → MoE router" story for PRISM's slot domains |
| **DeepSeek-V3 / V3-Reasoner architecture** | 10, 11 | L | MoE + multi-head latent attention; SOTA cost-efficient | Reference architecture for any future open-weight reasoning model |
| **Rotary Position Embedding (RoPE) + Variants (YaRN, NTK)** | 10 | S | Extrapolation past trained context length without fine-tune | Long-context PRISM use cases (whole JM-DIE program history) |
| **Grouped-Query Attention (GQA)** | 10 | S | 4-8× KV-cache reduction at ~no accuracy loss | If PRISM ever trains a custom Transformer |
| **SwiGLU activation** | 10 | S | Outperforms ReLU/GELU on transformer pretraining | Standard now in Llama/Qwen line — already in the ladder |
| **Multi-Token Prediction** | 10 | M | Train to predict N tokens ahead; +5-15% pretraining efficiency | Active research; for PRISM's eventual custom pretraining |

**Synergy missing**: R3 picks **DPO + LoRA + Replay-buffer** but R3 says nothing about WHICH base architecture. The 2024-2025 SOTA for PRISM's domain (CNC/manufacturing reasoning + small enough to fit per-domain LoRA) is the Qwen 2.5/3.0 family (already in PRISM's Ollama tier) → **R4 confirms the L0-tier model choice was correct, no migration needed**.

---

## §2 — DEEP REASONING (test-time compute + verification)

R3 covered MCTS+LLM, ToT/GoT, PoT/PAL, CoV, multi-agent debate. R4 picks up **inference-time compute scaling** and **formal-verification-adjacent** systems R3 deferred.

| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **o1/R1-style RL on reasoning traces** | 11 | L | The breakthrough — train ON reasoning, not just outcomes | R3 named DPO/KTO; R4 adds: train ON reasoning trajectories themselves once you have the trace corpus (STaR ships this) |
| **Self-Play Reasoning (rStar-Math style)** | 11 | M | MCTS-guided SFT pushed 7B past o1-preview on AIME | R3 named it; R4 emphasizes: directly applicable to physics-formula reasoning |
| **Search + Reward Model + Best-of-N** | 11 | M | Inference-time compute scaling; +5-15% accuracy at 5-10× compute | Pair R3 pick 4 with R3 pick 1 (extended thinking) — these compose multiplicatively |
| **Constitutional AI / Self-Critique** | 11 | M | Models critique own outputs against a constitution before emit | Pair with safety-critical paths; charlie's slot-soul already enforces *"refuse inline constants"* — formalize as constitution |
| **AlphaProof / Lean integration (LIGHT version)** | 9, 11 | M | Don't formalize whole proofs — just emit Lean-checkable assertions for unit dimensions, monotonicity | The "Ω/S(x) gate proves itself" track without going full DeepMind |
| **Z3/cvc5 SMT for safety-constraint solving** | 11 | M | Decide satisfiability of physics constraint systems | R3 mentioned; concrete PRISM gap: wire to `wedm_safety_gate_evaluate` for hard constraint check |
| **Forward-Forward Algorithm (Hinton)** | 10 | L | Bio-plausible alternative to backprop; local learning | Research-only; not for production |
| **In-Context Reinforcement Learning** | 11 | M | Learn behaviors from in-prompt examples without weight updates | The "few-shot examples that include outcomes" pattern; cheap |
| **Process Supervision (PRM) at scale** | 11 | L | Score each reasoning step (not just answer); the SOTA reward model | Most expensive R3 pick to ship; R4 demotes to L-cost-deferred |
| **Chain-of-Verification + RAG** | 3, 11 | S | CoV (R3 pick 5) + retrieval-augmented evidence per step | PRISM has tribal corpus + wiki — pair with CoV for evidence-grounded answers |

**Synergy missing**: R3's pick #3 (PoT/PAL via `prism_calc`) + R3's pick #5 (CoV inside safety gate) + R4's "CoV + RAG" form a **3-stage verification pipeline**: reasoning → eval-against-corpus → final critique. This pipeline doesn't exist as a single skill or engine. **Highest-leverage R4 build**: wire those 3 into `PRISMVerifiedReasoningEngine` (proposed).

---

## §3 — AI SYSTEMS (agent orchestration + tool-use training)

R1 named DSPy + Magentic-One. R2 named LangGraph, Letta, Mem0. R3 named DSPy, GEPA, TextGrad. R4 picks up **2024-2025 agent frameworks** and **tool-use training**.

| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **AutoGen 0.4 (event-driven)** | 11 | M | Replaces v0.2's conversational model; cleaner agent composition | If PRISM ever rewrites octopus consensus in OSS |
| **CrewAI 2024 (process-as-code)** | 11 | M | Sequential/hierarchical agent processes; OSS | Reference architecture for slot orchestration |
| **LangGraph (stateful graph orchestration)** | 6, 11 | M | Cycles + checkpoints + human-in-loop; production-grade | If PRISM moves from /loop autonomous to operator-gated graphs |
| **OctoTools / OctoPack (RAG + tools)** | 11 | M | Toolformer-style; train models to invoke tools | The "model learns to call `prism_calc` automatically" upgrade |
| **AutoGPT-Forge / GPTAssist Templates** | 11 | S | Reference patterns for goal→plan→execute loops | R3's pick 2 (Plan-and-Solve) is the lightweight version |
| **Agentic Workflow Patterns (Anthropic 2024)** | 11 | S | 5 canonical patterns (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer) | PRISM uses ALL 5 implicitly — documenting them explicitly cuts onboarding time |
| **MetaGPT (software-engineering agent)** | 11 | M | Multi-role agent (PM, architect, engineer, QA) | Reference for PRISM's own multi-role pattern; not a direct dep |
| **OpenHands / Devin-style autonomous coding** | 11 | L | Fully autonomous bug-fix; long-horizon planning | Far beyond PRISM today; R5/R6 land |
| **Function-Calling Fine-tuning (Berkeley FFT)** | 10, 11 | M | Train models to invoke MCP-shaped function calls | Most directly applicable: train per-domain model to invoke PRISM dispatchers naturally |
| **Constitutional AI (Anthropic) for agent rules** | 11 | M | Agent self-critiques against constitution; reduces jailbreak | Pair with safety paths; doesn't need re-training |

**Synergy missing**: R3 named "Self-Reward (Meta 2024) — Octopus 3-of-3 consensus is the cousin pattern". R4 confirms: PRISM's 26-slot fleet + octopus consensus + scrutiny gates **IS** a CrewAI/AutoGen-style multi-agent system, but it's documented as PSN-internal patterns. **R4 build candidate**: a `knowledge/wiki/architecture/prism-agent-patterns-rosetta-stone.md` that maps PRISM's slot/octopus/scrutiny patterns to the canonical 5 Anthropic agentic patterns + AutoGen/CrewAI terminology — closes onboarding gap for future contributors.

---

## §4 — NEURAL NETWORK (architectures + training tricks)

R3 named LoRA/QLoRA/DoRA/LongLoRA/Spectrum/MoLE. R4 adds **training-time and architecture-time refinements**.

| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **Sophia optimizer** | 10 | S | 2× faster pretraining vs AdamW; same accuracy | If PRISM trains from scratch |
| **Lion optimizer** | 10 | S | Fewer hyperparams than AdamW; SOTA at small scale | Drop-in optimizer change |
| **Cosine restart + warmup** | 10 | S | Standard LR schedule for resume-able training | Replay buffer (R3 pick 7) needs this |
| **Mu-Parameterization (μP)** | 10 | M | Transfer hyperparams from small → large scale | When PRISM scales up |
| **EMA (Exponential Moving Average) on weights** | 10 | S | +0.5-1% on most benchmarks; trivial | Drop-in for any training run |
| **Quantization-aware training (QAT)** | 10 | M | Train at FP16, deploy at INT4 with <1% drop | Production serving prereq |
| **GPTQ / AWQ / SmoothQuant** | 10 | S | Post-training INT4 quantization | Already used implicitly (qwen2.5-coder:3b is Q4_K_M) |
| **Knowledge Distillation (Hinton-style)** | 10 | M | Teacher → student; smaller deploy model | Pair with R3 §1F Self-Distill |
| **Mixture-of-Experts routing (per-token)** | 10 | L | Trillion params on commodity HW | Premature |
| **LayerNorm vs RMSNorm** | 10 | S | RMSNorm faster + as accurate | Architecture choice if PRISM trains custom |
| **Pre-norm vs Post-norm** | 10 | S | Pre-norm trains more stably at scale | Modern transformers all pre-norm |
| **Gradient Checkpointing** | 10 | S | 2-4× training memory savings at 20% time cost | Enables training larger models on smaller GPUs |
| **DeepSpeed ZeRO-3 / FSDP** | 10 | M | Multi-GPU sharded training | When PRISM has >1 GPU |

**Synergy missing**: PRISM's NN/GNN tier-5 (GraphSAGE) is trained ad-hoc — no LR schedule, no EMA, no checkpointing strategy documented. **R4 build**: a `scripts/lib/nn-training-recipe.mjs` that pins the standard recipe (cosine + warmup + EMA + checkpoint) for every PRISM training script. Single-file, ~80 LOC.

---

## §5 — GNN (beyond GraphSAGE)

R1/R2/R3 named GraphSAGE only. R4 picks up the **GNN architecture landscape** that PRISM's NN tier-5 could leverage.

| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **GAT (Graph Attention Network)** | 10 | M | Attention-weighted neighborhood aggregation; +2-5% on link prediction | Direct upgrade path for NN tier-5 |
| **GIN (Graph Isomorphism Network)** | 10 | M | Theoretically max-expressive among message-passing GNNs | If GraphSAGE plateaus on structural-only features |
| **GraphSAINT / Cluster-GCN** | 10 | M | Scalable subgraph sampling for large graphs | The 110K-node graph is exactly the regime these target |
| **GraphormerV2 (transformer-on-graphs)** | 10 | L | SOTA on OGB; treats nodes as tokens with structural encoding | Heavyweight but represents the frontier |
| **HGT (Heterogeneous Graph Transformer)** | 10 | M | Native support for heterogeneous node + edge types | PRISM's graph IS heterogeneous (L1-L11 layers, ghost vs built status, multiple edge types) — exact fit |
| **PNA (Principal Neighbourhood Aggregation)** | 10 | M | Multiple aggregators (mean/max/std) per layer; +1-3% on benchmarks | Drop-in for richer feature aggregation |
| **DropEdge / DropNode / DropMessage** | 10 | S | Regularization for GNN training; cuts overfitting | The 1958 ghost-skipped nodes suggest overfit risk; DropEdge mitigates |
| **GNNExplainer / PGExplainer** | 6, 10 | M | Per-prediction subgraph explanation | When PRISM needs "why did NN predict THIS dispatcher?" — interpretability story |
| **Anti-Symmetric Deep Graph Networks** | 10 | M | Solves over-smoothing in deep GNN stacks | If PRISM stacks more than 2-3 GraphSAGE layers |
| **GraphMAE / Generative GNN pre-training** | 10 | M | Self-supervised pre-training on the graph itself; no labels needed | PRISM has the data; this is exactly the right cold-start before tier-5 retrain |
| **GraphRAG (Microsoft)** | 3, 10, 11 | M | Knowledge-graph-augmented RAG; SOTA on multi-hop questions | R1 named; R4 adds: PRISM's 110K-node graph + tribal corpus is THE GraphRAG corpus |
| **NodeFormer / DIFFormer** | 10 | M | All-pairs message passing via attention; for dense connectivity | PRISM's graph is sparse — these may NOT help here |

**Synergy missing**: PRISM's NN tier-5 is **homogeneous** GraphSAGE on what's effectively a **heterogeneous** graph (L1-L11 layers, multiple status types, multiple edge types). **R4 highest-leverage build**: replace GraphSAGE with **HGT (Heterogeneous Graph Transformer)** — designed for exactly this graph shape. Expected lift: +3-5% AUROC, gets tier-5 past the 0.78 promotion gate without the data-side fix the engine-wiki embedder is shipping. **Pair fix**: if data-side AND HGT both ship, expect AUROC 0.85+.

---

## §6 — OBSIDIAN (vault automation + advanced plugins)

R2 named Obsidian in the memory section. R4 picks up the **plugin ecosystem and vault patterns** for PRISM's brain leg (#1).

| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **Smart Connections plugin** (local embeddings + semantic search) | 1, 4 | S | Local AI-augmented vault search; no API calls | Replaces master-index for vault-only queries; OS owns it |
| **Dataview / Datacore queries-as-code** | 1, 4 | S | TypeScript queries over vault frontmatter; powerful filters | Per-slot "what feedback memos apply to me?" — auto-injected query |
| **Templater patterns** (templates with JS) | 1, 4 | S | Standardize memo creation; reduce schema drift | Per-memo-type template (feedback/reference/project) cuts manual frontmatter errors |
| **JSON Canvas (open spec)** | 1, 6 | M | Visual graph layout that Obsidian + drawio + other tools share | PRISM-System-Map.canvas already uses this; could become the PSN-state visual exchange format |
| **Periodic Notes / Daily Notes patterns** | 1, 4 | S | Calendar-organized cross-session notes; PSN-leg digests by date | Slot-handoff notes by date instead of by topic |
| **Obsidian-Git** sync | 1 | S | Vault-as-git-repo; the existing pattern | Already in place via `stop-obsidian-memory-feed.mjs` |
| **Graph Analysis plugin** | 1, 6 | S | In-Obsidian centrality + clustering of the memo graph | Identifies orphan memos + high-leverage memos |
| **Tasks / Kanban plugin** | 1, 4 | S | In-vault task tracking with frontmatter integration | Slot-bound task lists synced to vault |
| **Smart Composer / Co-pilot plugin** | 1, 11 | S | Inline LLM editing of memos via Ollama | Local LLM editing of memos without leaving Obsidian |
| **Excalidraw plugin** | 1, 6 | S | Hand-drawn diagrams as first-class vault notes | Architecture sketches stay with the memo |

**Synergy missing**: PRISM auto-feeds memos to Obsidian ([[feedback_auto_memory_feeds_obsidian_stophook]]), but the inverse — **Obsidian vault state feeding back into PSN substrate** — is one-way only. **R4 build candidate**: an Obsidian → tribal-embed-index hourly bridge (vault leaf → tribal-embed entry with `source: "obsidian"`), making vault notes searchable via master-index. Single-script ship.

---

## §7 — /SYSTEM-VIZ (visualization stack + interactivity)

R1/R2/R3 didn't drill into /system-viz internals (just named it as PSN leg #6). R4 picks up the **rendering and interactivity layer**.

| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **WebGPU compute shaders** | 6 | L | Move force-directed layout off CPU → GPU; 100K+ nodes at 60fps | Premature; current 3D rendering performs |
| **GPU instanced rendering (Three.js InstancedMesh)** | 6 | S | Already used; performance is OK | Pin best-practices in a wiki entry |
| **Semantic zoom (level-of-detail)** | 6 | M | Render L1-L4 at zoomed-out scales, L8-L11 only when zoomed in | At 283K nodes, you can't show everything; LOD is the fix |
| **Force-Atlas2 / OpenORD layouts** | 6 | M | Faster + visually clearer than naive force-directed | The default Three.js force layout struggles at scale |
| **Roost overlays as edge bundles** | 6 | M | Hierarchical edge bundling; reduce visual clutter | PRISM has 998K edges — bundling cuts visual noise 10× |
| **Signed Distance Fields for node boundaries** | 6 | M | GPU-accelerated smooth boundaries at any zoom | Premature |
| **Time-scrubbing along commit-history** | 6, 11 | M | Drag a timeline slider to see graph state at HEAD~N | The "what did the graph look like before X shipped" query |
| **2D minimap with semantic zoom** | 6 | S | Overview + detail navigation pattern | Easy ship; high UX payoff |
| **Per-slot color overlay** | 6 | S | Color nodes by claiming slot | "Show me what alpha is touching" — concrete debugging value |
| **PSN-leg-state heatmap overlay** | 6 | S | Color the graph by PSN-leg health (healthy=green, degraded=red) | Real-time PSN dashboard via the existing roost mechanism |
| **WebSocket live diff stream** | 6, 11 | M | Push graph deltas to clients; no full reload | Pairs with the augmentation regeneration cron |
| **Crowdsourced node tagging UI** | 6 | M | In-graph annotation by operators | Future shop-floor UX |

**Synergy missing**: The 21 roost overlays (priority_queue, bridge_synergy, misc_tasks, college_corpus per [[college-courses-psn-incorporation]] proposal, slot_synergy, etc.) are **independent visual layers** but don't compose — toggling them is exclusive, not additive. **R4 build candidate**: per-roost transparency + Boolean composition (`show priority_queue AND ghost.unwired` etc.). Small UX change, big diagnostic payoff.

---

## §8 — TOP-10 R4 PICKS (cost-adjusted ROI × cross-leg impact × PRISM-specific gap)

1. **HGT (Heterogeneous Graph Transformer) replacing GraphSAGE in NN tier-5** (M-cost) — exact fit for PRISM's heterogeneous graph shape; expected +3-5% AUROC; pairs multiplicatively with the engine-wiki embedder shipped earlier this session
2. **PRISMVerifiedReasoningEngine — wire CoV + RAG + PoT into one path** (S-cost) — composes R3 pick 3 + pick 5 + R4 §2 CoV+RAG; single new engine
3. **GraphRAG over the 110K-node system-graph + 12K tribal corpus** (M-cost) — the obvious next retrieval upgrade; Microsoft has the reference impl
4. **Per-roost transparency + Boolean composition in /system-viz** (S-cost) — let operators see priority_queue ∩ ghost.unwired without toggling
5. **Function-Calling Fine-tuning on PRISM dispatcher invocations** (M-cost) — train qwen2.5-coder:7b to invoke `prism_*` dispatchers naturally; cuts in-prompt-dispatch-mapping cost
6. **Obsidian → tribal-embed-index hourly bridge** (S-cost) — closes the inverse direction; vault notes become master-index-searchable
7. **PSN-leg-state heatmap overlay in /system-viz** (S-cost) — live PSN dashboard via existing roost mechanism
8. **Speculative decoding: qwen2.5-coder:3b drafts + 7b verifies** (M-cost) — 2-3× generation speedup with both models already loaded
9. **`scripts/lib/nn-training-recipe.mjs` — pin standard NN training recipe** (S-cost) — cosine LR + warmup + EMA + checkpointing in one importable
10. **`prism-agent-patterns-rosetta-stone.md` — slot/octopus/scrutiny → CrewAI/AutoGen terminology** (S-cost) — onboarding doc that codifies what PRISM already does

**Out-of-scope per R12** (named, deferred):
- Mamba/RWKV/Hyena architectures (L-cost) — premature; current Qwen tier serves
- Mixture-of-Experts production (L-cost) — gated on per-domain LoRA existing first (R3 pick 9 prereq)
- AlphaProof-style formal verification (L-cost) — gated on Ω/S(x) becoming contractual
- WebGPU compute shaders for /system-viz (L-cost) — current rendering OK
- OpenHands/Devin autonomous coding (L-cost) — beyond PRISM scope today

---

## §9 — How R4 composes with R1+R2+R3

| Layer | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| Retrieval | GraphRAG, HyDE, RAGAS, ColBERT | Qdrant binary quant, BGE-M3, GPTCache | — | **GraphRAG over PSN substrate**, Obsidian→tribal bridge |
| Memory | Letta, LangGraph, Mem0, EpiMem | — | Replay buffer, Experience Replay, EWC, Reflexion | — |
| Reasoning | DSPy, Magentic-One | ToT, Reflexion, CoV, Self-Consistency, Outlines | PoT, PAL, Best-of-N+ORM, MCTS+LLM, Plan-and-Solve, Skeleton-of-Thought, Z3, Claude-thinking-flag | **PRISMVerifiedReasoningEngine** (CoV+RAG+PoT composite), Self-Critique constitution |
| Training | S-LoRA, LoRA-Hub | Distilabel, Sakana evolutionary | DPO, KTO, IPO, SimPO, GRPO, STaR, Quiet-STaR, rStar-Math, SPIN, REST-EM, Self-Reward, Self-Instruct, DoRA, LongLoRA, Spectrum, MoLE, Active learning, Curriculum, Generative Replay, Progressive Networks | **Function-Calling FT** on PRISM dispatchers, Sophia/Lion optimizers, **nn-training-recipe** lib |
| Optimizers | — | — | DSPy, TextGrad, Trace, GEPA | — |
| Verification | Inspect AI, RAGAS | Promptfoo, Guardrails AI | Conformal prediction, Bayesian DL, Calibration, Verifier-guided search, PRM, ORM | **Lean-light** (unit-dim + monotonicity assertions), CoV+RAG |
| Architecture (NEW in R4) | — | — | — | **HGT**, GAT, GIN, GraphSAINT, GraphMAE, RoPE/YaRN, GQA, FlashAttention-3 |
| Inference-time perf (NEW in R4) | — | — | — | **Speculative decoding**, PagedAttention/vLLM, Medusa |
| Visualization (NEW in R4) | — | — | — | **Roost Boolean composition**, semantic zoom, edge bundling, **PSN-leg-state heatmap** |
| Obsidian patterns (NEW in R4) | — | — | — | Smart Connections, Dataview, Templater, JSON Canvas, **Obsidian → tribal bridge** |

R1+R2+R3+R4 combined inventory: **~150 specific systems** across **9 functional layers**. Should be the canonical "what could we add" reference for the next 18 months of RGS planning.

---

## §10 — How this maps to RGS

R4's top-10 fold into a new envelope `PSN-DEEP-STACK-R4-MS0` (10 phases). Suggested phase ordering by time-to-first-value:

1. **`scripts/lib/nn-training-recipe.mjs`** — pin standard NN recipe (1 day)
2. **PSN-leg-state heatmap overlay** in /system-viz (2 days)
3. **Per-roost transparency + Boolean composition** in /system-viz (2 days)
4. **Obsidian → tribal-embed-index hourly bridge** (3 days)
5. **`prism-agent-patterns-rosetta-stone.md`** doc (3 days)
6. **PRISMVerifiedReasoningEngine** (CoV+RAG+PoT composite) (1 week)
7. **Speculative decoding wiring** (qwen2.5-coder:3b drafts + 7b verifies) (1 week)
8. **GraphRAG over PSN substrate** (2 weeks)
9. **HGT replacing GraphSAGE in NN tier-5** (3 weeks — includes retrain)
10. **Function-Calling Fine-tuning on PRISM dispatchers** (1 month)

Total: ~7-8 weeks for full R4 top-10. The first 5 picks ship in 2 weeks of focused work; pairs perfectly with R3's first 4 picks for compounding.

**Cross-references:**
- [PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md](./PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md) (R1)
- [PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md](./PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md) (R2)
- [PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md](./PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md) (R3)
- [[psn-deep-learning-reasoning-training-substrate]] — data-side substrate (papa 2026-05-25)
- [[college-courses-psn-incorporation]] — course-corpus side (papa 2026-05-25)
- [[deep-reasoning-doctrine]] — 4-tier model ladder
- [[feedback_psn_definition]] — 11-leg PSN map
- [[nn-graph-ms0]] — GraphSAGE tier-5 (the HGT migration target)

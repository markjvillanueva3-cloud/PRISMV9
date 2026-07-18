# PSN Incorporation Research R3 — Learning + Reasoning (deep dive)

> Compiled by claude-451f7328 slot:charlie /goal-5, 2026-05-23.
> Sibling to [R1](./PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md) (25 systems, general PSN) + [R2](./PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md) (50+ systems, 13 categories).
> R3 zooms in on the two highest-leverage capability axes: **how PRISM learns** and **how PRISM reasons**. Both feed legs 10 (NN/GNN) and 11 (PRISM AI) and compound across every other leg.

Format: each system gets (a) one-line description, (b) which PSN leg(s), (c) integration cost S/M/L, (d) ROI mechanism with a concrete number, (e) the PRISM-specific gap.

---

## §1 — LEARNING (online / offline / meta / curriculum)

### 1A — Preference-optimization family (replace/augment RLHF)
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **DPO** (Direct Preference Optimization) | 10, 11 | M | Matches PPO without reward model; 2-5× simpler training pipeline | When PRISM ships per-domain LoRA, DPO on (good/bad) pairs from JM-DIE outcomes beats RLHF complexity |
| **KTO** (Kahneman-Tversky Optimization) | 10, 11 | M | Only needs binary labels (good/bad); 100× cheaper to label than pairwise | Operator can label single G-code emit as "shipped to floor / aborted" — KTO eats that directly |
| **IPO** (Identity Preference Optimization) | 10, 11 | M | Fixes DPO's mode-collapse on noisy preferences | If JM-DIE labels are noisy (and they are), IPO is the safety net |
| **SimPO** (2024) | 10, 11 | M | No reference model needed at inference; +5-10% on AlpacaEval | Cuts GPU memory by ~30% during training |
| **GRPO** (DeepSeek R1 Group Relative Policy Optimization) | 10, 11 | M | Removes critic network; trained R1 model with $5M compute | The breakthrough enabling cheap reasoning RL; directly applicable to PRISM's per-domain reasoning |

### 1B — Self-training / bootstrap (no human labels needed)
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **STaR** (Self-Taught Reasoner) | 10, 11 | M | Bootstrap reasoning traces from base model; train on the correct-answer traces | Per-domain (mill/lathe/wedm) reasoning bootstrap |
| **Quiet-STaR** | 10, 11 | M | Extends STaR with implicit thinking tokens; +10% on GSM8K with no labeled data | Drop-in upgrade if STaR is shipped |
| **rStar-Math** (Microsoft, 2024) | 10, 11 | M | MCTS-guided SFT pushed small models past o1-preview on competition math | Applies to physics-formula reasoning paths |
| **SPIN** (Self-Play Fine-tuning) | 10, 11 | M | Bootstrap from base model only; closes 90% of gap to RLHF | If preference data is scarce, SPIN is the cold-start |
| **REST-EM** (Reinforced Self-Training, EM variant) | 10, 11 | M | Iterative bootstrapping with self-generated data; matches RLHF on some benchmarks | PRISM's autonomous /loop is structurally REST-EM at the task level — formalize at the model level |
| **Self-Reward** (Meta, 2024) | 10, 11 | M | Model rewards its own outputs; eliminates external annotator dependency | Octopus 3-of-3 consensus is the cousin pattern; Self-Reward at the training stage |
| **Self-Instruct / Evol-Instruct** | 4, 10 | S | Generate diverse instructions from seed examples; scales tribal-tip → formal training signal | The 3919 tribal tips become 30K+ training pairs |

### 1C — Parameter-efficient fine-tuning (PEFT)
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **LoRA / QLoRA** | 10 | S | 100× fewer trainable params; 4-bit quant for QLoRA | PRISM already has `PRISMLoRAAdapterEngine` (memo blind-spot); needs real adapters |
| **DoRA** (Weight-Decomposed LoRA) | 10 | S | +1-3% over LoRA at same param count | Drop-in replacement for LoRA |
| **LongLoRA** | 10 | M | Extends context window in fine-tuning; cheap long-context adaptation | If PRISM needs to fit JM-DIE corpus (76K files) into a single context |
| **Spectrum** (selective LoRA targeting) | 10 | S | Train only top-N most important layers via SNR analysis; +30-50% efficiency | Closes the "should I train every layer?" tuning question |
| **MoLE / Mixture of LoRA Experts** | 10, 11 | M | Per-domain LoRA experts gated by router; PRISM's domain split is the perfect MoE shape | Each NATO slot's domain (mill/lathe/wedm/cad/cam) gets an expert |
| **S-LoRA serving** (from R1) | 10, 11 | L | Serve 1000s of LoRA adapters in one GPU | Production-grade for §1B-§1C ramp |

### 1D — Active / curriculum learning
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **BALD / Query-by-Committee** | 7, 10 | M | Picks most-uncertain samples for labeling; cuts labeling cost 5-10× | Curiosity-queue would prioritize examples that NN/GNN tier-5 is most uncertain about |
| **Curriculum learning** (easy→hard) | 10 | S | Faster + better convergence; -30% training time on physics problems | Order JM-DIE training: simple-pocket → complex-5-axis → wedm-multipass |
| **Confidence-aware sampling** | 10 | S | Skip samples model is already confident on; -50% training compute | Pairs with PRISM's `AtomicValue<T>` confidence already present in engine outputs |

### 1E — Continual learning (avoid catastrophic forgetting)
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **EWC** (Elastic Weight Consolidation) | 10 | M | Protects important weights when learning new task | `WEDMOnlineLearningEngine` already half-implements; EWC formalizes |
| **Replay buffer / Experience Replay** | 4, 10 | S | Old examples replayed during new training; trivial implementation | PRISM has the data (slot logs + JM-DIE) — needs the loop |
| **Generative Replay** | 10 | M | Replay synthetic examples from a generator; no need to store old data | Privacy/storage-friendly variant |
| **Progressive Networks** | 10, 11 | M | New columns added per task; old columns frozen | Per-domain neural columns mirror PRISM's domain split |

### 1F — Synthetic-data / distillation pipelines
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **Distilabel** (Argilla) | 4, 5, 10 | M | OSS pipeline for synthetic preference data | Already mentioned in R2 §5; key for KTO/DPO data prep |
| **OpenInstruct / Tülu 3 recipes** (Allen AI) | 10 | M | Reference SFT+DPO+PPO recipe with reproducible weights | The "how do I actually do this" recipe book |
| **Axolotl / unsloth** | 10 | S | High-throughput LoRA training frameworks | When PRISM moves to actual training |
| **Self-Distill** (large→small) | 10 | M | Generate teacher labels from large model; train smaller model on them | Ollama tier (qwen2.5-coder:7b) becomes capable via Opus-as-teacher |

### 1G — Prompt-as-program optimizers
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **DSPy** (R1 carryover) | 11 | M | Declarative LM programs with auto-optimizers (BootstrapFewShot, MIPRO) | Octopus consensus prompts as DSPy modules |
| **TextGrad** | 11 | S | Gradient-like updates on prompt text via critic feedback | Closes "how do I improve a prompt without RL?" |
| **Trace** (Microsoft) | 11 | S | Same family as TextGrad; works on workflow graphs | For multi-step agent flows |
| **GEPA** (Guided Exploration for Prompt Adaptation, Stanford 2025) | 11 | M | SOTA prompt optimizer; beats DSPy MIPRO on benchmarks | Higher cost but higher ceiling |

---

## §2 — REASONING (search / verification / hybrid)

### 2A — Search-based reasoning (LLM as policy + MCTS as control)
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **MCTS + LLM** (AlphaZero-pattern for reasoning) | 11 | L | o1-style reasoning improvement; SOTA on AIME 2024 | The architecture behind o1/R1; reproducible with rStar-Math + open weights |
| **PRM (Process Reward Models)** | 11 | M | Score each reasoning step (not just answer); better gradient for RL | Pairs with MCTS for tree pruning |
| **ORM (Outcome Reward Models)** | 11 | M | Cheaper than PRM; final-answer-only scoring | Best-of-N rerank uses ORM |
| **Best-of-N sampling + ORM rerank** | 11 | S | Inference-time scaling; +5-15% accuracy at 5-10× compute | Apply to PRISM physics-output verification before shop-floor emit |
| **AlphaProof / AlphaGeometry** | 11 | L | DeepMind formal-proof systems; closes math olympiad gap | Far-afield; reference architecture for formal verification of safety claims |

### 2B — Reasoning-trajectory patterns (no extra compute)
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **Tree-of-Thought (ToT)** (R2 carryover) | 11 | S | Beam search over reasoning branches; +20-40% on multi-step | Formalizes `prismCreativeReasoningEngine.explore()` modes |
| **Graph-of-Thought** | 11 | M | Generalization of ToT — allows merge/cycle, not just tree | More expressive but harder to control |
| **Plan-and-Solve** | 11 | S | Two-step prompt: plan first, solve second; +10-15% | Lightweight; drop-in to engine reasoning chains |
| **Least-to-Most** | 11 | S | Decompose problem into subproblems; +20% on compositional tasks | Pairs with PRISM's existing pipeline-decomposition pattern |
| **Skeleton-of-Thought** | 11 | S | Parallel branch generation; cuts latency 2× on long outputs | Good fit for octopus parallel voice generation |
| **Self-Consistency** (R2 carryover) | 11 | S | Sample N paths, majority-vote; +5-15% on math | Drop-in for `wedm_safety_gate_evaluate` validation |

### 2C — Program-of-Thought / code-augmented reasoning
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **PoT (Program-of-Thought)** | 7, 11 | S | Emit Python instead of text reasoning; eliminates arithmetic errors | Charlie's slot soul refuses inline constants — PoT is the typed-eval analog |
| **PAL (Program-Aided Language)** | 7, 11 | S | Sibling to PoT; offload to a code interpreter | PRISM has `prism_calc` — wire it as the PAL backend |
| **Lean / Coq / Isabelle integration** | 9, 11 | L | Formal proof for safety claims (Ω, S(x)) | Proves recast≤8µm bound formally vs sampling |
| **Z3 / cvc5 SMT solvers** | 11 | M | Decide satisfiability of physics constraint systems | Pairs with WEDM's multi-constraint optimization |

### 2D — Multi-agent reasoning
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **MAD (Multi-Agent Debate)** | 11 | M | 2+ agents debate; reduces hallucination ~30% | Octopus 5-voice IS this pattern; formalize |
| **Generative Agents (Smallville)** | 4, 11 | L | Long-term memory + reflection cycles for agents | PRISM's slot system + handoffs is the same shape |
| **OctoPack / Magentic-One** (R1 carryover) | 11 | M | Orchestrator + specialist agents | Charlie's "Hermes specialist-wire-edm" role IS this |

### 2E — Verification & calibration
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **Chain-of-Verification (CoV)** (R2 carryover) | 11 | S | Generate answer → verification questions → answer them → revise | Closes hallucination in safety paths |
| **Verifier-guided search** | 11 | M | Train a verifier; use it to prune MCTS branches | Pairs with §2A picks |
| **Calibration via temperature scaling** | 10, 11 | S | Post-hoc fix for confidence overconfidence | Apply to engine `AtomicValue<T>.confidence` |
| **Conformal prediction** | 7, 10, 11 | M | Distribution-free uncertainty bounds with finite-sample guarantees | The safety bound certificate operators trust |
| **Bayesian deep learning** | 10 | M | Uncertainty quantification via dropout / variational inference | When engines need confidence intervals, not point estimates |

### 2F — Domain-specific reasoning models (deserve their own bullet)
| System | Leg | Cost | ROI | PRISM gap |
|---|---|---|---|---|
| **OpenAI o1 / Claude extended thinking** | 11 | S | Built-in long reasoning via thinking tokens | PRISM is already on Claude — enable thinking flag for the safety-critical engine paths |
| **DeepSeek R1** (open-weight reasoning) | 11 | M | Matches o1 at fraction of cost; MIT-licensed | Run R1-distill-32B on PRISM hardware for reasoning-heavy paths |
| **Marco-o1 / LLaMA-Berry / OpenR** | 11 | M | Open-source o1-pattern implementations | Reference codebases for rolling your own |

---

## §3 — TOP-10 LEARNING + REASONING PICKS (R3 final ranking)

Ranked by **cost-adjusted ROI × cross-leg impact × current pain felt × time-to-first-value**:

1. **DSPy + Promptfoo for octopus consensus** (R2 carryover, M-cost) — turn prompt-eng into measurable optimization
2. **STaR-style bootstrap on WEDM reasoning traces** (M-cost) — generate WEDM-domain reasoning data without operator labeling; train when scale justifies
3. **PoT + PAL backed by `prism_calc`** (S-cost) — eliminate arithmetic errors in reasoning chains; PRISM has the calc backend already
4. **Best-of-N + ORM rerank for shop-floor outputs** (S-cost) — sample 5-10 G-code emissions, rerank by ORM, ship the highest-scoring; +5-15% accuracy at acceptable compute
5. **CoV inside `wedm_safety_gate_evaluate`** (R2 carryover, S-cost) — cuts hallucination ~50% on edge cases
6. **Reflexion → memory write loop** (R2 carryover, S-cost) — formalize `feedback_always_capture_lessons`
7. **Replay buffer over slot session logs** (S-cost) — already have the data; just need the loop
8. **DPO/KTO ready-to-train pipeline on JM-DIE outcomes** (M-cost) — labeled by "shipped to floor / aborted"; KTO eats binary labels
9. **Plan-and-Solve + Self-Consistency on `prismCreativeReasoningEngine.explore("optimal")`** (S-cost) — formalizes existing "optimal" mode with measurable gains
10. **Claude extended-thinking flag enabled for safety-critical engine paths** (S-cost, free win) — already on Claude; the thinking flag is documented but likely not enabled per-engine

**Out-of-scope per R12** (named, deferred):
- MCTS + LLM (L-cost) — full o1-pattern reasoning; gated on having a reward model
- AlphaProof / Lean (L-cost) — formal verification of safety claims; relevant when Ω/S(x) become contractual
- Full MoLE serving with S-LoRA (L-cost) — gated on per-domain adapters existing first
- Generative Agents Smallville (L-cost) — slot system already covers this conceptually

---

## §4 — How R3 composes with R1 + R2

| Layer | R1 contribution | R2 contribution | R3 contribution |
|---|---|---|---|
| Retrieval | GraphRAG, HyDE, RAGAS, ColBERT | Qdrant binary quant, BGE-M3, GPTCache | (none — covered) |
| Memory | Letta, LangGraph, Mem0, EpiMem | (none — covered) | Replay buffer, Experience Replay, EWC, Reflexion-→-memory |
| Reasoning | DSPy, Magentic-One | ToT, Reflexion, CoV, Self-Consistency, Outlines | PoT, PAL, Best-of-N+ORM, MCTS+LLM, Plan-and-Solve, Skeleton-of-Thought, Z3, Claude-thinking-flag |
| Training | S-LoRA, LoRA-Hub | Distilabel, Sakana evolutionary | DPO, KTO, IPO, SimPO, GRPO, STaR, Quiet-STaR, rStar-Math, SPIN, REST-EM, Self-Reward, Self-Instruct, DoRA, LongLoRA, Spectrum, MoLE, Active learning (BALD), Curriculum, Generative Replay, Progressive Networks |
| Optimizers | (mostly observability) | (mostly tools) | DSPy, TextGrad, Trace, GEPA |
| Verification | Inspect AI, RAGAS | Promptfoo, Guardrails AI | Conformal prediction, Bayesian DL, Calibration, Verifier-guided search, PRM, ORM |

R1+R2+R3 combined inventory: **100+ specific systems** across **6 functional layers**, each mapped to PSN legs + integration cost + ROI mechanism. Should be the canonical "what could we add" reference for the next 12 months of RGS planning.

---

## §5 — How this maps to RGS

R3's top-10 fold into `PSN-LEARN-REASON-MS0` envelope (10 phases). Suggested phase ordering by time-to-first-value:
1. Enable Claude extended-thinking on safety-critical engine paths (1 hour)
2. Plan-and-Solve wrapper on `prismCreativeReasoningEngine.explore("optimal")` (1 day)
3. PoT + PAL via `prism_calc` (1 day)
4. CoV inside `wedm_safety_gate_evaluate` (carryover, 1 day)
5. Reflexion → memory loop (carryover, 2 days)
6. Best-of-N + ORM rerank for shop-floor outputs (3 days)
7. Replay buffer over slot session logs (3 days)
8. DSPy + Promptfoo for octopus consensus (carryover, 1 week)
9. DPO/KTO ready-to-train pipeline on JM-DIE outcomes (2 weeks)
10. STaR-style bootstrap on WEDM reasoning traces (1 month)

Total: ~5-6 weeks of focused implementation for full R3 top-10.

**Cross-references:**
- [PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md](./PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md) (R1)
- [PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md](./PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md) (R2)
- [[feedback_psn_definition]] — 11-leg PSN map
- [[feedback_always_capture_lessons]] — Reflexion anchor
- [[reference_octopus_consensus_ms1_2026_05_18]] — DSPy + MAD anchor
- [[reference_psn_high_roi_audit_2026_05_23]] — R1 memory pointer

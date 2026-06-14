# PSN Incorporation Research — Round 2 (what else, high-ROI, across-the-board)

> Compiled by claude-451f7328 slot:charlie /goal-4, 2026-05-23.
> Sibling to [PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md](./PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md). R1 covered 25+ systems (Letta/GraphRAG/HyDE/RAGAS/Neo4j+GDS/PyG/S-LoRA/DSPy/CrewAI/Inspect AI/Langfuse). R2 covers the categories R1 missed.

PSN = 11-leg synergy per `feedback_psn_definition`. "High-ROI across the board" = touches ≥3 legs OR cuts per-call token/latency ≥30% OR unlocks a previously dormant capability.

Each category names: (a) 2-5 specific candidate systems, (b) which PSN leg(s) they enhance, (c) integration cost (S/M/L), (d) the ROI mechanism with a concrete number, (e) the PRISM-specific gap it would close.

---

## §1 — Reasoning / planning patterns (new in R2)

R1 missed the reasoning-pattern layer entirely. These are prompting + control-flow techniques, not external systems — virtually zero infra cost.

| System | Leg | Cost | ROI mechanism | PRISM gap closed |
|---|---|---|---|---|
| **Tree-of-Thought (ToT)** | 11 | S | Beam-search over reasoning branches; +20-40% on multi-step problems | `prismCreativeReasoningEngine.explore()` modes (conventional→optimal) overlap — ToT formalizes the search structure |
| **Reflexion** | 4, 11 | S | Agent reflects on failure, stores lesson in memory, retries; +30% Pass@1 on coding | `feedback_always_capture_lessons` already half-implemented — Reflexion is the canonical loop |
| **Self-Consistency** | 11 | S | Sample N reasoning paths, vote on answer; +5-15% on math/physics | Charlie's `wedm_safety_gate_evaluate` could vote across N runs before HARD-BLOCK |
| **Chain-of-Verification (CoV)** | 11 | S | Generate answer → generate verification questions → answer them → revise; cuts hallucination ~50% | Octopus 3-of-3 scrutiny gate is CoV's pattern at code-review level; CoV inside engines would catch physics bugs upstream |
| **Self-Refine** | 11 | S | Critic agent iterates on first draft; quality lift ≈ DSPy MIPRO at 1/10 cost | Could wrap engine outputs before they reach safety gates |

**R2 pick:** Reflexion + CoV are highest-ROI. Both have clean integration paths into existing infra (memory + scrutiny gate). Estimated cost: 1 unit each.

## §2 — Tool-use & function-calling upgrades

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **Toolformer-style self-augmentation** | 7, 11 | M | Engine inserts tool-call markers in its own context; +15% accuracy on tool-heavy tasks | Engines are tool consumers but not tool composers — would let an engine decide MID-execution to call sibling engine |
| **Gorilla** (function-calling LLM, retrieval-grounded) | 7, 11 | M | Picks correct function from huge catalogs without hallucinating signatures; PRISM has ~600 MCP actions — exactly Gorilla's use case | `aiSystemRouterEngine` does this but with handwritten rules; Gorilla replaces with learned routing |
| **ReWOO** (Reasoning Without Observation) | 11 | S | Plan all tool calls upfront, then batch-execute; cuts LLM calls 5× | The 4 PreToolUse graph hooks already batch context injection — ReWOO at the planning layer would batch tool execution |
| **Outlines / Instructor** (constrained decoding) | 7, 11 | S | JSON-schema-constrained generation; zero schema-violation errors | PRISM's Zod schemas would auto-generate Outlines schemas; eliminates "engine returned invalid envelope" class of bug |

**R2 pick:** Outlines + Gorilla. Outlines is essentially free + eliminates a bug class; Gorilla closes the routing-by-handwritten-rules gap.

## §3 — Code-specific agent patterns (NEW R2)

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **Aider's repo-map** | 6, 7 | S | Token-budgeted file/symbol map auto-prefixed to every query; +30% PR-quality on SWE-bench | PRISM has `master-index-precheck-inject` (top-5 hits); Aider's tree-of-symbols ranked by PageRank-on-call-graph would be denser |
| **OpenDevin / SWE-agent ACI** (Agent-Computer Interface) | 7 | M | Specialized file-edit/grep/run primitives tuned for LLM affordances; +50% on SWE-bench Lite | PRISM's tool surface is generic (Read/Edit/Grep/Bash); a tuned ACI for the slot system would shorten loops |
| **Cursor's tab-prediction model** | 7 | L | Sub-second next-edit prediction trained on session history | Far afield — but the data PRISM accumulates per slot could train one |
| **Continue.dev (open-source Cursor)** | 7 | M | OSS code-completion infra with custom-model backends | Slot-chats are already this pattern; Continue's serving layer is the production-grade ramp |

**R2 pick:** Aider repo-map style densification of `master-index-precheck-inject`. Adds PageRank-weighted symbol ranking. Cost: 1 unit.

## §4 — Manufacturing/physics-specific AI (PRISM's actual domain — R1 missed entirely)

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **NVIDIA Modulus** (physics-informed neural networks) | 7, 9, 10 | L | PINN training for FEM surrogates; 100-1000× faster than FEM at inference | `WEDMThermalFieldEngine` (FEM) is exactly this use case — Modulus could ship a surrogate in 1 week |
| **Sakana AI evolutionary model merging** | 7, 10, 11 | M | Evolutionary search over LoRA combinations; outperforms hand-tuned merges | When PRISM ships per-domain LoRA adapters, Sakana picks the merge |
| **NVIDIA Omniverse digital twin** | 2, 6 | L | Real-time physics-accurate machine simulation | The "Cowork mode" connectors hint at this; Omniverse is the production-grade target |
| **CFD surrogates (DeepMind GraphCast pattern)** | 9, 10 | L | Graph-NN replaces CFD for repeated geometries | Coolant-flush optimization for WEDM is currently empirical; GNN surrogate trained on shop data would crush hand-tuning |
| **CLIP for blueprint OCR** | 6, 7 | M | Vision-language model for ITAR-flagged drawings; 80%+ accuracy on engineering blueprints (vs Tesseract 30-50%) | `WEDMDwgImportEngine` (charlie /goal-2 close-out) handles DWG; blueprint PDF/PNG OCR is a separate gap |
| **SAM (Segment Anything)** for CAD segmentation | 6, 7 | M | Auto-segment features from solid models | Feature recognition currently handcoded per format |

**R2 pick:** Modulus for `WEDMThermalFieldEngine` surrogate (closes a known compute bottleneck) + CLIP for blueprint OCR. Both are domain-correct and have measurable lift.

## §5 — Distillation, quantization, model-compression (for Ollama tier)

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **GPTQ / AWQ / SmoothQuant** | 11 | S | 4-bit quantization with <1% accuracy loss; doubles Ollama context fit | Current `qwen2.5-coder:7b` could fit alongside `:14b` for tiered local inference |
| **Speculative decoding** | 11 | S | Smaller draft model proposes tokens; bigger model verifies; 2-3× latency cut | Ollama supports it natively (since 0.4); PRISM doesn't enable it |
| **Distilabel** (synthetic data flywheel) | 4, 5, 10 | M | Generate synthetic training pairs from PRISM's logs; feeds LoRA training | The 76K JM-DIE corpus + slot session logs are already the substrate |
| **BGE-M3 embeddings** (vs current model) | 3, 4, 6 | S | Multi-functional embeddings (dense + sparse + multi-vec) in one model; +5-15% retrieval recall | Current embeddings are likely single-vec; M3 is drop-in |
| **Voyage-3 / Cohere v3 embeddings** | 3, 4, 6 | S | Commercial-grade retrieval; +10-20% over open-source baselines | API-cost vs accuracy trade — only relevant if open-source plateau is hit |

**R2 pick:** Enable Ollama speculative decoding (free 2-3× latency) + BGE-M3 swap (drop-in recall lift). Both essentially zero-touch.

## §6 — Workflow / durable-execution engines

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **Temporal** | 2, 11 | L | Workflow durability with first-class retry/timeout/saga semantics | PRISM has hand-rolled `/loop` state + slot-task-claims; Temporal is the production-grade equivalent |
| **Inngest** | 2 | M | Event-driven background jobs with TS-native API | Lighter than Temporal; closer match to current Node ecosystem |
| **DBOS** | 2 | M | Database-native durable execution (Postgres) | Aligns with PRISM's existing Postgres surface |
| **Trigger.dev** | 2 | M | TypeScript workflows + UI dashboard | Visual debugging story for the autonomous /loop |

**R2 pick:** Inngest. Smallest disruption, biggest immediate value — converts the fragile `loop-state.mjs` JSON into proper durable execution.

## §7 — Vector DB / retrieval infrastructure

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **Qdrant 1.13 binary quantization** | 3, 4, 6 | S | 32× memory reduction with <2% recall loss | PRISM has Qdrant; just turn on quantization on the wiki index |
| **Vespa** | 3, 4, 6 | L | Streaming + hybrid search at billion-doc scale | Overkill until corpus >> wiki+memory |
| **Milvus 2.5 RaBitQ** | 3, 4, 6 | M | 1-bit quantization — PRISM already has a RaBitQ implementation in `embeddings_rabitq_build` | This is the path of least resistance — PRISM is ALREADY here |
| **txtai** | 3, 4, 6 | S | Lightweight embeddings + RAG stack; trivial deployment | Useful for tribal-knowledge sub-index |
| **LlamaIndex's PropertyGraphIndex** | 3, 4, 6 | M | Mixed property-graph + vector retrieval | The wiki+memory cross-reference graph fits this exactly |

**R2 pick:** Turn on Qdrant binary quantization (≈30 minutes) + verify RaBitQ is wired everywhere it could be.

## §8 — Observability & evaluation (R1 covered Inspect AI, LangSmith — adding more)

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **OpenLLMetry** | 11 | S | OpenTelemetry-standard LLM traces; vendor-neutral | Future-proofs the trace layer if LangSmith vendor lock becomes painful |
| **Phoenix (Arize)** | 11 | S | Open-source LLM observability + dataset eval | Direct alternative to LangSmith; OSS |
| **Promptfoo** | 11 | S | YAML-based regression tests for prompts | Already partially what the scrutiny ledger does; Promptfoo formalizes |
| **Trubrics** | 11 | M | User feedback collection for model improvement | When PRISM has end-users beyond charlie+peers |
| **Guardrails AI** | 11 | M | Schema + ML-based output validators; programmable rails | Replaces hand-rolled `comprehensive-build-enforce` Stop hook |

**R2 pick:** Phoenix for OSS observability + Promptfoo for prompt regression tests.

## §9 — Safety / privacy / prompt-injection defense

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **LlamaFirewall (Meta)** | 11 | M | Multi-layer prompt-injection + jailbreak defense | PRISM has implicit safety from being closed-system; firewall is needed if Cowork mode exposes connectors |
| **NeMo Guardrails (NVIDIA)** | 11 | M | Declarative dialog rails; programmable safety | Engineering-grade safety for engine outputs before they reach the shop floor |
| **Prompt Shield (Azure)** | 11 | M | Pre-built injection detection | Drop-in if PRISM ever takes operator-untrusted input |
| **Constitutional AI / DPO fine-tuning** | 10, 11 | L | Train models to refuse unsafe outputs without RLHF | Far afield until PRISM does its own training |

**R2 pick:** NeMo Guardrails — fits PRISM's shop-floor-safety doctrine (Ω≥0.95, S(x)≥0.98) better than generic prompt firewalls.

## §10 — Caching / latency infrastructure

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **GPTCache** | 11 | S | Semantic cache for LLM calls; 30-70% hit rate on repeat queries | PRISM has Anthropic prompt cache + Ollama keep-alive — semantic cache LAYER above both would compound |
| **Redis Vector + Stream** | 3, 4, 6 | S | Hot path for repeated retrievals | The chat-bus is already Redis-shaped; vector + stream on top is incremental |
| **LiteLLM** | 11 | S | Unified API for model routing + cost tracking | `aiSystemRouterEngine` does this; LiteLLM standardizes |

**R2 pick:** GPTCache as a sidecar on Ollama calls. 30-70% hit rate on the wiki/memory injectors translates to 1.5-3× speedup.

## §11 — Multi-modal / vision (PRISM's blueprint + CAD substrate)

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **CLIP + variants (SigLIP, OpenCLIP)** | 6, 7 | M | Engineering blueprint → vector embedding | OCR'd blueprints are currently text-only; CLIP captures geometry semantics |
| **SAM 2.1** (Segment Anything) | 6, 7 | M | Auto-segment CAD features | Feature recognition is currently rule-based per format |
| **Florence-2** (Microsoft, vision-language) | 6, 7 | M | Dense captioning + grounding for diagrams | Pairs with CAD OCR + tribal knowledge for "what is this feature?" |
| **GOT-OCR2.0** | 6 | S | State-of-art for engineering drawing text extraction | Direct replacement for Tesseract in `WEDMDwgImportEngine` adjacent flows |

**R2 pick:** GOT-OCR2.0 for blueprint text + SAM 2.1 for CAD feature segmentation. Pairs with §4's CLIP pick.

## §12 — State sync / coordination (the 5 concurrent-staging collisions this session expose this gap)

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **Yjs / Automerge CRDTs** | 2 | M | Merge concurrent edits without locks; same shape as multi-slot envelopes | Charlie session hit 5 concurrent-staging collisions; CRDT would eliminate the class |
| **Postgres LISTEN/NOTIFY** | 2 | S | Database-native pub/sub for slot coordination | Lighter than CRDT for purely-status-flag use case |
| **etcd / Consul** | 2 | M | Distributed locks with proper leases | Replaces file-lock semantics with battle-tested infra |
| **Cloudflare Durable Objects** | 2 | L | Strong-consistency per-object compute | Future fit if PRISM goes cloud |

**R2 pick:** Yjs for envelope merging — directly closes the 5-collision session bug. High pain, low cost.

## §13 — Compiler / runtime acceleration

| System | Leg | Cost | ROI mechanism | PRISM gap |
|---|---|---|---|---|
| **TorchDynamo + Triton** | 7, 9, 10 | L | JIT compile hot Python numeric paths | Far afield (PRISM is Node, not Python) — relevant only if NN tier matures |
| **Bun runtime** | 2 | M | 2-3× faster Node-equivalent for the MCP server | High-risk migration; defer |
| **WASM-compiled hot paths** | 7, 9 | M | Some PRISM physics engines could compile to WASM | If/when web frontend grows |

**R2 pick:** Skip — none are immediate-ROI for PRISM's current bottleneck (LLM latency, not compute).

---

## §14 — TOP-10 cross-the-board PSN incorporations (R2 final ranking)

Ranked by **cost-adjusted ROI × number of legs improved × pain currently felt**:

1. **Outlines / Instructor (constrained decoding)** — eliminates a bug class across leg 7 + 11; S-cost; ~1 unit
2. **Reflexion loop wired into memory writes** — formalizes the `feedback_always_capture_lessons` doctrine; leg 4 + 11; S-cost
3. **Yjs CRDT for envelope merging** — closes the 5-collision session bug; leg 2; M-cost
4. **HyDE wrap on `memory-relevance-inject` + `wiki-precheck-inject`** (carried from R1) — +10-20% recall across legs 3, 4, 5, 6; S-cost
5. **Aider-style repo-map densification of `master-index-precheck-inject`** — PageRank-weighted symbol ranking; leg 6 + 7; S-cost
6. **GPTCache semantic cache on Ollama calls** — 1.5-3× speedup on hot injectors; leg 11; S-cost
7. **Ollama speculative decoding + BGE-M3 embedding swap** — free latency cut + recall lift; leg 11 + legs 3, 4, 6; S-cost
8. **Qdrant binary quantization on wiki index** — 32× memory cut, <2% recall loss; legs 3, 4, 6; S-cost
9. **Chain-of-Verification inside `wedm_safety_gate_evaluate`** — cuts physics-hallucination ~50% on edge cases; leg 9 + 11; S-cost
10. **Phoenix (Arize) + Promptfoo for prompt regression** — OSS observability; leg 11; S-cost

**Total estimated cost for 1-10: ~10-12 units, all S-M.** Estimated ROI compounding across all 11 PSN legs:
- Token cost cut: 30-50% on hot injector calls (HyDE + GPTCache + binary quant)
- Latency cut: 2-3× on Ollama-routed work (speculative decoding + GPTCache)
- Bug-class elimination: 2 classes (schema violations via Outlines; concurrent-staging collisions via Yjs)
- Recall lift: +10-30% across all retrieval injectors
- Hallucination cut: ~50% inside safety-critical engine paths (CoV)
- Cross-session learning loop: formalized (Reflexion → memory → next-session inject)

---

## §15 — Higher-cost ambitious targets (deferred per R12, named)

- **NVIDIA Modulus PINN for WEDMThermalFieldEngine** — L-cost, 100-1000× inference speedup; charlie's natural domain
- **NeMo Guardrails for shop-floor output rails** — M-cost, formalizes Ω≥0.95 doctrine
- **Sakana AI evolutionary LoRA merging** — M-cost, gated on PRISM having per-domain adapters
- **OpenDevin ACI for slot agents** — M-cost, +50% on SWE-bench-equivalent tasks
- **NVIDIA Omniverse digital twin** — L-cost, the production endgame for cowork-mode

---

## §16 — How this maps to RGS

§14's top-10 are pre-shaped roadmap units. Suggested envelope: `PSN-INCORP-R2-MS0` with 10 phases (one per pick). Phase ordering: 1→2→4→6→7→8→9→10→3→5 (cheapest/highest-pain first; Yjs is mid-tier because of its 1-day implementation budget despite high pain).

**Cross-references:**
- [PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md](./PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md) — R1 spec (Letta, GraphRAG, RAGAS, etc.)
- [[feedback_psn_definition]] — 11-leg canonical PSN map
- [[reference_hermes_psn_rag_synergy_research_2026_05_23]] — bravo's adjacent Hermes×PSN×RAG research
- [[reference_psn_high_roi_audit_2026_05_23]] — R1 memory pointer
- [[feedback_always_capture_lessons]] — Reflexion's natural anchor
- [[reference_session_continuity_stack_2026_05_15]] — where Yjs would integrate

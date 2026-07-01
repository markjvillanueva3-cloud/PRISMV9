# lora + ai-systems

## lora + ai-systems

Scope note: searched 523 topic-matching transcripts under `C:/Users/wompu/.claude/projects/H--prism/*.jsonl` (ripgrep, line-scoped — never full-read), the full article corpus at `H:/prism/state/shared/articles/`, the wiki at `H:/prism/knowledge/wiki/`, and ~40 ai-training memories. The densest single thread is india session `7bfff7a4-521b-41bc-9719-fe5a0f593d86` (the LoRA-galaxy-synthesis + AI-systems-survey session).

### Source articles the operator submitted (URL + 1-line each)
Operator-pasted URLs that relate to LoRA / fine-tuning / AI-systems (extracted from transcript bodies — these are the "articles I've submitted"):
- `https://appscale.blog/en/blog/llm-fine-tuning-lora-qlora-full-fine-tuning-compared-2026` — **the primary LoRA article**: LoRA vs QLoRA vs DoRA vs Full fine-tuning compared (2026); fetched + analyzed in india session `7bfff7a4`.
- `https://arxiv.org/abs/2106.09685` — the original **LoRA paper** (Hu et al., low-rank adaptation).
- `https://arxiv.org/abs/2005.11401` — **RAG** (Lewis et al., retrieval-augmented generation).
- `https://arxiv.org/abs/1603.09320` — **HNSW** (Malkov & Yashunin, approximate-NN graph index — PRISM's embedding store).
- `https://apidog.com/blog/use-kimi-k2-6-free/` — **Kimi K2.6** (operator's "wire in kimi2.6"; resolved CLOUD-ONLY).
- `https://x.com/i/article/2056154476549931008` and `.../2056643638202187776` — operator X long-form articles (login-walled; only IDs captured, content not recoverable from transcripts — R12: cannot cite their claims).
- Tangential AI-systems articles pasted same period: `agentpedia.codes/blog/karpathy-claude-code-skills-guide`, `artemxtech.substack.com/p/i-stopped-teaching-my-agent-who-i` (the Obsidian self-learning-loop equiv capture), `api.fxtwitter.com/{cyrilXBT,0x_rody,akshay_pachaar,PawelHuryn,tetsuoai}/status/...` (agentic/second-brain threads, not strictly LoRA).

The operator's load-bearing directive on this topic (verbatim from `7bfff7a4`): **"read all previous x articles regarding ai training, ai systems, rag, cag then determine if we covered everything"** and an expanded `/goal` to **"improve our ai systems across [14 galaxies]; enhance each to theoretical max; synergize all combinations; wire all to master brain."**

Honest gap: no `x.com/twitter/substack` URL was found in transcripts that is *uniquely* a LoRA article — the AppScale blog + the arxiv papers are the concrete LoRA-specific sources. The X article IDs above are unrecoverable.

### Key techniques / claims (the actual ideas, terse bullets)
From the AppScale article + arxiv sources as analyzed in-transcript:
- **LoRA**: freeze base weights, train low-rank adapter matrices (rank r, scaling alpha) on `target_modules`; ~0.1–1% of params trained.
- **QLoRA**: base model **4-bit quantized (nf4/bitsandbytes)**, dynamically dequantized per-op during fine-tune → fits ≤32B on a single 96GB GPU; the recommended PRISM path for ≤32B targets.
- **DoRA / AdaLoRA / VeRA**: weight-decomposed LoRA, rank-adaptive allocation, vector-based random-projection variants — successively cheaper/more-targeted adapters.
- **Full FT vs LoRA/QLoRA tradeoff**: full FT = max quality + catastrophic-forgetting + huge VRAM; LoRA/QLoRA = near-parity at a fraction of cost, composable multi-adapter, no base mutation.
- **Promote-gate must be GENERATIVE, not classification AUROC**: a LoRA win is proven by exact-match / **BLEU / pass@k** on a held-out G-code set + an **S(x) ≥ 0.95** safety floor + regression check — never an AUROC number.
- **GPU fixes the compute wall, not the data wall**: adapter quality is gated by labeled-corpus growth; you can't fine-tune your way past a missing reference pool.
- **Local-train stack reality (Blackwell)**: training needs a dedicated **Python 3.13** venv (torch 2.11+cu12x, bitsandbytes, PyG/DGL, Unsloth Blackwell) — Ollama is inference-only (no backward pass); Python 3.14 portable has CPU-only wheels.

### How PRISM already applies this (verified file paths)
- **~95 live LoRA engines** (Glob-verified live today: `ls mcp-server/src/engines/ | rg -i LoRA` = **95**) — incl. `AdaLoRARankAllocatorEngine.ts`, `OrthogonalLoRAEngine`, `LoRAMoEGatingEngine`, `FederatedLoRAEngine`, `ContinualLoRAEngine`, `LoRAAdapterRegistryEngine`, `InferenceLoRAGateEngine`, `PRISMLoRAAdapterEngine`, `LatheLoRA*` (~48), `MillLoRA*` (~14), per-domain `{FiveAxis,WEDM,SinkerEDM,Laser,Waterjet,Grinding}LoRA{DatasetBuilder,Cadence}Engine`. Atlas: `mcp-server/src/engines/ai-training/PATHS.md` (verified present), `.../MEMORY.md`, `.../CLAUDE.md`.
- **LoRA-variant audit (in-transcript grep of real code, not filenames)**: QLoRA **0**, DoRA **1**, AdaLoRA **1**, VeRA **10**, LoRA-FA/Delta-LoRA/LoRA+/PiSSA/OLoRA/LoftQ all **0** implemented — i.e. the *named-variant* coverage is shallow vs the *engine-count* breadth.
- **Vault → LoRA training corpus (full chain, live + hardened across all 34 galaxies)**:
  `scripts/vault-to-lora-dataset.mjs` (`--source feedback|galaxy`; 245/247 feedback memories → Alpaca triples; 512 galaxy-synthesis advisory pairs) → `scripts/build-fleet-training-corpus-inventory.mjs` (manifest) → `scripts/assemble-fleet-lora-corpus.mjs` (746 weighted/deduped rows, verified@1.0 / advisory@0.5, galaxy-tagged) → `scripts/lora-dataset-builder.mjs --track-field galaxy` (35 per-galaxy train/val tracks → per-galaxy adapters) → operator GPU fine-tune. Commits `eb262e5675`, `ad120bdf8a`, `85614c3894`, `cd9f80faf8`. Pipeline lib: `scripts/lib/lora-training-pipeline.mjs` (verified present). Memory: `reference_lora_galaxy_synthesis_feeder_2026_06_10.md`, `reference_vault_to_ai_feeders_2026_06_09.md`.
- **Closed-loop / continual learning**: `XProcNeuralAutoFireEngine.activate()` wired at `index.ts:433-434` (outcome→auto-train + experience-replay + **EWC** anti-forgetting, CN09-12); adapter Alpaca schema = `LatheLoRADatasetBuilderEngine.ts` `interface LoRAExample`. Closed-loop adoption audit: `scripts/closed-loop-adoption-audit.mjs` (3/12 galaxies fed: mill/lathe/wedm).
- **Model routing ladder** (already exists — do NOT rebuild): `mcp-server/src/engines/ModelRoutingEngine.ts` (`HardwareProfile="home_blackwell"`, qwen2.5-coder:32b tier).
- **RAG/CAG** (the AI-systems superset the operator named): `scripts/lib/hybrid-retrieval.mjs` (BM25 + Qdrant dense, RRF k=60 Cormack-2009), `utils/reciprocalRankFusion.ts`, `prism_ml:rag_search_rerank`; CAG via `PromptCachingEngine.buildCachedSystem()` + cag-router.
- **GNN tier-5** (PSN leg #10): selective-deploy at AUROC 0.808 / τ=0.7 (`scripts/nn-graph-eval.mjs`), ref-pool fed by `scripts/vault-to-gnn-refpool.mjs`.
- Authoritative specs (verified present): `state/shared/specs/AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md`, `BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md`, `FLEET-AI-SYSTEMS-ROADMAP-2026-06-01.md`. **Stale citation flag (R12):** the older memory cites `mcp-server/src/engines/ai-training/AI-SYSTEMS-IMPROVEMENT-ROADMAP.md` — that path is now **MISSING** (moved/superseded by the dated specs above).

### Gaps / highest-ROI opportunities to ingest more deeply
1. **No LoRA wiki entry exists.** `rg -i lora knowledge/wiki/**/*.md` = **0** files. The 95-engine stack + the full vault→corpus→adapter chain are documented only in memories. **Highest-ROI doc gap** — a `knowledge/wiki/architecture/lora-stack.md` would make the chain queryable by the fleet before re-deriving.
2. **`GalaxyAdapterFactoryEngine.ts` is UNBUILT** (live-verified `ls` = "No such file"). It's the named keystone (P0-6) for collapsing the **67 forked per-domain LoRA engines** into one factory. The breadth is forks, not a real adapter-factory — this is the architecturally-correct consolidation.
3. **Variant coverage is shallow**: QLoRA, DoRA, PiSSA, LoftQ, LoRA+ are **0** implemented in real code despite being the AppScale article's core comparison. QLoRA especially is "provisioned but not wired" (handoff said `torch 2.11+cu128 qlora-ready`). Wiring a real QLoRA train path on the Blackwell GPU is the single highest-leverage adapter improvement.
4. **`OutcomeRLBridgeEngine` wiring is orphaned** + `CrossProcessOutcomeStore.configureStorePath()` has zero production callers → the closed-loop reward signal resets every MCP restart (in-memory ring, cap 10k). A ~1-line `configureStorePath()` before `activate()` makes continual-LoRA learning durable.
5. **The combined LoRA corpus is staged but not trained**: `fleet-lora-combined.jsonl` = 746 rows, `training_ready:false` (needs ≥1000-row floor + the explicit operator GPU fine-tune step). The data pipeline is done; the actual fine-tune run is the missing terminal step.
6. **Unrecoverable operator X articles** (`x.com/i/article/2056154476549931008`, `2056643638202187776`) — login-walled, content not in transcripts. To ingest their LoRA claims, the operator would need to re-capture them as `state/shared/articles/*.md` (the same full-capture pattern already used for the Hermes/Obsidian articles).
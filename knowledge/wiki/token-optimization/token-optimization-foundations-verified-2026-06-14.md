---
name: token-optimization-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the token-optimization galaxy. 7 fetched sources. Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: token-optimization
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# token-optimization galaxy -- verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source below was WebFetched + excerpted (honest `fetched:false` markers for paywalled/unreachable sources). Physics-safe: no numeric cutting constant.

## Synthesis
The 2024-2025 research frontier in LLM token economy converges on three complementary axes: (1) prompt-side compression via hard (extractive, zero-shot, up to 20x ratio) and soft (continuous-embedding, fine-tuned, up to 480x ratio) methods, with LongLLMLingua demonstrating that position-aware compression can simultaneously reduce cost 94% while improving answer quality by eliminating position-bias noise; (2) KV-cache-side optimization via a five-strategy taxonomy (eviction, compression, hybrid memory, novel attention, combinations), with the token-precision Pareto frontier showing that 2-bit quantized pruning dominates either pruning or quantization alone for long-context retrieval; and (3) modular attention reuse via the Prompt Cache paradigm—precomputing and storing KV states for stable shared prefix segments (system messages, templates, injected context) to achieve 8x–60x latency reduction without model modification. End-to-end latent context compression (LCLMs, 350B-token training at 1:4–1:16 ratios) represents the most aggressive frontier, trading domain-generalization risk for maximum compression ratio, while cross-layer KV sharing (PoD, 35% memory reduction) exploits the empirical redundancy of distant-token attention patterns across consecutive transformer layers.

## Verified sources
### [Prompt Compression for Large Language Models: A Survey (arXiv:2410.12388)](https://arxiv.org/abs/2410.12388) -- paper
> "Hard prompts are 'natural language prompts made up of tokens from the vocabulary set of the LLM'; soft prompts are 'trainable, continuous vectors that share the same dimensions as token embeddings.' LLMLingua achieves 'compression ratios up to 20x'; 500xCompressor '6x to 480x.'"

**Knowledge:** Provides a taxonomy splitting prompt compression into hard (token-removal, extractive) and soft (continuous-embedding, generative) methods. Key insight: hard methods preserve human-readability and work zero-shot; soft methods (ICAE, GIST) compress 4x–26x but require fine-tuning. The survey covers attention optimization, PEFT, and synthetic-language perspectives as the four compression mechanism axes—directly applicable to PRISM's context-budget and token-economy layers.

### [LongLLMLingua: Accelerating and Enhancing LLMs in Long Context Scenarios via Prompt Compression (ACL 2024)](https://aclanthology.org/2024.acl-long.91/) -- paper
> "In long context scenarios, LLMs 'face three main challenges: higher computational cost, performance reduction, and position bias.' Achieves 'up to 21.4% performance improvement' on NaturalQuestions and '94.0% cost reduction' on LooGLE benchmark."

**Knowledge:** LongLLMLingua (Microsoft Research, ACL 2024) shows that prompt compression is not merely a cost reduction but can actively improve answer quality by concentrating key-information density. The position-bias finding—that LLM performance degrades when key tokens are mid-context—informs where to preserve tokens in long injections. 2x–6x compression yields 1.4x–2.6x end-to-end latency speedup, directly quantifying PRISM's hook-injection budget ROI.

### [Prompt Cache: Modular Attention Reuse for Low-Latency Inference (MLSys 2024)](https://proceedings.mlsys.org/paper_files/paper/2024/hash/a66caa1703fe34705a4368c3014c1966-Abstract-Conference.html) -- paper
> "'By precomputing and storing the attention states of these frequently occurring text segments on the inference server, we can efficiently reuse them when these segments appear in user prompts.' GPU latency reduced 8x, CPU latency 60x."

**Knowledge:** Prompt Cache (Yale / Google, MLSys 2024) formalizes the concept of reusable prompt modules—system messages, template headers, shared context documents—whose KV attention states are precomputed once and reused across requests. This is the theoretical underpinning for Anthropic's prompt caching feature and the PRISM hook-injection architecture where shared CLAUDE.md / skills headers are injected as stable prefix blocks. The modular schema model maps directly to PRISM's session-continuity stack.

### [KV Cache Optimization Strategies for Scalable and Efficient LLM Inference (arXiv:2603.20397)](https://arxiv.org/abs/2603.20397) -- paper
> "'Efficient KV cache management has thus become a first-order challenge for scalable LLM deployment.' Organizes strategies into five directions: cache eviction, cache compression, hybrid memory, novel attention mechanisms, and combination strategies."

**Knowledge:** Provides a systematic 5-axis taxonomy of KV cache optimization strategies. The key engineering insight for deployers: there is no universal best strategy—optimal approaches vary by context length, GPU memory, and request-mix characteristics. The 'adaptive multi-stage optimization pipeline' recommendation directly mirrors PRISM's fallback-ladder pattern (Ollama -> Sonnet -> Opus) applied to inference-side memory management.

### [More Tokens, Lower Precision: Towards the Optimal Token-Precision Trade-off in KV Cache Compression (arXiv:2412.12706)](https://arxiv.org/abs/2412.12706) -- paper
> "'The mainstream KV compression methods, including KV pruning and KV quantization, primarily focus on either token or precision dimension separately, leaving the trade-off between these two orthogonal dimensions largely under-explored.'"

**Knowledge:** Introduces 'quantized pruning'—keeping more tokens at lower bit-width (e.g., 2-bit) outperforms either token-pruning or quantization alone for long-context retrieval tasks. This is the token-precision Pareto frontier: storing more context at lower fidelity beats storing less at full precision. For PRISM's context-budget decisions, this motivates choosing breadth-of-context over exact-precision-of-each-token in the KV cache when operating near the window ceiling.

### [End-to-End Context Compression at Scale (arXiv:2606.09659)](https://arxiv.org/abs/2606.09659) -- paper
> "'Encoder-decoder compressors, which map a long token sequence to a shorter sequence of latent embeddings consumed by a decoder, are an appealing alternative in principle.' LCLMs trained at compression ratios 1:4, 1:8, 1:16 on 350B tokens."

**Knowledge:** Introduces Latent Context Language Models (LCLMs), the most aggressive form of soft-token compression: a dedicated encoder maps raw input to a compact latent sequence that replaces the original context for the decoder. Pre-trained at 350B tokens across 1:4–1:16 ratios, this is the current frontier of end-to-end context compression at production scale. The primary remaining challenge is domain-generalization without quality loss—the key gap that distinguishes RAG retrieval (targeted retrieval) from blind compression.

### [Compressing KV Cache for Long-Context LLM Inference with Inter-Layer Attention Similarity (arXiv:2412.02252)](https://arxiv.org/abs/2412.02252) -- paper
> "'Attention scores for distant tokens are highly redundant across consecutive layers.' The PoD framework achieves 'up to 35% reduction in KV cache memory usage' without performance loss by preserving proximal and sharing distant token key states across layers."

**Knowledge:** The PoD (Proximal-over-Distant) framework exploits the empirical finding that attention patterns for non-recent tokens are near-identical across consecutive transformer layers, enabling cross-layer key-state sharing. The 35% KV cache reduction with no measured accuracy degradation is achieved post-training with lightweight adaptation. This informs PRISM's Obsidian brain design: recent memory (proximal) requires full fidelity; deep historical context (distant) can be summarized or shared.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_74b87263-acb). Ledger: state/shared/galaxy-knowledge-iterations.json._

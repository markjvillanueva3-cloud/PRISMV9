---
title: PRISM Methodology Foundations — how every galaxy should operate (loop discipline, the PSN brain, LoRA/RAG/CAG, agentic harnesses, Blackwell + Ollama tiering)
galaxy: cross-cutting
owner_slot: papa
status: VERIFIED-PARTIAL
verified_by: "papa-methodology-build (2026-06-10)"
verification_method: external-systems (LoRA/RAG/CAG) WebFetch-confirmed against arXiv primary sources; PRISM-internal doctrine POINTS to (does not duplicate) already-verified wiki entries + the canonical host-facts spec, each read-confirmed to exist before linking
tags: [methodology, cross-cutting, loop-discipline, obsidian-vault, psn-brain, lora, rag, cag, ollama-tiering, blackwell, agentic-harness, token-economy, fleet-wide]
---

# PRISM Methodology Foundations

The cross-cutting **"how to operate"** spine for all 34 PRISM galaxies. This entry exists so loop-discipline, Obsidian-vault usage, LoRA, CAG, RAG, agentic-harness, Blackwell-hardware, and Ollama-tiering doctrine are **readily available and auto-invoked when relevant** in every galaxy — not re-derived per slot. It is a **pointer index**: PRISM-internal doctrine is summarized one level deep and then linked to its canonical owner (so it never rots here), and external systems (LoRA/RAG/CAG) are grounded against their primary academic sources, WebFetch-confirmed below.

> R12 honesty contract for this file: every claim about an external system was actually fetched from its source and confirmed (see ## Sources). Every PRISM-internal link was read-confirmed to exist before linking. Where a claim needs a domain owner's sign-off it sits in ## Owner-gate, not in the body.

## 1. Blackwell hardware + Ollama tiering

This host is the build target — size every build to it (operator directive, `feedback_build_for_blackwell_hardware`). Canonical facts (verified LIVE 2026-06-09): `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` — **always cite that file, do not re-state the numbers here** (re-stating is exactly how the drift that spec targets accumulates). Headline: **RTX PRO 6000 Blackwell, 96 GB VRAM; Ryzen 9 9950X3D 32-thread; 127 GB physical RAM.** The 96 GB VRAM is the unlock — a 65 GB model fits resident, so deep reasoning that used to require Claude can now run locally.

**Ollama model roster + when to use each tier** (from the canonical spec; route mechanical text/code ops here, reserve Claude for deep reasoning + safety):

| Tier | Model | Use when |
|------|-------|----------|
| **Deep local reasoning** | `gpt-oss:120b` (65 GB, fits resident) | Galaxy-synthesis, complex multi-step summarization, cross-file distillation where Claude-grade reasoning is not strictly required. The Blackwell headline; currently underused. |
| **Mid triage** | `gpt-oss:20b` (13.8 GB) | Faster general explain / classify / triage when 120b is overkill. |
| **Heavy code** | `qwen2.5-coder:32b` (19.9 GB) | The strongest local coder — code explain / review / lint / diff-summary / docstring. The fleet default for code offload. |
| **Trivial code** | `qwen2.5-coder:1.5b` (1.0 GB) | Ultra-fast tiny tasks (tiny classify, var-rename hints) — near-zero latency. |
| Vision OCR ensemble | `qwen3-vl:8b-instruct` + `qwen2.5vl:7b` + `llama3.2-vision:11b` | Multi-VLM consensus blueprint/dimension extraction (>=2-agree corroborated). |
| Embeddings | `nomic-embed-text` (768-d) | All memory/wiki/tribal sidecar embeddings. |

> Drift to watch (per the spec): the doc'd `qwen2.5-coder:7b` is **NOT installed** — `qwen2.5-coder:32b`/`1.5b` are the real tiers. The `:3b/:7b/:14b` tags were retired 2026-06-04 (Blackwell migration).

## 2. Loop discipline

POINTER -> [[agent-loop-design-rules]] (`knowledge/wiki/lessons/agent-loop-design-rules.md`, slot:alpha, verified 2026-06-09). Auto-invoked on every `/loop` by `.claude/hooks/loop-iteration-inject.mjs` (knob `PRISM_LOOP_RULES_DISABLE=1`). The bound-the-open-loop rules, summarized (do not re-derive — the linked entry is canonical):

1. **CLOSED-loop by default** — a clear **GOAL** -> defined steps -> an **EVAL gate** at each step -> a **STOP condition / handback**. Open exploratory looping only with explicit budget headroom (an open loop on a loose standard is a token "slop machine").
2. **EVAL-GATE every iteration** — an iter is not done until its eval passes (real tests + per-file 2-arm scrutiny); never auto-advance past an unverified iter.
3. **EACH PASS FEEDS THE NEXT** — carry the prior iter's outcome/numbers forward so iter N+1 beats N; never cold-restart (PRISM: outcome bus + loop-state + handoff RESUME).
4. **SELF-CORRECT** — draft -> check against the goal -> fix the WEAKEST part -> repeat until it clears requirements.
5. **Orchestrator / specialist / subagent split** with deterministic ~zero-token coordination (route, don't reason — R5).
6. **BUDGET is a stop condition** — near the token ceiling -> **checkpoint at YELLOW** + `/compact`; never push an open loop into a spiral (R6/R10).

## 3. Obsidian vault as the PSN brain

POINTER -> [[feedback-obsidian-brain]] (`knowledge/wiki/lessons/feedback-obsidian-brain.md`, promoted doctrine, PSN leg #1). The cross-session persistent memory layer:

- **Memory namespace** `C:\Users\<u>\.claude\projects\H--prism\memory\*.md` **auto-feeds** every Stop into the repo mirror `H:/prism/knowledge/memories/{feedback,reference,project,user,patterns,mistakes,inbox}/` via `.claude/hooks/stop-obsidian-memory-feed.mjs` (knob `PRISM_OBSIDIAN_FEED_DISABLE=1`). It survives compaction, terminal close, and reboot.
- **Recall before re-deriving.** Four UserPromptSubmit injectors surface relevant memory/wiki/system-viz/tribal hits at near-zero token cost on every prompt (`memory-relevance-inject`, `wiki-precheck-inject`, `master-index-precheck-inject`, `tribal-by-domain-inject`). The corollary doctrine: if a concept has no memory file of its own, the injectors cannot surface it — promote durable lessons to their own file (fleeting -> memory -> wiki -> CLAUDE.md pointer).

## 4. LoRA (Low-Rank Adaptation)

**External, WebFetch-confirmed.** *LoRA: Low-Rank Adaptation of Large Language Models*, Hu et al., 2021 (arXiv:2106.09685). Core method, confirmed from the abstract: **freeze the pretrained model weights and inject trainable rank-decomposition matrices into each layer of the Transformer**, drastically reducing trainable parameters. Headline numbers vs. fine-tuning GPT-3 175B with Adam: **~10,000x fewer trainable parameters** and **~3x less GPU memory**, with no added inference latency and parity-or-better quality.

PRISM usage: domain LoRA dataset feeders convert the vault's doctrine memories into Alpaca-style training triples for domain adaptation (india's AI-training galaxy; see `reference_vault_to_ai_feeders_2026_06_09`).

## 5. RAG (Retrieval-Augmented Generation)

**External, WebFetch-confirmed.** *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*, Lewis et al., 2020 (arXiv:2005.11401, NeurIPS 2020). Core method, confirmed from the abstract: **combine a parametric seq2seq memory with a non-parametric memory of retrieved passages** — a dense vector index (Wikipedia in the paper) accessed by a pretrained neural retriever — yielding more specific, diverse, and factual generation than a parametric-only seq2seq baseline.

PRISM usage: the RAG-HYBRID retrieval path (dense embeddings via Qdrant + the memory/wiki/tribal sidecars) is how the fleet grounds answers in the corpus rather than re-deriving them.

## 6. CAG (Cache-Augmented Generation)

**External, WebFetch-confirmed.** *Don't Do RAG: When Cache-Augmented Generation is All You Need for Knowledge Tasks*, Chan et al., 2024 (arXiv:2412.15605, WWW '25). Core idea, confirmed from the abstract: **preload the relevant knowledge into the model's extended context and cache the runtime KV state, so queries are answered without real-time retrieval**. Claimed advantages over RAG: eliminates retrieval latency, removes retrieval-selection errors, and reduces system complexity — best when the knowledge base is limited and manageable.

PRISM usage: the CAG-router (`scripts/lib/cag-router.mjs`, [[cag-router]]) classifies each query COLD / HOT / HYBRID before any injection fires — a COLD query is served entirely from the ~92 KB static-doctrine prompt-cache (`cache_control: ephemeral`) instead of a live retrieval round-trip, which is the direct application of the paper's preload-don't-retrieve idea to PRISM's per-prompt doctrine block.

## 7. Agentic harnesses

Qualitative pattern (no external fetch needed): an **orchestrator owns the GOAL**, **specialists own steps**, **narrow subagents do bounded work**, and coordination stays **deterministic and ~zero-token** — the coordinator routes, it does not reason (R5). A Workflow coordinator that only fans out and merges spends essentially nothing; that near-zero coordination cost is what makes large multi-agent runs affordable. This is the same orchestrator/specialist/subagent split that rule 5 of [[agent-loop-design-rules]] encodes; in PRISM it is realized by the Workflow + subagent pattern (per-file 2-arm scrutiny, the 3-of-3 Stop gate, and the brainstorm-path-forward multi-agent Workflow at decision crossroads).

## Owner-gate (NOT promoted)

These need a domain owner's verification before being asserted as PRISM fact:

- **PRISM LoRA pipeline specifics** (which engines train, cadence, eval gates, current model targets) — india (AI-training galaxy) owns this; the §4 PRISM-usage line is a pointer, not a verified pipeline spec.
- **RAG-HYBRID live wiring depth** (which dense/sparse arms are active, Qdrant collection coverage) — database-expansion (juliett) + AI-training (india) own the live numbers; §5 names the pattern, not a coverage claim.
- **Ollama tiering as enforced routing** — the canonical spec marks the `qwen2.5-coder:7b`->`:32b` default-fix as still-pending in some hooks/`OllamaHookBridgeEngine`; treat the §1 tiers as the doctrine to route toward, and re-verify the live default before relying on it (alpha + papa lanes).

## Sources

External (WebFetched + confirmed 2026-06-10):
- LoRA — https://arxiv.org/abs/2106.09685 (Hu et al., 2021) — CONFIRMED: freeze pretrained weights + inject per-layer low-rank matrices; ~10,000x fewer trainable params, ~3x less GPU memory.
- RAG — https://arxiv.org/abs/2005.11401 (Lewis et al., 2020, NeurIPS 2020) — CONFIRMED: parametric seq2seq + non-parametric dense-vector retrieved-passage memory.
- CAG — https://arxiv.org/abs/2412.15605 (Chan et al., 2024, WWW '25) — CONFIRMED: preload knowledge into extended context / KV-cache, no real-time retrieval.

PRISM-internal (read-confirmed to exist, pointed to — not duplicated):
- `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` — Blackwell hardware + Ollama roster (§1).
- [[agent-loop-design-rules]] — `knowledge/wiki/lessons/agent-loop-design-rules.md` — the 6 loop rules (§2, §7).
- [[feedback-obsidian-brain]] — `knowledge/wiki/lessons/feedback-obsidian-brain.md` — PSN leg #1 / auto-feed (§3).
- [[cag-router]] — `knowledge/wiki/architecture/cag-router.md` — PRISM's CAG classifier (§6).
- `reference_vault_to_ai_feeders_2026_06_09` — vault -> LoRA dataset feeders (§4).

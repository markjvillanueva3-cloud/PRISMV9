---
title: AI-Training Resource Atlas
galaxy: ai-training
owner_slot: india
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "Local store/corpus pointers confirmed on-disk via Glob/ls (state/shared/nn-graph/, node-embeddings-768d.jsonl, vault-to-lora-dataset.mjs, mcp-server/data/state/, tribal-embed-index.manifest.json). Every external YouTube/online/data-report URL WebFetch-confirmed to resolve 2026-06-10; non-resolving sources dropped. No numeric constants promoted (R12)."
tags: [ai-training, resource-atlas, gnn, lora, rag, embeddings, machine-learning, deep-learning, free-resources, india]
---

# AI-Training Resource Atlas

> **One-stop, easy-access index for the `ai-training` galaxy.** Jump straight to the resource you need — the LOCAL PRISM stores/corpora that this galaxy trains against, plus the curated, verified, FREE external half (video lecture series, seminars, reputable open books, foundational papers, data reports). This atlas is intentionally a HUB, not a textbook: it links, it does not re-derive.
>
> **Distinct from [[ai-training-source-atlas]]** (the free-college-course + textbook *curriculum*). This resource-atlas adds the **local trove pointers** + the **video/seminar/data-report half** + the cross-link hub. Keep both — they cover different halves.
>
> **R12 / owner-gate:** NO numeric cutting constant, Cpk, OEE, model gate (AUROC/Brier/F1), or safety threshold is promoted into this file. The *method* and *source* are linked; the *number* stays owner-gated to india + `mcp-server/src/physics/constants.ts` + the eval-gate code. See `## Owner-gate (NOT promoted)`.

---

## 1. Local stores + corpora (the PRISM trove this galaxy trains against)

Pathway convention: **store/corpus + its own index** — go to the root, then read its index/manifest; never re-OCR or re-derive what already has an index.

| Resource | Path (pathway = store + index) | What it is | Index / entry |
|----------|--------------------------------|------------|---------------|
| **GNN ref-pool + node embeddings** | `state/shared/nn-graph/` | GraphSAGE wiring-inference reference pool (tier-5 cascade) + the 768-d node embedding matrix the trainer consumes | `state/shared/nn-graph/node-embeddings-768d.jsonl` (one record per node) — read via the node-card offset oracle, never the 548MB graph |
| **LoRA datasets (Alpaca triples)** | `scripts/vault-to-lora-dataset.mjs` | Vault → LoRA fine-tune dataset builder; emits Alpaca-format `{instruction, input, output}` triples from the Obsidian feedback vault | Run the script; its emitted dataset + manifest is the index. Pairs with the LoRA method ([[ai-training-advanced-techniques]] + arXiv 2106.09685 below) |
| **RAG corpus + tribal embed index** | `state/shared/tribal-embed-index.manifest.json` (sharded; was monolithic `tribal-embed-index.json`) | The retrieval corpus — tribal-tip + wiki embeddings that feed PSN leg #5 (tribal injection) and the RAG dense arm | Load via `scripts/lib/load-tribal-index.mjs` (buffer-read, V8-string-cap-safe) / `write-tribal-index.mjs`; the `.manifest.json` lists the shards. NEVER `JSON.parse(readFileSync)` it directly |
| **Model checkpoints + eval state** | `mcp-server/data/state/` | Trained model checkpoints, eval reports (`NN-EVAL.json`), offload stats, extraction logs, baseline inventory | Directory IS the index; read the specific state file (e.g. `NN-EVAL.json` via `classifyGnn`, never re-inline its gate numbers) |

> The GNN/LoRA/RAG triad is fed by the vault feeders: `vault-to-gnn-refpool.mjs` (+ ref-pool wirings) and `vault-to-lora-dataset.mjs`. See galaxy memory `reference_vault_to_ai_feeders_2026_06_09` for the live feeder map.

---

## 2. Curated YouTube + free seminars / lecture series (WebFetch-verified 2026-06-10)

All entries below resolved on a live fetch; each is an official course site fronting a free, complete video lecture series. Prefer the official course page (it links the canonical playlist + notes) over a re-uploaded playlist.

| Source | Link | What you get | Use it for |
|--------|------|--------------|------------|
| **Stanford CS229 — Machine Learning** | https://cs229.stanford.edu/ | Broad ML / statistical pattern recognition: supervised, unsupervised, learning theory, RL. Full lecture videos + notes | The math-grounded ML core under everything PRISM trains |
| **Stanford CS224N — NLP with Deep Learning** | https://web.stanford.edu/class/cs224n/ | Cutting-edge neural NLP through modern LLMs. Lectures + assignments | Transformer / LLM grounding for the LoRA + RAG work |
| **Stanford CS231N — Deep Learning for Computer Vision** | https://cs231n.stanford.edu/ | CNNs → modern vision architectures; backprop from scratch. Lectures + notes | The vision side (relevant to the blueprint/OCR-VLM ensemble feeders) |
| **Andrej Karpathy — Neural Networks: Zero to Hero** | https://karpathy.ai/zero-to-hero.html | Build NNs from scratch in code: micrograd → makemore → GPT → tokenization. 7 video lectures | The single best from-first-principles path; backprop + a working GPT you can read end-to-end |
| **DeepLearning.AI** | https://www.deeplearning.ai/ | Andrew Ng's courses/specializations + free guides + community; serves 7M+ learners | Structured course ladder + applied LLM short-courses (e.g. efficient LLM inference) |
| **Hugging Face — Learn (courses hub)** | https://huggingface.co/learn | LLM Course, Agents, Deep-RL, Diffusion, CV, Audio, smol post-training course, Open-Source AI Cookbook | The hands-on, library-grounded half — closest to how PRISM actually trains/serves |

---

## 3. Reputable free online + data reports (WebFetch-verified 2026-06-10)

FREE + LEGAL only. Each resolved live. (Papers with Code now 302-redirects to Hugging Face Papers — the verified successor is listed in its place.)

### Free open books + practical courses
| Source | Link | What it is |
|--------|------|------------|
| **Dive into Deep Learning (D2L)** | https://d2l.ai/ | Interactive free book — code + math + discussion, each section an executable notebook (PyTorch / JAX / TF / NumPy). Adopted by 500+ universities |
| **fast.ai — Practical Deep Learning for Coders** | https://course.fast.ai/ | Jeremy Howard's top-down, code-first DL course + the free fastbook |
| **Hugging Face — LLM Course** | https://huggingface.co/learn/llm-course | The (formerly NLP) LLM course: Transformers / Datasets / Tokenizers / Accelerate across 12 chapters — directly maps to the PRISM HF tooling stack |

### Foundational papers (the methods PRISM's local trove implements)
| Paper | Link | Why it matters here |
|-------|------|---------------------|
| **LoRA: Low-Rank Adaptation of LLMs** (Hu et al., arXiv:2106.09685) | https://arxiv.org/abs/2106.09685 | The method behind the local LoRA-dataset feeder + `train-lora` path; freeze base weights, inject trainable rank-decomposition matrices |
| **Retrieval-Augmented Generation** (Lewis et al., NeurIPS 2020, arXiv:2005.11401) | https://arxiv.org/abs/2005.11401 | The method behind the local RAG corpus + tribal-embed-index dense arm; parametric + non-parametric memory |

### Discovery + data reports
| Source | Link | What it offers |
|--------|------|----------------|
| **Hugging Face Papers (trending)** — successor to Papers with Code | https://huggingface.co/papers/trending | Curated trending AI research with direct arXiv + GitHub repo links; daily/weekly/monthly filters. (Use this anywhere old notes say "Papers with Code") |
| **The Batch — DeepLearning.AI weekly AI report** | https://www.deeplearning.ai/the-batch/ | Weekly curated AI news + Andrew Ng's letters + "Data Points" statistical insights + research coverage — the stay-current feed |

---

## 4. Cross-links (sibling wiki layers + hubs)

- [[ai-training-foundations]] — the theory layer (what the methods *are*)
- [[ai-training-source-atlas]] — the free college-course + textbook curriculum (the *other* atlas half)
- [[ai-training-applied-practice]] — the gotchas / failure modes (schema-read blindness, single-seed AUROC, calibration dead-ends)
- [[ai-training-advanced-techniques]] — world-leader strategy (selective deploy, H2GCN, GPU retrain)
- [[primary-domain-resource-map]] — fleet-wide primary-domain resource map (architecture layer)
- [[prism-methodology-foundations]] — PRISM build/verify methodology (R12/R13/R15, scrutiny gate)

---

## 5. Keep-fresh cadence (do not stay stagnant)

- **Re-verify external links quarterly** (or on any reported 404). One WebFetch per row; drop-on-dead after one retry; record the swap in `## Sources`. Papers-with-Code → HF-Papers was exactly this kind of drift — caught 2026-06-10.
- **Add the next reputable free source as it appears** (new Stanford CS-series offering, new HF course, new foundational arXiv method PRISM adopts) — this is a living hub, never a frozen list.
- **Local pointers track the code**: if `vault-to-lora-dataset.mjs`, the nn-graph layout, or the tribal-index sharding moves, fix the path here in the same commit (R15 wire-with-the-change).
- **Owner (india) refreshes the trove section** when a new local store/corpus/feeder lands; papa/peer slots refresh only the verified external half.

---

## Owner-gate (NOT promoted)
The following stay owner-gated to **india** + their canonical code/state files — this atlas links the method/source only, never the number (R12):
- **Model eval gates** — AUROC / macro-F1 / Brier promotion thresholds live in the nn-graph eval-gate code + `NN-EVAL.json` (read via `classifyGnn`), never re-inlined here.
- **Embedding dimensionality / pool sizes / training hyperparameters** — owned by the feeder scripts + their manifests, not duplicated into prose.
- **Any physics / cutting / Cpk / OEE / safety constant** — `mcp-server/src/physics/constants.ts` is the single source; this is a training-resource index, it carries zero such constants.
- **Corpus counts** — read the live store/manifest; do not bake a count into this file (counts rot within days).

## Sources
- Local on-disk verification (2026-06-10): `state/shared/nn-graph/` + `node-embeddings-768d.jsonl` (present); `scripts/vault-to-lora-dataset.mjs` (present); `mcp-server/data/state/` (present); `state/shared/tribal-embed-index.manifest.json` (present, sharded — supersedes the monolithic `.json`).
- Sibling wiki layers verified present: `knowledge/wiki/ai-training/{ai-training-foundations,ai-training-source-atlas,ai-training-applied-practice,ai-training-advanced-techniques}.md`; `knowledge/wiki/architecture/primary-domain-resource-map.md`.
- External links WebFetch-confirmed resolving 2026-06-10: cs229.stanford.edu · web.stanford.edu/class/cs224n · cs231n.stanford.edu · karpathy.ai/zero-to-hero.html · deeplearning.ai · huggingface.co/learn · d2l.ai · course.fast.ai · huggingface.co/learn/llm-course · arxiv.org/abs/2106.09685 (LoRA) · arxiv.org/abs/2005.11401 (RAG) · huggingface.co/papers/trending (Papers-with-Code successor; PwC 302→HF Papers) · deeplearning.ai/the-batch.
- Galaxy memory cross-refs: `reference_vault_to_ai_feeders_2026_06_09`, `reference_obsidian_fully_operational_2026_06_09`.

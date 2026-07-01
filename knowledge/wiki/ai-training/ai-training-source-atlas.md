---
title: AI-Training Open Source Atlas — living free+legal resources for ML / GNN / LoRA / RAG / deep-learning systems
galaxy: ai-training
owner_slot: india
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas (2026-06-10)"
verification_method: "Each URL below was fetched with WebFetch on 2026-06-10 and confirmed to resolve to live, on-topic, free/legal content (course homepage, textbook home, data portal, lecture-video series, or standards/gov landing page). URLs that failed to resolve, redirected off-host, returned 403/404, or could not be confirmed on-topic were DROPPED and are not listed. This atlas verifies LINK liveness + topical fit; it does not re-extract claims (method specifics stay india-gated in _staging)."
tags: [ai-training, source-atlas, living-resources, free-courseware, open-textbooks, open-data, lecture-video, ai-standards, gnn, lora, rag, deep-learning]
---

# AI-Training Open Source Atlas

A curated directory of the best **free + legal LIVING** resources for the ai-training galaxy's domain — machine learning, graph neural networks (GNN), LoRA fine-tuning, retrieval-augmented generation (RAG), and deep-learning systems. The point is a **non-stagnant keep-learning curriculum**: every entry below is a *continuously-updated* source (a full course series, a textbook homepage that ships new editions, a data portal, an annually-refreshed lecture-video series, or a standards body) — so the galaxy stays current by pointing at sources that maintain themselves, instead of freezing a snapshot.

**Scope vs the foundations file (R8 — no duplication):** [`ai-training-foundations.md`](ai-training-foundations.md) already cites specific *course pages and textbook chapters* (Stanford CS224W, d2l.ai chapters, Google ML Crash Course, NIST AI RMF, MIT 6.036 / 6.S191 / 6.034 / 18.650, NPTEL Deep Learning, OpenStax, Gutenberg). This atlas deliberately does **not** repeat those URLs. It curates *broader living surfaces* — full course-series catalogs, textbook *homepages*, open-data portals, lecture-*video* series, and standards/gov landing pages — that a learner returns to over time. The flat bulk pointer corpus at `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (mostly arXiv papers + PEFT/Wikipedia) is the un-curated source; this is the verified, type-organized, auto-invokable per-galaxy form.

All entries verified **2026-06-10**. Each = source name + URL + one-line "what it is good for in ML / GNN / LoRA / RAG / deep-learning systems."

## Free college courses

- **fast.ai — Practical Deep Learning for Coders** — https://www.fast.ai/ — free, code-first, top-down deep-learning course series (+ a Code-First Intro to NLP); the fastest practical on-ramp for the galaxy's LoRA/fine-tuning and training-loop intuition.
- **DeepLearning.AI — course & specialization catalog** — https://www.deeplearning.ai/courses/ — Andrew Ng's catalog (Machine Learning, Deep Learning, NLP, Generative AI, Mathematics-for-ML specializations); audit-available video lectures that track current GenAI/LLM practice.
- **Hugging Face — Learn hub** — https://huggingface.co/learn — free, continuously-expanded courses: the **LLM Course**, Agents, Deep RL, Diffusion, and Computer Vision — the single most current free curriculum for the exact transformers/LLM/RAG stack PRISM uses.
- **CMU 10-601 / 10-301 — Introduction to Machine Learning** — https://www.cs.cmu.edu/~mgormley/courses/10601/ — a re-run graduate-level ML course with public schedule, readings, and recorded lectures; a second institutional ML curriculum independent of the MIT/Stanford material in foundations.
- **Stanford CS231n — Deep Learning for Computer Vision (course notes)** — https://cs231n.github.io/ — the canonical free public notes on backprop, optimization, CNNs, and training neural nets; the clearest written derivation of the gradient/training mechanics under PRISM's GNN and LoRA training.

## Free textbooks & references

- **Goodfellow, Bengio, Courville — *Deep Learning* (MIT Press)** — https://www.deeplearningbook.org/ — the definitive deep-learning reference, full HTML free online; the theory spine for representation learning, optimization, and regularization behind tier-5 and adapters.
- **Deisenroth, Faisal, Ong — *Mathematics for Machine Learning*** — https://mml-book.github.io/ — free PDF (kept up to date); the linear-algebra / probability / optimization math under every ML method the galaxy touches, license-clean to quote.
- **Manning, Raghavan, Schütze — *Introduction to Information Retrieval* (Stanford NLP)** — https://nlp.stanford.edu/IR-book/information-retrieval-book.html — free HTML/PDF; the retrieval foundations (indexing, BM25, ranking, evaluation) directly under PRISM's RAG corpus and retrieve-then-rerank design.
- **Jurafsky & Martin — *Speech and Language Processing* (3rd ed. draft)** — https://web.stanford.edu/~jurafsky/slp3/ — free chapter PDFs, *actively revised* (latest release 2026-01, with new LLM/DPO/ASR/TTS chapters); a living NLP/LLM textbook for the language side of RAG and fine-tuning.
- **Hugging Face — Transformers documentation** — https://huggingface.co/docs/transformers/index — free official docs for the model-definition framework PRISM's LLM/LoRA work runs on (Trainer, generate, pipelines); the living API reference that updates with every release.
- **PyTorch Geometric (PyG) — documentation** — https://pytorch-geometric.readthedocs.io/en/latest/ — free official docs for the GNN library, including `SAGEConv`/GraphSAGE; the implementation reference and tutorials for building/training PRISM's exact tier-5 message-passing classifier.

## Archives & open data / gov reports

- **Hugging Face — Datasets hub** — https://huggingface.co/datasets — 1M+ browsable/downloadable open ML datasets with modality/size/format filters; the primary living source for RAG corpora, fine-tuning sets, and benchmark data.
- **UCI Machine Learning Repository** — https://archive.ics.uci.edu/ — the long-running free archive of classic + newly-donated ML datasets (classification/regression/clustering); clean reference datasets for sanity-testing models and pipelines.
- **Data.gov — U.S. Government open data portal** — https://data.gov/ — 360K+ free U.S. government datasets across every domain; the "data reports" / public-record source for grounding domain RAG and training data with authoritative gov records.
- **OECD.AI Policy Observatory** — https://oecd.ai/en/ — free intergovernmental AI data, metrics, trends, an AI Incidents Monitor, and policy reports across 40+ countries; the living source for AI-governance evidence and trustworthy-AI deployment context.

## Lecture series & video

- **Andrej Karpathy — Neural Networks: Zero to Hero** — https://karpathy.ai/zero-to-hero.html — free 7-lecture video series building neural nets and a GPT from scratch in code (each lecture links its YouTube video); the best ground-up build for *why* the training loop, backprop, and transformer internals work the way they do.
- **MIT 6.S191 — Introduction to Deep Learning** — https://introtodeeplearning.com/ — MIT's annually-refreshed free deep-learning course (2026 edition live; all lecture videos + slides open-sourced, archives back to 2017); a current, maintained video curriculum covering generative modeling, RL, and AI-for-science.
- **3Blue1Brown — Neural Networks series** — https://www.3blue1brown.com/ — Grant Sanderson's free, visually-rigorous video series on neural networks, gradient descent, and backpropagation (also linear algebra & calculus); the clearest visual intuition for the math the galaxy's models optimize.

## Standards & authoritative bodies

- **NIST — AI Risk Management Framework Playbook** — https://www.nist.gov/itl/ai-risk-management-framework/nist-ai-rmf-playbook — free, community-updated suggested actions + references for the AI RMF's GOVERN / MAP / MEASURE / MANAGE functions; the actionable companion to the framework PRISM's NN-EVAL deploy gates map onto (the foundations file cites the framework itself; this is the operational playbook).
- **OECD — AI Principles** — https://oecd.ai/en/ai-principles — the first intergovernmental standard for trustworthy AI (adopted 2019, updated 2024; 47+ adherents), defining the values-based principles and the canonical AI-system/lifecycle definition many regulators adopt; the authoritative reference for the galaxy's trustworthy-AI vocabulary.

## Maintenance

This atlas is a **link directory**, so its single failure mode is **link-rot** — homepages move, courses retire, portals re-host (e.g. Papers with Code redirected off-host and was dropped during this verification; ISO and several YouTube channel pages could not be confirmed via fetch and were excluded rather than listed unverified). **Freshness mechanism:** re-verify every URL periodically (suggested: each time the galaxy does a deepening pass, and at minimum quarterly). On re-verification, drop any URL that no longer resolves to live on-topic content, prefer the *most recent* edition/year when a source ships a new one (R7 conflict rule), and promote any newly-discovered continuously-updated source that beats an entry here. Never add a URL without a successful fetch confirming it resolves + is on-topic (R12). Pair with `ai-training-foundations.md` (claim-level facts) and the india-gated `_staging/` packet (method specifics).

## Cross-refs
- Foundations (claim-level, course/chapter-specific): [`ai-training-foundations.md`](ai-training-foundations.md)
- Bulk un-curated pointer corpus: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md`
- Galaxy brain: `mcp-server/src/engines/ai-training/MEMORY.md`
- CLAUDE.md §NN-GRAPH (GraphSAGE tier-5, deploy gates) · §AI SYSTEM ROUTING
- [[reference_vault_to_ai_feeders_2026_06_09]] · [[feedback_multiseed_before_auroc_claim]]

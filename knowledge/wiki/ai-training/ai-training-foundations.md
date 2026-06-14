---
title: AI-Training Foundations — deep-learning theory, graph ML, regularization, AI governance & evaluation
galaxy: ai-training
owner_slot: india
status: VERIFIED-PARTIAL
verified_by: papa-deepen-workflow (2026-06-09)
verification_method: institutional + courseware + textbook + gov-framework facts WebFetch-confirmed against primary free/legal sources (Stanford CS224W course page, Dive into Deep Learning open textbook d2l.ai, Google ML Crash Course, NIST AI RMF / AIRC). ML-method facts (LoRA/RAG/GraphSAGE/calibration) live in the staging packet with arXiv citations and remain india-gated.
tags: [ai-training, deep-learning, graph-ml, graphsage, regularization, calibration, ai-governance, nist-ai-rmf, free-courseware]
---

# AI-Training Foundations

The domain-knowledge spine for the **ai-training** galaxy: the deep-learning theory, graph-ML methods, regularization discipline, and AI-governance/evaluation frameworks that should back PRISM's GNN tier-5 wiring cascade, the LoRA-from-vault pipeline, the RAG corpus, and the NN-EVAL deploy gates. Created from the deep-domain research packet (`knowledge/wiki/ai-training/_staging/deep-domain-research-2026-06-09.md`) after papa verified the **institutional / courseware / textbook / government-framework** facts directly against primary free sources.

**What's promoted here vs gated:** the sections below are **WebFetch-CONFIRMED** against free college courseware (Stanford CS224W), a free open-access textbook (Dive into Deep Learning, d2l.ai), free vendor courseware (Google ML Crash Course), and a U.S. government framework (NIST AI RMF). The **ML-method specifics** (LoRA rank/alpha rules, RAG chunk-size Goldilocks, GraphSAGE aggregator variants, Brier/Murphy decomposition numbers) stay in `_staging/` with their arXiv citations and are marked **[india-gate]** — india confirms those against the primary papers before any ai-training engine/config hardcodes a number.

## 1. Graph machine learning — the theory under PRISM's GNN tier-5

PRISM's wiring-inference tier-5 is a **GraphSAGE** classifier (CLAUDE.md §NN-GRAPH). The free graduate course that owns this subject end-to-end:

### Stanford CS224W — Machine Learning with Graphs
**CONFIRMED** against the public course page ([web.stanford.edu/class/cs224w](https://web.stanford.edu/class/cs224w/)):
- Full title **"CS224W: Machine Learning with Graphs"**, taught by **Jure Leskovec** — who is also a co-author of the original GraphSAGE paper, so the course is the canonical pedagogy for PRISM's exact method.
- Curriculum spans **representation learning and Graph Neural Networks, node embeddings (DeepWalk, node2vec), Graph Transformers and heterogeneous graphs, knowledge-graph reasoning and embeddings, GNNs for recommender systems, and deep generative models for graphs.**
- **Lecture slides, course notes, and assignments are publicly accessible** (posted as the course progresses; prior versions archived on Stanford's SNAP site) — a free, legal, structured corpus the ai-training galaxy can mine for graph-ML depth.

**Design implication for ai-training:** the node-embedding lineage CS224W teaches (DeepWalk/node2vec are **transductive**; GraphSAGE is **inductive**) is exactly why PRISM's tier-5 can score an UNKNOWN `ghost.unwired-engine` node never seen at train time. Keep CS224W's heterogeneous-graph and knowledge-graph-reasoning units on the reading list — PRISM's system-graph is heterogeneous (engines, dispatchers, ghosts, wiki, memory nodes), so homogeneous-graph intuitions undercount it.

## 2. Regularization & generalization (why a trained adapter/GNN doesn't overfit)

### Dropout — Dive into Deep Learning (free open textbook)
**CONFIRMED** against the d2l.ai dropout chapter ([d2l.ai/.../dropout.html](https://d2l.ai/chapter_multilayer-perceptrons/dropout.html)) — *Dive into Deep Learning* is **open-access and free** (web + PyTorch/MXNet PDFs + Jupyter notebooks):
- Dropout is **"injecting noise while computing each internal layer during forward propagation"** to break **co-adaptation** (a layer over-relying on a specific activation pattern of the previous layer).
- **Training-time rule:** with dropout probability *p*, each activation *h* becomes **0 with probability *p*, else *h*/(1−*p*)** — the 1/(1−*p*) rescale debiases so **E[h'] = h**.
- **Test/inference time:** dropout is **disabled entirely** — no nodes dropped, no normalization; the full network predicts.
- It also notes the theoretical link: **training with input noise is equivalent to Tikhonov regularization** (Bishop), tying dropout to smoothness/robustness.

### L2 regularization & early stopping — Google ML Crash Course (free courseware)
**CONFIRMED** against Google's ML Crash Course regularization unit ([developers.google.com/machine-learning/crash-course](https://developers.google.com/machine-learning/crash-course/overfitting/regularization)):
- **L2 penalizes the sum of squared weights** (w₁²+...+wₙ²); it **"encourages weights toward 0, but never pushes weights all the way to zero"** — so it shrinks but does not feature-select (contrast L1).
- The **regularization rate λ** scales the penalty; training minimizes **`loss + λ·complexity`**. **High λ** strengthens regularization (less overfit, weights normally distributed near zero); **low λ** weakens it (more overfit, flatter weight distribution).
- **Early stopping** = "ending training before the model fully converges," stopping when validation loss starts to rise — a complexity-free regularizer.

**Design implication for ai-training:** PRISM's LoRA-from-vault adapters and the GNN retrain both need an explicit overfit defense recorded in config. The textbook/courseware lineage above (dropout p, L2 λ, early-stop patience) is the auditable vocabulary — log which is applied per adapter/checkpoint, not just the final metric.

## 3. Optimization — SGD & learning-rate schedules

### Stochastic gradient descent — Dive into Deep Learning (free open textbook)
**CONFIRMED** against the d2l.ai SGD chapter ([d2l.ai/chapter_optimization/sgd.html](https://d2l.ai/chapter_optimization/sgd.html)):
- **Cost per iteration:** full-batch gradient descent is **O(n)** (gradient over the whole dataset); SGD samples one example so **"the computational cost for each iteration drops from O(n) of the gradient descent to the constant O(1)."**
- **A fixed learning rate does not converge under SGD's single-sample noise** — the chapter shows quality stalls ("will not improve after additional steps"); the fix is to **"reduce the learning rate dynamically as optimization progresses."**
- **Three schedule families:** piecewise-constant (step), exponential decay, and polynomial decay — with polynomial decay giving superior convergence on convex problems.

**Design implication for ai-training:** every ai-training retrain (GNN tier-5, LoRA) must pin a learning-rate **schedule**, not a scalar, and the schedule belongs in the checkpoint metadata so a stalled run is diagnosable as "fixed-LR noise floor" vs a real ceiling.

## 4. AI governance, trustworthiness & evaluation discipline (gov framework)

PRISM's deploy gates (NN-EVAL.json grading on AUROC + Brier, the selective-deploy abstain pattern) are an *informal* risk-management posture. The U.S. government framework that formalizes this:

### NIST AI Risk Management Framework (AI RMF 1.0)
**CONFIRMED** against NIST ([nist.gov/itl/ai-risk-management-framework](https://www.nist.gov/itl/ai-risk-management-framework) + the AIRC knowledge base):
- **Released January 26, 2023; intended for voluntary use** (consensus-driven, open public-comment process 2021–2023). A Generative-AI profile followed July 2024.
- **Four core functions: GOVERN, MAP, MEASURE, MANAGE** — Govern (oversight + decision structures, cross-cutting), Map (identify/contextualize AI risks), Measure (assess/quantify risk + performance), Manage (mitigation + risk controls).
- **Seven trustworthiness characteristics** a system should exhibit: **(1) Valid and Reliable, (2) Safe, (3) Secure and Resilient, (4) Accountable and Transparent, (5) Explainable and Interpretable, (6) Privacy-Enhanced, (7) Fair with Harmful Bias Managed.** NIST distinguishes **explainability** (the mechanism underlying operation) from **interpretability** (the meaning of the output) — two separate gates, not one.

**Design implication for ai-training:** map PRISM's existing AI assets onto the four functions — NN-EVAL.json deploy gates ARE the **MEASURE** function; the selective-deploy `minConf` abstain is **MANAGE** (risk control); the LoRA/RAG provenance logging (recording r/alpha/schedule/source) serves **MAP + accountability**. The **valid-and-reliable** characteristic ("objective evidence that requirements for the intended use are fulfilled") is the textbook backing for PRISM's R12 "validate against LIVE data with numbers" rule and the multi-seed-before-AUROC-claim doctrine. **Explainable ≠ interpretable** is a useful distinction for any PRISM AI surface that emits a classification (the GNN should report both the mechanism and the meaning of a ghost-node verdict).

## 5. Free graduate/undergraduate AI & ML courseware — the structured corpus the ai-training galaxy can mine

A second deepening pass found additional **free, legal college courses** (MIT OpenCourseWare + NPTEL) that PRISM's ai-training galaxy can treat as a structured, citeable corpus — beyond the single Stanford CS224W course cited above. Each is confirmed against its own public course page.

### MIT 6.036 — Introduction to Machine Learning
**CONFIRMED** against the MIT OCW course page ([ocw.mit.edu/courses/6-036-…-fall-2020](https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/)):
- Taught by **Leslie Kaelbling, Tomás Lozano-Pérez, Isaac Chuang, and Duane Boning** — covers "principles, algorithms, and applications of machine learning from the point of view of **modeling and prediction**."
- The syllabus explicitly names **"Representation, over-fitting, and generalization"** as a foundational unit, alongside **supervised learning, reinforcement learning, and applications to images and temporal sequences.**

**Design implication for ai-training:** "representation, over-fitting, generalization" is precisely the triad PRISM's GNN tier-5 and LoRA adapters must defend (the over-fit-defense vocabulary in §2). 6.036's framing — ML as *modeling and prediction* — is the clean academic backing for treating NN-EVAL as a prediction-quality gate, not a binary pass/fail.

### MIT 6.S191 — Introduction to Deep Learning
**CONFIRMED** against the MIT OCW course page ([ocw.mit.edu/courses/6-s191-…-january-iap-2020](https://ocw.mit.edu/courses/6-s191-introduction-to-deep-learning-january-iap-2020/)):
- Taught by **Alexander Amini and Ava Soleimany**; described as "MIT's introductory course on deep-learning methods with applications to **computer vision, natural language processing, biology, and more**," giving "foundational knowledge of deep-learning algorithms and practical experience in building neural networks in TensorFlow."
- Companion open-publication site: introtodeeplearning.com.

### MIT 6.034 — Artificial Intelligence (the classic Winston course)
**CONFIRMED** against the MIT OCW course page ([ocw.mit.edu/courses/6-034-…-fall-2010](https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/)):
- Taught by **Patrick Henry Winston**; covers "basic **knowledge representation, problem solving, and learning methods** of artificial intelligence," with units spanning knowledge representation, problem solving, learning methods, vision, and language understanding.

### NPTEL — Deep Learning (IIT Ropar)
**CONFIRMED** against the NPTEL course page ([nptel.ac.in/courses/106106184](https://nptel.ac.in/courses/106106184)):
- Course **"NOC: Deep Learning,"** offered by **IIT Ropar**, instructor **Prof. Sudarshan Iyengar** — an India-government (NPTEL/SWAYAM) free open-courseware deep-learning course, a corpus distinct from the U.S./Stanford material above.

**Design implication for ai-training:** these four courses span the full lineage PRISM needs — classical-symbolic AI (6.034), statistical ML (6.036), modern deep learning (6.S191), and an independent second deep-learning curriculum (NPTEL). Treat their public lecture slides/notes as the legal mining corpus for the galaxy's deep-learning depth, and prefer the *most recent* when two disagree (R7 conflict rule).

## 6. The convolution priors — translation invariance & locality (d2l, new chapter)

PRISM's vision/OCR-adjacent surfaces and any future image-feature model rest on the two architectural priors that make CNNs tractable. **CONFIRMED** against a new chapter of the open-access *Dive into Deep Learning* ([d2l.ai/.../why-conv.html](https://d2l.ai/chapter_convolutional-neural-networks/why-conv.html)):
- **Translation invariance:** "a shift in the input should simply lead to a shift in the hidden representation" — the same filter weights apply at every location, so the network recognizes a pattern regardless of where it appears.
- **Locality:** "we should not have to look very far away from location (i, j) in order to glean relevant information" — the filter only examines a small neighborhood, not the whole image.
- **Parameter consequence (the textbook's own worked numbers):** a fully connected layer over a 1000×1000 image needs ~**10¹²** parameters; translation invariance (shared weights) cuts that to ~**4×10⁶**, and locality cuts it further to the order of the neighborhood size — turning an intractable model into a trainable one **without sacrificing expressive power**, because the priors match how images actually behave.

**Design implication for ai-training:** the same "inductive prior to cut parameters" logic underlies *why* GraphSAGE's neighborhood-aggregation is parameter-efficient — locality on a graph is the message-passing radius. When the galaxy documents tier-5, frame its sample-efficiency the way d2l frames CNNs: a structural prior (graph locality) replaces brute-force dense parameters.

## 7. The math under the optimizer — applied optimization & least-squares (free textbooks)

PRISM's optimizers (SGD/schedules, §3) and its quote/cost regression surfaces both reduce to classical calculus + least-squares. Confirmed against free/public-domain texts not previously cited:

### Applied optimization — OpenStax Calculus Volume 1
**CONFIRMED** against the OpenStax chapter ([openstax.org/.../4-7-applied-optimization-problems](https://openstax.org/books/calculus-volume-1/pages/4-7-applied-optimization-problems)):
- The canonical six-step optimization strategy: introduce variables → identify the objective → write a formula → form constraint equations and reduce to a **single-variable** function → establish the domain from physical constraints → **find extrema at critical points AND endpoints.**
- Critical points are found where the derivative is zero ("A′(x) = 0"), and the chapter stresses that "these extreme values occur **either at endpoints or critical points**" — both must be checked for a true global optimum.

### Least-squares regression — OpenStax Introductory Statistics 2e
**CONFIRMED** against the OpenStax regression-equation chapter ([openstax.org/.../12-3-the-regression-equation](https://openstax.org/books/introductory-statistics-2e/pages/12-3-the-regression-equation)):
- The least-squares regression line ŷ = a + bx is "the best-fit line obtained by **minimizing the sum of squared errors (SSE)**," where each residual ε is the vertical distance between an actual point and its prediction, and **SSE = Σε²**.
- Closed-form coefficients: slope **b = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)²** and intercept **a = ȳ − bx̄** — derived "using calculus" to make SSE a minimum.

### Calculus Made Easy — Silvanus P. Thompson (public domain)
**CONFIRMED** against Project Gutenberg ([gutenberg.org/ebooks/33283](https://www.gutenberg.org/ebooks/33283)):
- A fully public-domain (Project Gutenberg) differential/integral calculus primer — a legal, freely-redistributable text the galaxy can quote for the derivative/gradient foundations under SGD without any licensing concern.

**Design implication for ai-training:** the "minimize SSE → find the zero of the gradient" pipeline OpenStax teaches at scalar scale IS what SGD does at high-dimensional scale; documenting tier-5/LoRA loss surfaces in this vocabulary keeps the galaxy's math auditable from first principles, and the public-domain Thompson text is a zero-friction citation source for that foundation.

## 8. Statistical-inference foundations for honest evaluation (free graduate courseware)

PRISM's R12 "validate with numbers" rule and the **multi-seed-before-AUROC-claim** doctrine ([[feedback_multiseed_before_auroc_claim]]) are statistical-inference disciplines. The free graduate course that owns the theory:

### MIT 18.650 — Statistics for Applications
**CONFIRMED** against the MIT OCW course page ([ocw.mit.edu/courses/18-650-…-fall-2016](https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/)):
- Taught by **Prof. Philippe Rigollet** (MIT Mathematics); provides "an in-depth the theoretical foundations for statistical methods that are useful in many applications," emphasizing "the role of mathematics in the research and development of **efficient statistical methods**," and includes **nonparametric regression** among its applications.

**Design implication for ai-training:** the galaxy should treat 18.650 as the citeable backing for *why* a single-seed metric is not evidence — sampling variability is a first-class statistical object, and an AUROC reported without a confidence interval over ≥3 seeds is a point estimate masquerading as a result. This is the academic spine under PRISM's existing multi-seed doctrine.

## Owner-gate (NOT promoted)

The following stay in `knowledge/wiki/ai-training/_staging/deep-domain-research-2026-06-09.md` for **india** to confirm against the cited arXiv primary sources before any ai-training engine/config hardcodes a number — they are method specifics, not the institutional/courseware facts papa verified:
- **LoRA** rank/alpha scaling rules (alpha/r vs rsLoRA alpha/√r), `target_modules="all-linear"`, DoRA/LoRA+ claims, per-layer `rank_pattern`/`alpha_pattern` — arXiv:2106.09685 / 2312.03732 / 2402.09353 / 2402.12354 / 2305.14314 + HuggingFace PEFT guide.
- **RAG** chunk-size "Goldilocks" 50→500→1000-token curve, DPR's 9–19% lift over BM25, retrieve-then-rerank top-k values — arXiv:2005.11401 / 2004.04906 / 2407.01219.
- **GraphSAGE** aggregator variants (mean/LSTM/pool) and the three inductive-validation benchmarks — arXiv:1706.02216.
- **Calibration** Brier formula, Murphy REL−RES+UNC decomposition, ECE + temperature-scaling numbers — arXiv:1706.04599 + the PRISM-measured "Murphy reliability 0.0197 of 0.179" finding (CLAUDE.md §NN-GRAPH 2026-06-06).

These are well-cited and likely correct; they are gated only because india owns the ai-training method layer and should be the one to assert them as PRISM ground-truth. No safety/physics constants are involved (non-physics galaxy).

## Sources

Newly WebFetch-confirmed for this foundations file (the untapped categories — free college courses, free textbooks, free courseware, gov frameworks):
1. Stanford — *CS224W: Machine Learning with Graphs* (course page, public slides/notes; Leskovec) — https://web.stanford.edu/class/cs224w/
2. Zhang, Lipton, Li, Smola — *Dive into Deep Learning* (open-access textbook), Dropout chapter — https://d2l.ai/chapter_multilayer-perceptrons/dropout.html
3. *Dive into Deep Learning*, Stochastic Gradient Descent chapter — https://d2l.ai/chapter_optimization/sgd.html
4. *Dive into Deep Learning* (book home, open-access confirmation) — https://d2l.ai/
5. Google — *Machine Learning Crash Course*, Regularization / L2 / early stopping — https://developers.google.com/machine-learning/crash-course/overfitting/regularization
6. NIST — *AI Risk Management Framework (AI RMF 1.0)* (four functions, voluntary, Jan 2023) — https://www.nist.gov/itl/ai-risk-management-framework
7. NIST AIRC — *Characteristics of Trustworthy AI Systems* (the seven characteristics) — https://airc.nist.gov/AI_RMF_Knowledge_Base/AI_RMF/Foundational_Information/3-sec-characteristics

Second-pass additions (2026-06-10, india-deepen — distinct NEW source URLs, none duplicating the list above; free college courses + free/public-domain textbooks):
8. MIT OpenCourseWare — *6.036 Introduction to Machine Learning* (Fall 2020; Kaelbling, Lozano-Pérez, Chuang, Boning) — https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/
9. MIT OpenCourseWare — *6.S191 Introduction to Deep Learning* (Jan IAP 2020; Amini, Soleimany) — https://ocw.mit.edu/courses/6-s191-introduction-to-deep-learning-january-iap-2020/
10. MIT OpenCourseWare — *6.034 Artificial Intelligence* (Fall 2010; Patrick Henry Winston) — https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/
11. NPTEL (IIT Ropar) — *NOC: Deep Learning* (Prof. Sudarshan Iyengar) — https://nptel.ac.in/courses/106106184
12. *Dive into Deep Learning*, CNN priors chapter (translation invariance & locality) — https://d2l.ai/chapter_convolutional-neural-networks/why-conv.html
13. OpenStax — *Calculus Volume 1*, §4.7 Applied Optimization Problems — https://openstax.org/books/calculus-volume-1/pages/4-7-applied-optimization-problems
14. OpenStax — *Introductory Statistics 2e*, §12.3 The Regression Equation (least-squares / SSE) — https://openstax.org/books/introductory-statistics-2e/pages/12-3-the-regression-equation
15. Project Gutenberg — *Calculus Made Easy*, Silvanus P. Thompson (public domain) — https://www.gutenberg.org/ebooks/33283
16. MIT OpenCourseWare — *18.650 Statistics for Applications* (Fall 2016; Philippe Rigollet) — https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/

Staging packet (arXiv-cited ML-method facts, india-gated): `knowledge/wiki/ai-training/_staging/deep-domain-research-2026-06-09.md`

## Cross-refs
- Galaxy brain: `mcp-server/src/engines/ai-training/MEMORY.md`
- CLAUDE.md §NN-GRAPH (GraphSAGE tier-5, deploy gates, selective-deploy) · §AI SYSTEM ROUTING
- [[reference_vault_to_ai_feeders_2026_06_09]] (LoRA-from-vault + GNN ref-pool feeders)
- [[feedback_multiseed_before_auroc_claim]] (multi-seed-before-AUROC doctrine)

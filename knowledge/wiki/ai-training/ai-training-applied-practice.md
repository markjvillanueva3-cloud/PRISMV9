---
title: AI-Training Applied Practice — ML/AI-systems practitioner gotchas, failure modes & technique decisions
galaxy: ai-training
owner_slot: india
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice (2026-06-10)"
verification_method: "Every gotcha below was WebFetch-confirmed on 2026-06-10 against a free/legal primary source (Google ML Crash Course, scikit-learn official docs, Dive into Deep Learning open textbook, Hugging Face official docs + Learn/Cookbook). This file captures QUALITATIVE practitioner technique + failure modes (papa-verifiable CS/ML claims). Any benchmark- or model-specific NUMBER stays india-gated in _staging/ — none are asserted here as PRISM ground truth."
tags: [ai-training, applied-practice, tribal-knowledge, data-leakage, overfitting, class-imbalance, distribution-shift, lora, rag, prompt-eval, llm-judge, seed-variance, ml-gotchas]
---

# AI-Training Applied Practice

The **practitioner-knowledge layer** for the ai-training galaxy — the hard-won gotchas, failure modes, and technique decisions a world-class ML/AI-systems practitioner carries that pure theory does not teach. This is the third leg of the ai-training wiki triad and is deliberately **distinct** from its siblings (R8 — no duplication):

- [`ai-training-foundations.md`](ai-training-foundations.md) — the THEORY spine (CS224W graph-ML, d2l.ai dropout/SGD/conv priors, L2/early-stop mechanics, NIST AI RMF, MIT/NPTEL courseware). It already covers *how dropout/L2/SGD-schedules work mechanically* — this file does NOT repeat that; it covers what goes WRONG and the decision a practitioner makes to avoid it.
- [`ai-training-source-atlas.md`](ai-training-source-atlas.md) — the LINK directory of living free resources.
- This file — the **gotcha + WHY + the expert's avoidance**, each cited inline.

Every claim below is confirmed against a free/legal primary source. The intent is that an ai-training engineer reads this *before* training a GNN tier-5 retrain, a LoRA-from-vault adapter, or a RAG retrieval change, and recognizes the trap before falling into it.

---

## 1. Data leakage & train/test contamination — the silent inflator

The single most common way a model "works" in the notebook and fails in production: information from the evaluation set bled into training. The metric looks great and is a lie.

### Gotcha 1.1 — Fitting preprocessing on the FULL dataset before splitting leaks the test set into training
**WHY it bites:** any transform that *learns* parameters from data — `StandardScaler`, `SimpleImputer`, `PCA`, `SelectKBest` feature selection — sees the test rows during `fit` if you transform before you split. scikit-learn's own pitfalls guide demonstrates this with feature selection on random data: the leaky order scores **0.76 accuracy on data that is pure noise** (should be ~0.5), purely from the leak; doing the split first drops it back to the honest 0.5. The docs state the rule flatly: **"The general rule is to never call `fit` on the test data"** and warn the risk **"is relevant with almost all transformations in scikit-learn, including (but not limited to) `StandardScaler`, `SimpleImputer`, and `PCA`."** ([scikit-learn — Common Pitfalls](https://scikit-learn.org/stable/common_pitfalls.html))
**Expert's avoidance:** split FIRST, then `fit_transform` on train and `transform` (never `fit`) on test — or, better, wrap the whole chain in a `Pipeline` so the framework structurally cannot leak: *"The scikit-learn pipeline is a great way to prevent data leakage as it ensures that the appropriate method is performed on the correct data subset."* For PRISM: any feature-normalization or embedding-fit step feeding the GNN tier-5 or a LoRA dataset must be fit on the *train* split of the ghost/vault corpus only, never the held-out reference pool.

### Gotcha 1.2 — Grouped / non-i.i.d. samples leak through a random split even when the split itself is "correct"
**WHY it bites:** if multiple rows share a hidden group (same subject, same machine, same source document, same part-family), a plain K-fold or random split can put rows from one group in BOTH train and test. A model "flexible enough to learn from highly person-specific features" then scores well by *recognizing the group*, not by generalizing. scikit-learn: *"While i.i.d. data is a common assumption in machine learning theory, it rarely holds in practice"* — and **`GroupKFold` "ensures that the same group is not represented in both testing and training sets."** ([scikit-learn — Cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html))
**Expert's avoidance:** identify the grouping key before splitting and use group-aware CV (`GroupKFold`) or time-series-aware CV for temporally generated data. For PRISM's heterogeneous system-graph, nodes from the same galaxy/engine-family are NOT independent — a tier-5 holdout that splits engines randomly within a family can over-report; split by family/galaxy to measure true inductive generalization.

---

## 2. Overfitting & evaluation-set discipline — protect the test set like a one-shot resource

### Gotcha 2.1 — The test set "wears out" every time you peek at it
**WHY it bites:** each time you tune a hyperparameter or pick a model based on test-set score, a little knowledge of the test set leaks into your choices — *"like a teacher 'teaching to the test,' the model inadvertently fits the test set."* The result: a test score that no longer estimates real-world performance. ([Google ML Crash Course — Dividing datasets](https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets))
**Expert's avoidance:** iterate on a **validation** set; touch the **test** set exactly ONCE, at the very end, as a final confirmation — never for repeated decisions. scikit-learn formalizes the same hazard for hyperparameter search: *"the parameters can be tweaked until the estimator performs optimally. This way, knowledge about the test set can 'leak' into the model and evaluation metrics no longer report on generalization performance."* Use CV folds for tuning and keep a final test set genuinely held out. For PRISM: the NN-EVAL reference-pool holdout is a one-shot gate — do not iterate config against it; iterate on a separate validation slice.

### Gotcha 2.2 — Generalization rests on three assumptions that silently break in the field
**WHY it bites:** good generalization is not free — it assumes (1) examples are **i.i.d.** (*"your examples can't influence each other"*), (2) the distribution is **stationary** (*"the dataset doesn't change significantly over time"*), and (3) train/validation/test/real-world partitions share **the same distribution**. Overfitting happens when *"the training set doesn't adequately represent real life data"* or *"the model is too complex."* ([Google ML Crash Course — Overfitting](https://developers.google.com/machine-learning/crash-course/overfitting/overfitting))
**Expert's avoidance:** treat these three as a pre-flight checklist, not background theory. Before trusting any metric, ask: are my examples actually independent (1.2)? Is my data stationary, or am I training on last quarter and deploying next quarter (§5)? Do my splits come from the same generative process as production? A passing metric under a violated assumption is not evidence.

---

## 3. Class imbalance — accuracy is a liar on skewed data

### Gotcha 3.1 — A model that learns nothing can still score 99% accuracy
**WHY it bites:** on a heavily imbalanced dataset, the majority-class-only predictor wins on accuracy. Google's worked example: *"a model that predicts negative 100% of the time would score 99% on accuracy, despite being useless"* when the positive class is 1%. ([Google ML Crash Course — Accuracy, precision, recall](https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall))
**Expert's avoidance:** drop accuracy as the headline metric for imbalanced problems — the guidance is explicit that **F1 "balances the importance of precision and recall, and is preferable to accuracy for class-imbalanced datasets."** Decide whether false negatives or false positives are costlier and pick the metric accordingly; remember precision and recall *"often show an inverse relationship, where improving one of them worsens the other"* — so report the trade-off (PR curve / threshold), not a single point. For PRISM's tier-5, where most graph edges are negatives, this is exactly why NN-EVAL grades on AUROC + Brier and macro-F1, not raw accuracy — and why the selective-deploy abstain pattern matters more than a headline number.

---

## 4. LoRA & RAG — the two highest-leverage config decisions, and where they go wrong

### Gotcha 4.1 — LoRA rank `r` is a capacity dial, and high `r` can DEGRADE with the default scaling
**WHY it bites:** rank `r` sets the size of the low-rank update matrices — *"Lower rank results in smaller update matrices with fewer trainable parameters"* (and less capacity). Naively cranking `r` for "more power" can backfire: the standard LoRA scalar `lora_alpha/r` means performance *"can degrade at higher ranks due to scaling issues."* ([Hugging Face PEFT — LoRA conceptual guide](https://huggingface.co/docs/peft/main/en/conceptual_guides/lora))
**Expert's avoidance:** when you raise rank, switch to rank-stabilized scaling — the PEFT docs cite research showing `lora_alpha/sqrt(r)` (set `use_rslora=True`) *"stabilizes the adapters and unlocks the increased performance potential from higher ranks."* Treat `r`, `lora_alpha`, and the scaling mode as a recorded triple in the adapter checkpoint, not magic constants. (The specific rank/alpha *numbers* for any PRISM adapter stay india-gated in `_staging/` — this gotcha is the technique, not a value.)

### Gotcha 4.2 — Which modules you target matters; "attention blocks only" is the default for a reason
**WHY it bites:** LoRA can in principle attach to any weight matrix, but *"for simplicity and further parameter efficiency, in Transformer models LoRA is typically applied to attention blocks only."* Targeting everything inflates trainable parameters and erodes the efficiency that motivated LoRA in the first place. ([Hugging Face PEFT — LoRA conceptual guide](https://huggingface.co/docs/peft/main/en/conceptual_guides/lora))
**Expert's avoidance:** start from the attention-block default and expand `target_modules` deliberately and measurably, not by reflex. The parameter count and the chosen modules are part of the adapter's provenance record.

### Gotcha 4.3 — RAG chunk size is a Goldilocks problem, and you must measure it in TOKENS
**WHY it bites:** naive fixed-length splitting *"has the risk of cutting in half paragraphs or even sentences,"* and the right size is bounded on both ends — *"not too small to be sufficient for supporting an answer, and not too large too avoid diluting individual ideas."* Worse, splitting by characters mismatches the embedder, which thinks in tokens: *"for subsequent embedder that processes token, measuring length in tokens is more relevant and empirically performs better."* ([Hugging Face Cookbook — RAG Evaluation](https://huggingface.co/learn/cookbook/en/rag_evaluation))
**Expert's avoidance:** chunk on token counts with semantic-aware boundaries, and treat chunk size as a tuned hyperparameter — the cookbook found *"tuning the chunk size is both easy and very impactful,"* and warns *"there is no single good recipe: you should try several different directions."* Critically, the cookbook's own end-to-end "answer correctness" metric does NOT separate retrieval quality from generation quality — a known limitation. The expert evaluates **retrieval** (did the right chunk get fetched?) separately from **generation** (given the chunk, was the answer right?), so a regression can be localized instead of guessed.

---

## 5. Distribution / covariate shift — the model that aces test and dies in deployment

### Gotcha 5.1 — Three named shifts, three different fixes; conflating them masks the real failure
**WHY it bites:** *Dive into Deep Learning* names three: **covariate shift** — the input distribution `P(x)` changes but `P(y|x)` is fixed (train on real cat/dog photos, deploy on cartoons); **label shift** — the label marginal `P(y)` changes but the class-conditional `P(x|y)` is fixed (a disease's prevalence rises, symptoms unchanged); **concept shift** — *"the very definitions of labels can change"* (regional "pop" vs "soda"). The textbook's blunt warning: *"models appear to perform marvelously as measured by test set accuracy but fail catastrophically in deployment when the distribution of data suddenly shifts."* ([Dive into Deep Learning — Environment and distribution shift](https://d2l.ai/chapter_linear-classification/environment-and-distribution-shift.html))
**Expert's avoidance:** name the shift before correcting it — covariate shift wants importance-weighting / re-collection on inputs; label shift wants re-estimating the label prior; concept shift wants relabeling/retraining. And beware **feedback loops**: once decisions are *driven* by the model, behavior changes and breaks the original pattern (the textbook's loan-prediction anecdote) — deployment itself can corrupt model validity. For PRISM: a tier-5 trained on today's system-graph degrades as the graph evolves (new galaxies, renamed engines) — that is covariate/concept shift, and it is the standing argument for the self-retrain lifecycle, not a one-time train.

---

## 6. LLM generation & evaluation traps — where "the model is bad" is actually "the harness is wrong"

### Gotcha 6.1 — Default generation length is tiny; greedy decoding and wrong padding silently corrupt output
**WHY it bites:** three Hugging Face-documented pitfalls account for a large share of "the model is broken" reports: (1) `generate()` *"returns up to 20 tokens by default"* unless you set `max_new_tokens` — long answers get truncated and look like the model "stopped early"; (2) the default decoding is **greedy search**, which is fine for grounded tasks (translation/transcription) but produces flat/repetitive text for creative/chat use — *"not optimal for more creative use cases"*; (3) batched inputs need **left padding** because *"LLMs aren't trained to continue generation from padding tokens"* — right-padding produces garbage like `'1, 2, 33333333333'`. ([Hugging Face Transformers — Text generation / Pitfalls](https://huggingface.co/docs/transformers/en/llm_tutorial))
**Expert's avoidance:** always set `max_new_tokens` explicitly; choose the decoding strategy to match the task (`do_sample=True` for creative, greedy/beam for grounded); set `padding_side="left"` for batched decoder-only generation. And feed instruction-tuned models the **chat template** — passing a raw string when the model expects `apply_chat_template` *"doesn't always return the expected output."* Rule out the harness before blaming the weights.

### Gotcha 6.2 — An LLM-as-a-judge is itself an unvalidated model; never trust its scores until you correlate them with humans
**WHY it bites:** practitioners reach for an LLM judge to score outputs at scale, but it has biases and *"you need to set it up carefully for good results."* Two documented traps: LLMs *"suck at evaluating outputs in continuous ranges,"* so a 0.0–1.0 float scale gives noisy, inconsistent scores; and a vague rubric yields *"outputs [that] will not be consistent enough."* Even a well-built judge cannot be assumed correct. ([Hugging Face Cookbook — Using LLM-as-a-judge](https://huggingface.co/learn/cookbook/en/llm_judge); rubric-scale point corroborated in the [RAG Evaluation cookbook](https://huggingface.co/learn/cookbook/en/rag_evaluation))
**Expert's avoidance:** use a **bounded integer scale** with explicit per-level criteria (e.g. 1="terrible" … 4="excellent"), add a reasoning field before the score, and — non-negotiably — **validate the judge against a small human-labeled set (~30 examples) using Pearson correlation** before trusting it; the cookbook lifted judge↔human correlation from 0.567 to 0.843 purely by refining the prompt, and notes you *"can never reach 100%"* because human ground truth is itself noisy. For PRISM: any Ollama/Claude-as-judge step in a closed-loop training signal must carry a recorded human-correlation baseline, or its scores are decoration, not evaluation.

---

## 7. Single-seed metric variance — the gotcha PRISM already learned the hard way

### Gotcha 7.1 — One seed's score is luck, not evidence — especially on small/capped data
**WHY it bites:** the same model can look good or bad depending only on the random seed that drew the split or initialized the weights. scikit-learn states it directly for cross-validation: when you pass a fixed integer seed, *"if the estimator performs well (or bad)… it might just be because we got lucky (or unlucky) with that specific seed,"* and recommends varying the RNG across folds for *"more robust CV results."* The flip side — reproducibility — requires removing every `random_state=None` so a run is repeatable at all. ([scikit-learn — Common Pitfalls: controlling randomness](https://scikit-learn.org/stable/common_pitfalls.html); [scikit-learn — Cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html))
**Expert's avoidance:** report a metric as a distribution over **>=3 seeds** (mean + spread / confidence interval), never a single point estimate — and pin seeds for reproducibility while *varying* them for robustness measurement. This is exactly PRISM's standing doctrine: [[feedback_multiseed_before_auroc_claim]] — a single-seed AUROC lift on a capped subgraph is high-variance noise (a documented PRISM case had +0.118 on one seed flip to -0.049 on another). The framework guidance above is the external, papa-verifiable backing for that hard-won fleet lesson: a single-seed metric is a point estimate masquerading as a result.

---

## Owner-gate (NOT promoted)

Everything above is a **qualitative technique / failure-mode** confirmed against free framework docs, courseware, or an open textbook — papa-verifiable, no PRISM-specific or benchmark-specific number asserted as ground truth. The following remain **india-gated** in `knowledge/wiki/ai-training/_staging/` and are NOT asserted here:
- Any specific **LoRA rank/alpha values** for a given PRISM adapter, DoRA/LoRA+ relative-lift figures (§4.1/4.2 give the *technique and direction* only — arXiv:2106.09685 / 2312.03732 method numbers stay gated).
- Any specific **RAG chunk-token size** chosen for a PRISM corpus, DPR-vs-BM25 lift percentages (§4.3 gives the Goldilocks *principle* only).
- Any **PRISM-measured eval number** (tier-5 AUROC/Brier/macro-F1, the Murphy reliability decomposition, the calibration dead-end finding) — those live in CLAUDE.md §NN-GRAPH and the staging packet and are owned by india.
- The **specific judge↔human correlation baseline** for any PRISM closed-loop judge (§6.2 gives the *requirement*; the measured value is per-pipeline and india-owned).

These are gated on ownership, not doubt — india owns the ai-training method layer and should be the one to assert any number as PRISM ground-truth. No safety/physics constants are involved (non-physics galaxy).

## Sources

All fetched and confirmed on **2026-06-10**; each is free + legal (official framework docs, free vendor courseware, or an open-access textbook). None duplicate the foundations-file source list (those cite course/chapter *theory*; these cite *practitioner-pitfall* pages):
1. scikit-learn — *Common Pitfalls and Recommended Practices* (data leakage, preprocessing-fit rule, Pipeline, controlling randomness/seeds) — https://scikit-learn.org/stable/common_pitfalls.html
2. scikit-learn — *Cross-validation: evaluating estimator performance* (test-set leak via tuning, held-out final test set, GroupKFold for non-i.i.d.) — https://scikit-learn.org/stable/modules/cross_validation.html
3. Google — *ML Crash Course: Overfitting* (i.i.d. / stationarity / same-distribution generalization conditions; memorization) — https://developers.google.com/machine-learning/crash-course/overfitting/overfitting
4. Google — *ML Crash Course: Dividing datasets* (test set "wears out," validation-then-one-shot-test discipline) — https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets
5. Google — *ML Crash Course: Accuracy, precision, and recall* (accuracy trap on imbalanced data, F1 preferred, precision/recall trade-off) — https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall
6. Hugging Face — *PEFT LoRA conceptual guide* (rank trade-off, rsLoRA `alpha/sqrt(r)` scaling, attention-block target modules) — https://huggingface.co/docs/peft/main/en/conceptual_guides/lora
7. Hugging Face — *Cookbook: RAG Evaluation* (chunk Goldilocks, measure-in-tokens, "no single recipe," retrieval-vs-generation separation limitation) — https://huggingface.co/learn/cookbook/en/rag_evaluation
8. Dive into Deep Learning (open-access textbook) — *Environment and Distribution Shift* (covariate / label / concept shift, silent deployment failure, feedback loops) — https://d2l.ai/chapter_linear-classification/environment-and-distribution-shift.html
9. Hugging Face — *Transformers: Text generation / Pitfalls* (default 20-token cap, greedy vs sampling, left padding, chat-template format) — https://huggingface.co/docs/transformers/en/llm_tutorial
10. Hugging Face — *Cookbook: Using LLM-as-a-judge* (bounded integer scale, validate against human Pearson correlation, ground-truth noise ceiling) — https://huggingface.co/learn/cookbook/en/llm_judge

## Cross-refs
- Theory spine (no overlap): [`ai-training-foundations.md`](ai-training-foundations.md)
- Living free-resource directory: [`ai-training-source-atlas.md`](ai-training-source-atlas.md)
- india-gated method specifics: `knowledge/wiki/ai-training/_staging/deep-domain-research-2026-06-09.md`
- Galaxy brain: `mcp-server/src/engines/ai-training/MEMORY.md`
- CLAUDE.md §NN-GRAPH (GraphSAGE tier-5, deploy gates, selective-deploy, calibration dead-end) · §AI SYSTEM ROUTING
- [[feedback_multiseed_before_auroc_claim]] (the single-seed-variance doctrine §7 externally backs)
- [[reference_vault_to_ai_feeders_2026_06_09]] (LoRA-from-vault + GNN ref-pool feeders)

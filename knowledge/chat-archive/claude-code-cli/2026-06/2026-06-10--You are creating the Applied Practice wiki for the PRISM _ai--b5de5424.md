---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"ai-training\" galaxy (o"
date: "2026-06-10"
first_ts: "2026-06-10T10:13:44.635Z"
last_ts: "2026-06-10T10:18:25.576Z"
cwd: "H:\\prism"
messages: 48
user_msgs: 19
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_50266bf2-d45/agent-a497206e079915d17.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "ai-training" galaxy (o

> **claude-code-cli** | 2026-06-10 | 48 msgs (19 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_50266bf2-d45/agent-a497206e079915d17.jsonl`

## Transcript

### User | 2026-06-10T10:13:44.635Z

You are creating the Applied Practice wiki for the PRISM "ai-training" galaxy (owner: india): knowledge/wiki/ai-training/ai-training-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won gotchas, FAILURE MODES, and TECHNIQUE DECISIONS a world-class ai-training practitioner has that pure theory does not teach. This is DISTINCT from ai-training-foundations.md (theory) and ai-training-source-atlas.md (link directory) if those exist -- read them first so you do not repeat them.

FOCUS for ai-training: ML / AI-systems practitioner gotchas: data leakage + train/test contamination, overfitting + val/test split discipline, class imbalance, RAG chunking + retrieval-eval pitfalls, LoRA rank / target-module choice, prompt-eval traps, distribution/covariate shift, single-seed metric variance (high-variance AUROC on small subgraphs -- matches PRISM multi-seed lesson). Free papa-verifiable software sources: d2l.ai, Hugging Face docs/learn, Google ML crash course / rules-of-ML, fast.ai, arXiv abstracts.
Qualitative practitioner technique + gotchas. CS/software/ML claims here are papa-verifiable -- cite framework docs / courses / papers. Leave any benchmark-specific numbers owner-gated.

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (framework official docs, university course, gov, reputable practitioner reference, arXiv). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-14 cited gotchas/technique notes across 4-6 themed sections (e.g. "## Common failure modes", "## Technique decisions", "## Verification/eval"). Each = the gotcha + WHY + the expert's avoidance, source cited inline.
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: ai-training, owner_slot: india, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT pro
... [+503 chars truncated]

### Assistant | 2026-06-10T10:13:52.750Z

I'll start by reading the existing ai-training wiki files to avoid repeating content, then verify claims via WebFetch.

### Assistant | 2026-06-10T10:13:54.163Z

[tool_use: Bash]

### Assistant | 2026-06-10T10:13:54.218Z

[tool_use: Glob]

### User | 2026-06-10T10:14:01.686Z

[tool_result] total 44
drwxr-xr-x 1 wompu 197611     0 Jun 10 04:33 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 05:11 ../
drwxr-xr-x 1 wompu 197611     0 Jun  9 21:16 _staging/
-rw-r--r-- 1 wompu 197611 22596 Jun 10 02:39 ai-training-foundations.md
-rw-r--r-- 1 wompu 197611  9949 Jun 10 04:33 ai-training-source-atlas.md

### User | 2026-06-10T10:14:04.951Z

[tool_result] knowledge\wiki\ai-training\ai-training-foundations.md
knowledge\wiki\ai-training\ai-training-source-atlas.md

### Assistant | 2026-06-10T10:14:24.803Z

Both sibling files exist. Let me read them to avoid repeating their content.

### Assistant | 2026-06-10T10:14:25.200Z

[tool_use: Read]

### Assistant | 2026-06-10T10:14:25.284Z

[tool_use: Read]

### User | 2026-06-10T10:14:26.607Z

[tool_result] 1	---
2	title: AI-Training Foundations — deep-learning theory, graph ML, regularization, AI governance & evaluation
3	galaxy: ai-training
4	owner_slot: india
5	status: VERIFIED-PARTIAL
6	verified_by: papa-deepen-workflow (2026-06-09)
7	verification_method: institutional + courseware + textbook + gov-framework facts WebFetch-confirmed against primary free/legal sources (Stanford CS224W course page,
... [+22517 chars truncated]

### User | 2026-06-10T10:14:26.778Z

[tool_result] 1	---
2	title: AI-Training Open Source Atlas — living free+legal resources for ML / GNN / LoRA / RAG / deep-learning systems
3	galaxy: ai-training
4	owner_slot: india
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-source-atlas (2026-06-10)"
7	verification_method: "Each URL below was fetched with WebFetch on 2026-06-10 and confirmed to resolve to live, on-topic, free/legal content (course homepage
... [+9595 chars truncated]

### Assistant | 2026-06-10T10:14:32.871Z

Now I understand both sibling files. The foundations file covers theory (CS224W, d2l.ai chapters, NIST AI RMF, MIT courses) and the atlas is a link directory. My applied-practice file must be DISTINCT: the practitioner gotchas and failure-mode TECHNIQUE decisions. Importantly, the foundations file already covers dropout mechanics, L2/early-stopping, SGD schedules, and convolution priors — I must NOT repeat those. I'll focus on:
- Data leakage / train-test contamination
- Overfitting + val/test split discipline (the practitioner's "test set is a one-time use" discipline)
- Class imbalance pitfalls
- RAG chunking + retrieval-eval pitfalls
- LoRA rank/target-module choice
- Prompt-eval traps
- Distribution/covariate shift
- Single-seed metric variance

Let me verify each claim by WebFetch on reputable free sources. Starting with a batch of parallel fetches.

### Assistant | 2026-06-10T10:14:34.842Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:14:36.481Z

[tool_use: WebFetch]

### User | 2026-06-10T10:14:39.061Z

[tool_result] I've reviewed the webpage content provided, but I cannot extract the specific practitioner guidance you're requesting. The page shows only the navigation structure and heading for "Generalization" along with a note that "Watch the video below to learn about a common problem ML practitioners face when training a model on their training dataset."

The actual detailed content about:
- Three key princ
... [+539 chars truncated]

### User | 2026-06-10T10:14:41.762Z

[tool_result] # Guidance on Dividing Data Sets

## Recommended Split

The page recommends dividing data into three subsets:
- **Training set**: ~70% for model training
- **Validation set**: ~15% for initial testing during training
- **Test set**: ~15% for final evaluation

## Danger of Repeated Test Set Use

The document warns that using the test set repeatedly causes it to "wear out." Specifically: *"the more 
... [+822 chars truncated]

### Assistant | 2026-06-10T10:14:44.623Z

Good — the dividing-datasets fetch succeeded. Let me retry generalization with a more targeted prompt, and fetch additional sources in parallel.

### Assistant | 2026-06-10T10:14:46.990Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:14:48.780Z

[tool_use: WebFetch]

### User | 2026-06-10T10:14:53.338Z

[tool_result] # Overfitting and Generalization Guidance

## Definition of Overfitting
A model that "matches (_memorizes_) the training set so closely that the model fails to make correct predictions on new data."

## Three Conditions for Good Generalization

The page specifies these dataset requirements:

1. **Independence & Identical Distribution (i.i.d.)**: "Examples must be independently and identically dist
... [+943 chars truncated]

### User | 2026-06-10T10:14:54.686Z

[tool_result] # Accuracy's Limitations with Imbalanced Datasets

## Why Accuracy Fails

The document provides a concrete example: "For heavily imbalanced datasets, where one class appears very rarely, say 1% of the time, a model that predicts negative 100% of the time would score 99% on accuracy, despite being useless."

This demonstrates how accuracy becomes misleading when classes are unbalanced—a model can a
... [+954 chars truncated]

### Assistant | 2026-06-10T10:14:57.518Z

Three strong gotchas confirmed (split discipline, generalization conditions, class imbalance/accuracy). Now let me verify RAG chunking, LoRA, prompt-eval, distribution shift, and data leakage from the appropriate sources.

### Assistant | 2026-06-10T10:15:00.344Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:15:02.344Z

[tool_use: WebFetch]

### User | 2026-06-10T10:15:06.524Z

[tool_result] # LoRA Practitioner Guidance

## Rank (r) and Parameter Trade-offs

**Definition and Trade-off:**
> "the rank of the update matrices, expressed in `int`. Lower rank results in smaller update matrices with fewer trainable parameters."

The documentation explicitly states the trade-off: lower `r` values reduce trainable parameters but presumably reduce model capacity, while higher `r` increases both
... [+1438 chars truncated]

### User | 2026-06-10T10:15:08.854Z

[tool_result] # RAG Evaluation Guidance from the Notebook

## On Chunking Trade-offs

The notebook explicitly addresses the chunk size problem:

> "split every `n` words / characters, but this has the risk of cutting in half paragraphs or even sentences"

and notes that chunks should be "not too small to be sufficient for supporting an answer, and not too large too avoid diluting individual ideas."

The guidanc
... [+1062 chars truncated]

### Assistant | 2026-06-10T10:15:14.212Z

Excellent — LoRA and RAG both confirmed with strong specifics. Now distribution shift, data leakage, and a prompt/LLM-eval source.

### Assistant | 2026-06-10T10:15:16.851Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:15:18.646Z

[tool_use: WebFetch]

### User | 2026-06-10T10:15:23.252Z

[tool_result] # Distribution Shift in Machine Learning: Definitions and Examples

## Core Definitions

**Covariate Shift:** The textbook defines this as occurring when "the distribution of inputs may change over time" but "the conditional distribution P(y | x) does not change." The canonical example contrasts training photos of cats and dogs with test data showing only cartoon versions.

**Label Shift:** Descri
... [+1136 chars truncated]

### User | 2026-06-10T10:15:31.330Z

[tool_result] # Data Leakage, Inconsistent Preprocessing, and Randomness Guidance

## Data Leakage from Preprocessing on Full Dataset

The documentation explicitly warns against fitting preprocessing on the entire dataset before splitting:

> "Although both train and test data subsets should receive the same preprocessing transformation (as described in the previous section), it is important that these transfor
... [+3919 chars truncated]

### Assistant | 2026-06-10T10:15:39.487Z

Two more strong gotchas: distribution shift (covariate/label/concept) and data leakage from preprocessing. The scikit-learn page also gives me the seed/randomness gotcha (cross-validation robustness — ties directly to PRISM's multi-seed doctrine). Now let me get a prompt-eval / LLM-evaluation gotcha source and a cross-validation pitfall source to round out the eval section.

### Assistant | 2026-06-10T10:15:42.151Z

[tool_use: WebFetch]

### User | 2026-06-10T10:15:43.019Z

[tool_result] # Text generation

Text generation is the most popular application for large language models (LLMs). A LLM is trained to generate the next word (token) given some initial text (prompt) along with its own generated outputs up to a predefined length or when it reaches an end-of-sequence (`EOS`) token.

In Transformers, the [generate()](/docs/transformers/v5.10.2/en/main_classes/text_generation#trans
... [+15480 chars truncated]

### Assistant | 2026-06-10T10:15:44.204Z

[tool_use: WebFetch]

### User | 2026-06-10T10:15:57.412Z

[tool_result] # Cross-Validation: Information Leakage and Overfitting

## Why Single Train/Test Split and Hyperparameter Tuning on Test Set Leaks Information

The documentation explicitly warns:

> "Learning the parameters of a prediction function and testing it on the same data is a methodological mistake: a model that would just repeat the labels of the samples that it has just seen would have a perfect score
... [+3663 chars truncated]

### Assistant | 2026-06-10T10:16:01.160Z

I now have a very strong set of confirmed gotchas across all the requested themes. Let me do two final fetches to round out the prompt-eval / LLM-judge trap with a dedicated source, and the single-seed variance angle directly tied to PRISM's multi-seed lesson.

### Assistant | 2026-06-10T10:16:03.285Z

[tool_use: WebFetch]

### User | 2026-06-10T10:16:08.600Z

[tool_result] # Evaluation Guidance in the Provided Content

Based on my review of the web page content above, **there is no discussion of LLM evaluation methods, benchmark contamination, real-world use case limitations, or LLM-as-a-judge evaluation approaches**.

The document focuses exclusively on LoRA (Low-Rank Adaptation) as a parameter-efficient fine-tuning technique. It covers:

- How LoRA reduces trainab
... [+506 chars truncated]

### Assistant | 2026-06-10T10:16:12.803Z

That URL was the LoRA chapter, not evaluation. Let me retry with the correct HF LLM course evaluation chapter.

### Assistant | 2026-06-10T10:16:14.687Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:16:16.510Z

[tool_use: WebFetch]

### User | 2026-06-10T10:16:18.257Z

[tool_result] This page does not discuss LLM evaluation, benchmarks, benchmark contamination, or LLM-as-a-judge pitfalls.

**Topic covered:** The page provides a practical guide to implementing Group Relative Policy Optimization (GRPO) using the TRL library, including dataset setup, reward function design, and training configuration.

### User | 2026-06-10T10:16:22.553Z

[tool_result] # LLM-as-a-Judge: Guidance and Pitfalls

## Core Guidance on Implementation

The article emphasizes that **careful setup is essential**: "you need to set it up carefully for good results." Success requires three key improvements:

1. **Use a bounded integer scale** rather than continuous ranges, as "LLMs suck at evaluating outputs in continuous ranges"

2. **Provide clear criteria descriptions**, 
... [+1099 chars truncated]

### Assistant | 2026-06-10T10:16:32.581Z

The LLM-judge cookbook fetch succeeded with strong, specific guidance. I now have more than enough confirmed gotchas (10+ distinct, well-cited). Let me tally what I have confirmed:

1. **Train-on-test data leakage / generalization conditions** (Google ML Crash Course — overfitting: i.i.d., stationarity, same distribution)
2. **Test-set "wears out" / split discipline** (Google ML Crash Course — dividing datasets)
3. **Preprocessing data leakage** (scikit-learn common pitfalls — fit only on train, Pipeline)
4. **Reproducibility/seed control + CV seed luck** (scikit-learn common pitfalls — random_state)
5. **Class imbalance / accuracy trap** (Google ML Crash Course — accuracy/precision/recall)
6. **Hyperparameter tuning leaks into test set + GroupKFold for non-i.i.d.** (scikit-learn cross-validation)
7. **Distribution shift: covariate/label/concept** (d2l.ai environment-and-distribution-shift)
8. **LoRA rank trade-off + rsLoRA scaling + attention-only target modules** (HF PEFT LoRA conceptual guide)
9. **RAG chunk-size Goldilocks + measure in tokens** (HF cookbook rag_evaluation)
10. **LLM generation pitfalls: default max_new_tokens=20, padding side, chat template** (HF transformers llm_tutorial)
11. **LLM-as-judge traps: continuous scale fails, must validate vs human Pearson correlation** (HF cookbook llm_judge)

That's 11 distinct sources covering all the requested themes. Now I'll write the file.

### Assistant | 2026-06-10T10:18:16.531Z

[tool_use: Write]

### User | 2026-06-10T10:18:19.038Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\ai-training\ai-training-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T10:18:25.576Z

The file was created successfully. The Write hook fired advisory context only (no block). The file is distinct from both sibling files — it covers practitioner gotchas/failure modes, not theory or links.

GALAXY: ai-training
FILE: knowledge/wiki/ai-training/ai-training-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 11
SOURCES: 10
NUMERICS_LEFT_GATED: yes
NOTE: Fitting preprocessing (scaler/PCA/feature-select) on the full dataset before the train/test split silently leaks the test set and inflates the metric -- scikit-learn proves it scores 0.76 on pure-noise data; split first, then Pipeline.

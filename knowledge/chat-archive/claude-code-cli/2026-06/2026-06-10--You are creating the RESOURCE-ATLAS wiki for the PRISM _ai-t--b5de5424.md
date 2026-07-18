---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"ai-training\" galaxy (own"
date: "2026-06-10"
first_ts: "2026-06-10T19:47:42.470Z"
last_ts: "2026-06-10T19:51:47.178Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 20
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_32aa7fc5-878/agent-ac259df569263a54c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "ai-training" galaxy (own

> **claude-code-cli** | 2026-06-10 | 47 msgs (20 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_32aa7fc5-878/agent-ac259df569263a54c.jsonl`

## Transcript

### User | 2026-06-10T19:47:42.470Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "ai-training" galaxy (owner: india): knowledge/wiki/ai-training/ai-training-resource-atlas.md.

PURPOSE (operator directive -- all reputable sources linked for EASY ACCESS, do not stay stagnant): a single easy-access index that links EVERY resource for this domain -- the LOCAL stores/corpora, curated YouTube + free seminars/webinars + data reports, and reputable free online -- so a chat in this galaxy jumps straight to what it needs. This FUSES the local half (given) with the online/video half. It is DISTINCT from [[ai-training-source-atlas]] (which is the free-college-course/textbook curriculum): the resource-atlas adds the LOCAL trove pointers + the video/seminar/data-report half + a one-stop cross-link hub.

LOCAL TROVE / STORES (pre-known -- LINK these exactly, do NOT fabricate or re-count; pathway = store/corpus + its index):
state/shared/nn-graph/ (GNN ref-pool + node-embeddings-768d.jsonl); LoRA datasets (vault-to-lora-dataset.mjs Alpaca triples); RAG corpus + tribal-embed-index; mcp-server/data/state/ model checkpoints

YOUTUBE + SEMINARS to curate (WebFetch-VERIFY each before listing -- channel/playlist/page must resolve; drop on 404 after one retry): ML/DL channels + free lectures (Stanford CS229/CS224N/CS231N, Andrej Karpathy Zero-to-Hero, DeepLearning.AI, Hugging Face)
REPUTABLE FREE ONLINE to curate (same verify rule): free: d2l.ai Dive into Deep Learning, fast.ai, Hugging Face course, arXiv (LoRA 2106.09685, RAG 2005.11401), Papers with Code
Prefer official + reputable educator/standards sources; FREE + LEGAL only (no LibGen/SciHub).

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given store/corpus pointers verbatim (verified). For YouTube/online: ONLY list a source you CONFIRM resolves via WebFetch; drop dead ones (retry once). Never fabricate a URL.
2. Cross-link the sibling wiki layers: [[ai-training-foundations]] (theory), [[ai-training-source-atlas]] (free courses/books), [[ai-training
... [+1133 chars truncated]

### Assistant | 2026-06-10T19:47:53.601Z

I'll create this resource atlas. Let me start by verifying the local trove pointers exist, then WebFetch-verify each online/video source before listing it.

### Assistant | 2026-06-10T19:47:55.470Z

[tool_use: Bash]

### User | 2026-06-10T19:48:05.156Z

[tool_result] H:/prism/state/shared/nn-graph//
H:/prism/state/shared/nn-graph/node-embeddings-768d.jsonl
H:/prism/scripts/vault-to-lora-dataset.mjs*
H:/prism/mcp-server/data/state//
H:/prism/knowledge/wiki/ai-training//

### Assistant | 2026-06-10T19:48:10.343Z

Local pointers confirmed: `state/shared/nn-graph/` + `node-embeddings-768d.jsonl`, `vault-to-lora-dataset.mjs`, `mcp-server/data/state/` all exist. The `tribal-embed-index.json` is gitignored at that path; let me confirm its location and check the sibling wiki files exist.

### Assistant | 2026-06-10T19:48:10.701Z

[tool_use: Glob]

### Assistant | 2026-06-10T19:48:11.167Z

[tool_use: Glob]

### User | 2026-06-10T19:48:31.961Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-10T19:48:32.633Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-10T19:48:38.246Z

Let me narrow the searches to specific paths.

### Assistant | 2026-06-10T19:48:39.895Z

[tool_use: Bash]

### User | 2026-06-10T19:48:57.954Z

[tool_result] _staging/
ai-training-advanced-techniques.md
ai-training-applied-practice.md
ai-training-foundations.md
ai-training-source-atlas.md
---tribal---
state/shared/tribal-embed-index.manifest.json
---primary-domain-resource-map---
knowledge/wiki/architecture/primary-domain-resource-map.md

### Assistant | 2026-06-10T19:49:05.303Z

All sibling wiki layers exist (`ai-training-foundations`, `ai-training-source-atlas`, `ai-training-applied-practice`, `ai-training-advanced-techniques`), `primary-domain-resource-map` exists in `architecture/`, and the tribal index is currently a sharded manifest at `state/shared/tribal-embed-index.manifest.json`. The target file does NOT yet exist.

Now let me WebFetch-verify each online/video source in parallel before listing any of them.

### Assistant | 2026-06-10T19:49:06.194Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:49:07.114Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:49:08.120Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:49:09.449Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:49:09.982Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:49:10.565Z

[tool_use: WebFetch]

### User | 2026-06-10T19:49:22.864Z

[tool_result] Yes, this is Andrej Karpathy's Neural Networks: Zero to Hero course page.

**Title:** "Neural Networks: Zero to Hero"

**Confirmation:** The page describes itself as "A course by Andrej Karpathy on building neural networks, from scratch, in code." It covers foundational concepts like backpropagation through to modern architectures such as GPT, with a syllabus containing seven video lectures rangin
... [+33 chars truncated]

### User | 2026-06-10T19:49:24.072Z

[tool_result] # Hugging Face Learn Hub Confirmation

Yes, this is the Hugging Face Learn/courses hub. The page displays a comprehensive collection of educational resources.

## Available Courses:

1. **LLM Course** - "teach you about large language models using libraries from the HF ecosystem"
2. **Context Course** - Focuses on context engineering for code agents
3. **Robotics Course** - "teach you to build rob
... [+691 chars truncated]

### User | 2026-06-10T19:49:24.653Z

[tool_result] # Official Stanford CS231N Course Page

Yes, this is the official Stanford CS231N course page. The course title is **"CS231n: Deep Learning for Computer Vision"** for Stanford's Spring 2026 offering.

The page confirms its official status through several indicators:
- It displays Stanford University branding and logos
- It lists official instructors (Fei-Fei Li, Ehsan Adeli, Justin Johnson, and ot
... [+268 chars truncated]

### User | 2026-06-10T19:49:24.875Z

[tool_result] # CS229: Machine Learning Course Confirmation

Yes, this is the official Stanford CS229 Machine Learning course page. The content clearly identifies itself as such through multiple references to "CS229" and Stanford branding.

**Course Title:** "CS229: Machine Learning"

**Current Offering:** Spring 2026

**Course Description Summary:** The page describes this as "a broad introduction to machine l
... [+549 chars truncated]

### User | 2026-06-10T19:49:27.146Z

[tool_result] # DeepLearning.AI Official Site Confirmation

**Yes, this is the official DeepLearning.AI website.**

## What It Offers

DeepLearning.AI is an educational platform providing AI and machine learning resources. Key offerings include:

**Courses & Learning:**
- "Start or Advance Your Career in AI" through structured courses and specializations
- Recent addition: Fast & Efficient LLM Inference with vL
... [+567 chars truncated]

### User | 2026-06-10T19:49:28.511Z

[tool_result] # Confirmation: Official Stanford CS224N Course Page

Yes, this is the official Stanford CS224N course page. The document resolves to the current Winter 2026 offering.

**Course Title:** "CS224N: Natural Language Processing with Deep Learning"

The page clearly identifies itself as the official course website, featuring:
- Current instructor information (Diyi Yang and Yejin Choi for Winter 2026)
-
... [+378 chars truncated]

### Assistant | 2026-06-10T19:49:32.313Z

All 6 verified. Now the reputable free online + data report sources.

### Assistant | 2026-06-10T19:49:33.448Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:49:34.242Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:49:35.203Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:49:36.768Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:49:37.657Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:49:37.990Z

[tool_use: WebFetch]

### User | 2026-06-10T19:49:44.462Z

[tool_result] Yes, this arXiv page resolves correctly. The paper is indeed the LoRA paper.

**Title:** "LoRA: Low-Rank Adaptation of Large Language Models"

**Authors:** Edward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang, and Weizhu Chen

**Identifier:** arXiv:2106.09685

The abstract describes a method that "freezes the pre-trained model weights and injects trainable r
... [+218 chars truncated]

### User | 2026-06-10T19:49:44.463Z

[tool_result] Yes, this is the Hugging Face course on LLMs and NLP. The page title is "Introduction" and it serves as the opening to what was "originally focused on NLP (Natural Language Processing)" but "has evolved to emphasize Large Language Models (LLMs)."

The course teaches using Hugging Face libraries like Transformers, Datasets, Tokenizers, and Accelerate, covering both foundational NLP concepts and adv
... [+40 chars truncated]

### User | 2026-06-10T19:49:48.931Z

[tool_result] # Confirmation: Official fast.ai Course

Yes, this is the official fast.ai Practical Deep Learning for Coders course. The page resolves to the main course website and clearly identifies itself as such.

**Course Title:** "Practical Deep Learning for Coders"

The website confirms its authenticity through several indicators:
- It references the official fast.ai GitHub repository
- Jeremy Howard, who
... [+524 chars truncated]

### User | 2026-06-10T19:49:48.965Z

[tool_result] REDIRECT DETECTED: The URL redirects to a different host.

Original URL: https://paperswithcode.com/
Redirect URL: https://huggingface.co/papers/trending
Status: 302 Found

To complete your request, I need to fetch content from the redirected URL. Please use WebFetch again with these parameters:
- url: "https://huggingface.co/papers/trending"
- prompt: "Is this the Papers with Code site? Confirm i
... [+37 chars truncated]

### User | 2026-06-10T19:49:49.196Z

[tool_result] # Dive into Deep Learning Confirmation

Yes, this is the official "Dive into Deep Learning" interactive free book. The page clearly identifies itself as **"Dive into Deep Learning"** in the main heading and describes it as an "**Interactive** deep learning book with code, math, and discussions."

The resource is implemented across multiple frameworks (PyTorch, NumPy/MXNet, JAX, and TensorFlow) and
... [+226 chars truncated]

### User | 2026-06-10T19:49:49.197Z

[tool_result] # Confirmation

Yes, this arXiv page resolves successfully. 

**Paper Title:** "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"

**Authors:** Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich Küttler, Mike Lewis, Wen-tau Yih, Tim Rocktäschel, Sebastian Riedel, and Douwe Kiela

This is indeed the foundational RAG paper. The abs
... [+325 chars truncated]

### Assistant | 2026-06-10T19:49:59.689Z

Papers with Code now redirects (302) to Hugging Face Papers. Per the cross-host redirect rule, I'll follow it once to verify the destination resolves — and list the destination (HF Papers Trending) instead of the dead PwC URL.

### Assistant | 2026-06-10T19:50:00.716Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T19:50:01.769Z

[tool_use: WebFetch]

### User | 2026-06-10T19:50:09.286Z

[tool_result] # Hugging Face Trending Papers Hub

Yes, this is Hugging Face's Trending Papers section. It serves as a curated research discovery platform featuring the latest academic papers in AI and machine learning.

## What It Offers

**Paper Discovery & Curation:**
The platform aggregates trending research papers "by AK and the research community," enabling researchers to discover cutting-edge work across 
... [+907 chars truncated]

### User | 2026-06-10T19:50:25.006Z

[tool_result] # The Batch: DeepLearning.AI's AI Newsletter

Yes, this is "The Batch," the weekly AI news and insights newsletter by DeepLearning.AI.

## What It Offers

The Batch provides subscribers with curated coverage of current developments in artificial intelligence across multiple categories:

- **Weekly Issues** featuring top AI news stories
- **Andrew's Letters** - commentary from Andrew Ng
- **Data Po
... [+610 chars truncated]

### Assistant | 2026-06-10T19:50:33.030Z

All sources verified. Tally:
- **YouTube/seminars (video lecture series):** CS229, CS224N, CS231N, Karpathy Zero-to-Hero, DeepLearning.AI, Hugging Face Learn = 6
- **Reputable free online + data reports:** d2l.ai, fast.ai, HF LLM Course, arXiv LoRA, arXiv RAG, HF Papers (PwC successor), The Batch = 7

Now writing the file.

### Assistant | 2026-06-10T19:51:32.758Z

[tool_use: Write]

### User | 2026-06-10T19:51:38.102Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/ai-training/ai-training-resource-atlas.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T19:51:47.178Z

File created successfully. No file-claim hook blocked the Write. The new file is distinct from `ai-training-source-atlas` (curriculum) — confirmed by my earlier dir listing and the dedup advisory.

GALAXY: ai-training
FILE: knowledge/wiki/ai-training/ai-training-resource-atlas.md
CREATED: yes
LOCAL_POINTERS_LINKED: 4
YOUTUBE_VERIFIED: 6
ONLINE_VERIFIED: 7
NOTE: Karpathy "Neural Networks: Zero to Hero" (karpathy.ai/zero-to-hero.html) — a free, from-scratch backprop-to-GPT video series that maps directly onto the galaxy's local GNN/LoRA/RAG trove.

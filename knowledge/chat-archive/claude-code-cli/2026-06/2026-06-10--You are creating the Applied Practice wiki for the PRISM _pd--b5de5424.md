---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"pdf-corpus\" galaxy (ow"
date: "2026-06-10"
first_ts: "2026-06-10T15:51:52.993Z"
last_ts: "2026-06-10T15:56:00.861Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 10
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-a59248da82b48f343.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "pdf-corpus" galaxy (ow

> **claude-code-cli** | 2026-06-10 | 26 msgs (10 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-a59248da82b48f343.jsonl`

## Transcript

### User | 2026-06-10T15:51:52.993Z

You are creating the Applied Practice wiki for the PRISM "pdf-corpus" galaxy (owner: xray): knowledge/wiki/pdf-corpus/pdf-corpus-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won CS-engineering gotchas, FAILURE MODES, and TECHNIQUE DECISIONS that pure theory does not teach. DISTINCT from pdf-corpus-foundations.md (theory) -- read it first so you do not repeat it; this entry is "what goes wrong in practice and how an expert avoids it."

FOCUS for pdf-corpus: OCR/PDF-extraction practitioner gotchas (sibling of blueprint-vision, the document-corpus layer -- map to PRISMs OWN lived regressions): multi-page PDF read page-0-only dropping dimension-bearing pages, leading-dot decimal .171 breaking JSON.parse losing a whole extraction, truncated-JSON loss, non-resumable corpus burn (re-OCR waste on a kill), encoding mangling, VLM hallucination needing >=2-model consensus. Free: Tesseract/pypdf docs, Szeliski Computer Vision free book, document-AI literature.
CS-engineering claims here are papa-verifiable -- cite course/docs/paper. Leave any benchmark-specific number owner-gated.

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (OSTEP, MIT/Stanford courseware, official docs, man pages, arXiv, NIST/OSHA, reputable engineering reference). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-12 cited gotchas/technique notes across 4-5 themed sections. Each = the gotcha + WHY + the expert's avoidance, source cited inline. Map each to how THIS PRISM galaxy hits it (one line).
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: pdf-corpus, owner_slot: xray, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice-meta (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook block
... [+394 chars truncated]

### Assistant | 2026-06-10T15:51:59.938Z

I'll start by reading the foundations file (if it exists) to avoid repeating theory, then research the practitioner gotchas via WebFetch.

### Assistant | 2026-06-10T15:52:00.139Z

[tool_use: Glob]

### User | 2026-06-10T15:52:12.822Z

[tool_result] knowledge\wiki\pdf-corpus\pdf-corpus-foundations.md
knowledge\wiki\pdf-corpus\pdf-corpus-source-atlas.md

### Assistant | 2026-06-10T15:52:24.525Z

Good, foundations exists. Let me read it to avoid repeating theory.

### Assistant | 2026-06-10T15:52:24.525Z

[tool_use: Read]

### User | 2026-06-10T15:52:29.370Z

[tool_result] 1	---
2	title: PDF-Corpus Foundations (PDF object model + document text/raster extraction + OCR pipeline + layout analysis)
3	galaxy: pdf-corpus
4	owner_slot: golf
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-meta-create-workflow (2026-06-10)"
7	verification_method: "Live WebFetch of each cited free/legal source this session; only claims the fetched page actually confirmed are promoted here. So
... [+22820 chars truncated]

### Assistant | 2026-06-10T15:52:35.919Z

Foundations covers theory (PDF object model, OCR primitives, layout analysis, IR framing). My applied-practice entry must cover the practitioner gotchas: failure modes and technique decisions. Let me research the citable sources. I'll batch the WebFetch calls for the practitioner-level claims.

Let me start with the high-value sources: pypdf docs (encoding/extraction gotchas), Tesseract docs (preprocessing/PSM/quality gotchas), JSON spec (the leading-dot/trailing-comma gotchas), and document-AI/VLM hallucination literature.

### Assistant | 2026-06-10T15:52:40.920Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T15:52:41.973Z

[tool_use: WebFetch]

### User | 2026-06-10T15:52:48.978Z

[tool_result] # Tesseract OCR Quality Improvement Guidance

**Resolution Requirements:**
Tesseract requires "a DPI of at least 300 dpi" for optimal performance. One expert noted considerations for "optimal Height of capital letter in pixels," though specific pixel measurements weren't detailed in this documentation.

**Binarization/Thresholding:**
The system performs internal binarization using the Otsu algorit
... [+1115 chars truncated]

### User | 2026-06-10T15:52:55.285Z

[tool_result] # pypdf's Warnings on Text Extraction Reliability

Yes, pypdf provides extensive caveats about text extraction limitations:

**Wrong/Garbled Characters:**
pypdf explicitly states it "will never confuse characters" because it reads what's in the file rather than using OCR. However, it acknowledges that "the calculated positions may be difficult to determine" in complex documents.

**PDFs Not Design
... [+1070 chars truncated]

### Assistant | 2026-06-10T15:53:01.279Z

Excellent, two strong sources. Now let me fetch the JSON spec (for the leading-dot/trailing-comma/numeric grammar gotchas that map directly to PRISM's `.171` regression) and document-AI/VLM hallucination literature.

### Assistant | 2026-06-10T15:53:04.026Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T15:53:06.452Z

[tool_use: WebFetch]

### User | 2026-06-10T15:53:19.220Z

[tool_result] # AI Hallucinations: Key Findings from Wikipedia Article

## Definition and Core Behavior

The article defines AI hallucinations as "a response generated by AI that contains false or misleading information presented as fact." LLMs demonstrate a particular tendency to generate plausible-sounding falsehoods confidently. For instance, Meta characterized hallucinations as "confident statements that ar
... [+1383 chars truncated]

### User | 2026-06-10T15:53:19.732Z

[tool_result] # JSON Number Grammar Analysis

Based on the provided JSON.org content, here's what the grammar specifies:

## Leading Digit Required
Numbers must have at least one digit before a decimal point. The grammar shows:
- `integer` can be: `digit`, `onenine digits`, `'-' digit`, or `'-' onenine digits`
- `fraction` is: `""` or `'.' digits` (fraction is optional, but if present, requires digits after the
... [+988 chars truncated]

### Assistant | 2026-06-10T15:53:29.934Z

All four sources confirmed strong claims. I have enough for ~10-12 gotchas, but let me get two more to round out the resumability/non-resumable-corpus-burn theme (idempotency/checkpointing) and the encoding-mangling theme. Let me check the Stanford IR encoding source (already cited in foundations, but I'll use a distinct angle) — actually, let me get a fresh source for idempotency/checkpointing and for Unicode encoding pitfalls.

### Assistant | 2026-06-10T15:53:31.781Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T15:53:34.047Z

[tool_use: WebFetch]

### User | 2026-06-10T15:53:41.740Z

[tool_result] # Idempotence in Computer Science

According to the article, the computer science definition states:

> "a subroutine with side effects is idempotent if multiple calls to the subroutine have the same effect on the system state as a single call"

The article explains why this matters for retryable operations:

> "This is a very useful property in many situations, as it means that an operation can b
... [+374 chars truncated]

### User | 2026-06-10T15:53:44.321Z

[tool_result] # Mojibake: Definition and Causes

## Definition

According to Wikipedia, **mojibake** is described as:

> "the garbled or gibberish text that is the result of text being decoded using an unintended character encoding."

The article explains that this produces "a systematic replacement of symbols with completely unrelated ones, often from a different writing system."

## Core Causes

The article i
... [+944 chars truncated]

### Assistant | 2026-06-10T15:54:18.170Z

All six sources confirmed. I now have material for 11-12 gotchas across 5 themes. Let me write the file.

### Assistant | 2026-06-10T15:55:49.153Z

[tool_use: Write]

### User | 2026-06-10T15:55:52.627Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\pdf-corpus\pdf-corpus-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T15:56:00.861Z

File created. Not a duplicate — the related nodes are the pdf-corpus-mill galaxy and the galaxy brain, distinct from this OCR/PDF-extraction practitioner entry. The content is complete (the Ollama advisory misfired on the intro line; all 7 sections plus owner-gate and sources are fully present).

GALAXY: pdf-corpus
FILE: knowledge/wiki/pdf-corpus/pdf-corpus-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 18
SOURCES: 6
NUMERICS_LEFT_GATED: yes
NOTE: One malformed token (leading-dot decimal .171) discards the WHOLE structured extraction unless you repair structure-then-notation before strict JSON.parse -- the parse-discard total-loss class the xray fleet paid for repeatedly.

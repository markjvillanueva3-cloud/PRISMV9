---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"pdf-corpus\" meta/infra g"
date: "2026-06-10"
first_ts: "2026-06-10T20:35:26.605Z"
last_ts: "2026-06-10T20:35:29.090Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a7886127bc095ee3c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "pdf-corpus" meta/infra g

> **claude-code-cli** | 2026-06-10 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a7886127bc095ee3c.jsonl`

## Transcript

### User | 2026-06-10T20:35:26.605Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "pdf-corpus" meta/infra galaxy (owner: xray, focus: document AI / OCR / born-digital-vs-scan routing): knowledge/wiki/pdf-corpus/pdf-corpus-resource-atlas.md.

PURPOSE (operator directive -- EACH galaxy gets an easy-access resource index, do not stay stagnant): a single hub that links the LOCAL code/store trove + the CANONICAL free online resources (the official tool GitHub repo, the seminal free paper/book, the standards page) so a chat in this galaxy jumps STRAIGHT to the authoritative source. This is DISTINCT from [[pdf-corpus-source-atlas]] (which is the where-to-LEARN curriculum): the resource-atlas is the where-to-REACH index -- the canonical repo/paper/standard + the local code, not a course list.

LOCAL TROVE (PRISM code/stores -- LINK verbatim, these are the galaxy's own engine dir + real stores):
mcp-server/src/engines/pdf-corpus/; lima pypdf page-extractor; 8752-page corpus

ONLINE CANDIDATES (seeded by a local-LLM offload -- TREAT AS UNVERIFIED; WebFetch EACH before listing; DROP any that 404/redirect-away/don't match; some are hallucinated): tesseract-ocr/tesseract github; Szeliski Computer Vision (szeliski.org/Book); pypdf docs; PaddleOCR github
You MAY add other canonical free sources you can WebFetch-verify. FREE + LEGAL only (no paywalled/LibGen).

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given engine-dir + store pointers verbatim (verified PRISM paths). ONLINE: ONLY list a URL you CONFIRM resolves via WebFetch AND matches the described resource; drop the rest. Never list an unverified/hallucinated URL.
2. Cross-link the sibling wiki layers: [[pdf-corpus-foundations]], [[pdf-corpus-source-atlas]], [[pdf-corpus-applied-practice]], [[pdf-corpus-advanced-techniques]], plus [[prism-methodology-foundations]].
3. R12 SAFETY: promote NO numeric threshold/constant -- link the method/source, numbers stay owner-gated to xray + constants.ts.
4. Sections: Local code+stores / Canonical repos+pap
... [+796 chars truncated]

### Assistant | 2026-06-10T20:35:29.090Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

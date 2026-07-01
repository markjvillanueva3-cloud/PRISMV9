---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"knowledge-conversion\" me"
date: "2026-06-10"
first_ts: "2026-06-10T20:33:55.493Z"
last_ts: "2026-06-10T20:34:15.052Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a98d60030fa53f8d9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "knowledge-conversion" me

> **claude-code-cli** | 2026-06-10 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a98d60030fa53f8d9.jsonl`

## Transcript

### User | 2026-06-10T20:33:55.493Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "knowledge-conversion" meta/infra galaxy (owner: golf, focus: NLP / information extraction / ontology-guided): knowledge/wiki/knowledge-conversion/knowledge-conversion-resource-atlas.md.

PURPOSE (operator directive -- EACH galaxy gets an easy-access resource index, do not stay stagnant): a single hub that links the LOCAL code/store trove + the CANONICAL free online resources (the official tool GitHub repo, the seminal free paper/book, the standards page) so a chat in this galaxy jumps STRAIGHT to the authoritative source. This is DISTINCT from [[knowledge-conversion-source-atlas]] (which is the where-to-LEARN curriculum): the resource-atlas is the where-to-REACH index -- the canonical repo/paper/standard + the local code, not a course list.

LOCAL TROVE (PRISM code/stores -- LINK verbatim, these are the galaxy's own engine dir + real stores):
mcp-server/src/engines/knowledge-conversion/; 6-node forge-queue; SafeExpressionEvaluator

ONLINE CANDIDATES (seeded by a local-LLM offload -- TREAT AS UNVERIFIED; WebFetch EACH before listing; DROP any that 404/redirect-away/don't match; some are hallucinated): huggingface/transformers github; Stanford CS224N; Jurafsky-Martin SLP3 (web.stanford.edu/~jurafsky/slp3); spaCy docs
You MAY add other canonical free sources you can WebFetch-verify. FREE + LEGAL only (no paywalled/LibGen).

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given engine-dir + store pointers verbatim (verified PRISM paths). ONLINE: ONLY list a URL you CONFIRM resolves via WebFetch AND matches the described resource; drop the rest. Never list an unverified/hallucinated URL.
2. Cross-link the sibling wiki layers: [[knowledge-conversion-foundations]], [[knowledge-conversion-source-atlas]], [[knowledge-conversion-applied-practice]], [[knowledge-conversion-advanced-techniques]], plus [[prism-methodology-foundations]].
3. R12 SAFETY: promote NO numeric threshold/constant -- link the method/source, num
... [+934 chars truncated]

### Assistant | 2026-06-10T20:34:03.363Z

I'll start by reading the sibling wiki layers to cross-link correctly, then verify the local trove paths, then WebFetch each online candidate before listing.

### Assistant | 2026-06-10T20:34:04.513Z

[tool_use: Bash]

### User | 2026-06-10T20:34:13.303Z

[tool_result] total 104
drwxr-xr-x 1 wompu 197611     0 Jun 10 14:03 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 05:11 ../
-rw-r--r-- 1 wompu 197611 31230 Jun 10 14:03 knowledge-conversion-advanced-techniques.md
-rw-r--r-- 1 wompu 197611 24050 Jun 10 08:57 knowledge-conversion-applied-practice.md
-rw-r--r-- 1 wompu 197611 17717 Jun 10 03:50 knowledge-conversion-foundations.md
-rw-r--r-- 1 wompu 197611 14317 Jun 1
... [+102 chars truncated]

### Assistant | 2026-06-10T20:34:15.052Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

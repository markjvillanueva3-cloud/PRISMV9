---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"tribal-knowledge\" meta/i"
date: "2026-06-10"
first_ts: "2026-06-10T20:35:15.743Z"
last_ts: "2026-06-10T20:35:26.569Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a72609469601924a0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "tribal-knowledge" meta/i

> **claude-code-cli** | 2026-06-10 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a72609469601924a0.jsonl`

## Transcript

### User | 2026-06-10T20:35:15.743Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "tribal-knowledge" meta/infra galaxy (owner: golf, focus: knowledge management / SECI / retrieval-augmented capture): knowledge/wiki/tribal-knowledge/tribal-knowledge-resource-atlas.md.

PURPOSE (operator directive -- EACH galaxy gets an easy-access resource index, do not stay stagnant): a single hub that links the LOCAL code/store trove + the CANONICAL free online resources (the official tool GitHub repo, the seminal free paper/book, the standards page) so a chat in this galaxy jumps STRAIGHT to the authoritative source. This is DISTINCT from [[tribal-knowledge-source-atlas]] (which is the where-to-LEARN curriculum): the resource-atlas is the where-to-REACH index -- the canonical repo/paper/standard + the local code, not a course list.

LOCAL TROVE (PRISM code/stores -- LINK verbatim, these are the galaxy's own engine dir + real stores):
mcp-server/src/engines/tribal-knowledge/; knowledge/wiki/code-tribal/ (4354 tips); tribal-rerank

ONLINE CANDIDATES (seeded by a local-LLM offload -- TREAT AS UNVERIFIED; WebFetch EACH before listing; DROP any that 404/redirect-away/don't match; some are hallucinated): Nonaka SECI The Knowledge-Creating Company (refs); arXiv RAG 2005.11401; knowledge-management literature
You MAY add other canonical free sources you can WebFetch-verify. FREE + LEGAL only (no paywalled/LibGen).

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given engine-dir + store pointers verbatim (verified PRISM paths). ONLINE: ONLY list a URL you CONFIRM resolves via WebFetch AND matches the described resource; drop the rest. Never list an unverified/hallucinated URL.
2. Cross-link the sibling wiki layers: [[tribal-knowledge-foundations]], [[tribal-knowledge-source-atlas]], [[tribal-knowledge-applied-practice]], [[tribal-knowledge-advanced-techniques]], plus [[prism-methodology-foundations]].
3. R12 SAFETY: promote NO numeric threshold/constant -- link the method/source, numbers stay owner-gated to g
... [+892 chars truncated]

### Assistant | 2026-06-10T20:35:26.569Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

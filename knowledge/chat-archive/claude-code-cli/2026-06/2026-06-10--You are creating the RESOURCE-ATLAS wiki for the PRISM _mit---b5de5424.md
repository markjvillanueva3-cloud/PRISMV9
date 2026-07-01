---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"mit-curriculum\" meta/inf"
date: "2026-06-10"
first_ts: "2026-06-10T20:35:15.743Z"
last_ts: "2026-06-10T20:35:25.708Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-aff3be116bdbd8a93.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "mit-curriculum" meta/inf

> **claude-code-cli** | 2026-06-10 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-aff3be116bdbd8a93.jsonl`

## Transcript

### User | 2026-06-10T20:35:15.743Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "mit-curriculum" meta/infra galaxy (owner: lima, focus: OER / OCW / CC-license aggregation): knowledge/wiki/mit-curriculum/mit-curriculum-resource-atlas.md.

PURPOSE (operator directive -- EACH galaxy gets an easy-access resource index, do not stay stagnant): a single hub that links the LOCAL code/store trove + the CANONICAL free online resources (the official tool GitHub repo, the seminal free paper/book, the standards page) so a chat in this galaxy jumps STRAIGHT to the authoritative source. This is DISTINCT from [[mit-curriculum-source-atlas]] (which is the where-to-LEARN curriculum): the resource-atlas is the where-to-REACH index -- the canonical repo/paper/standard + the local code, not a course list.

LOCAL TROVE (PRISM code/stores -- LINK verbatim, these are the galaxy's own engine dir + real stores):
mcp-server/src/engines/mit-curriculum/; resources/MIT COURSES(1106); academy course ids

ONLINE CANDIDATES (seeded by a local-LLM offload -- TREAT AS UNVERIFIED; WebFetch EACH before listing; DROP any that 404/redirect-away/don't match; some are hallucinated): ocw.mit.edu; MIT OCW github (ocw-mirror); Creative Commons license docs; OER Commons
You MAY add other canonical free sources you can WebFetch-verify. FREE + LEGAL only (no paywalled/LibGen).

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given engine-dir + store pointers verbatim (verified PRISM paths). ONLINE: ONLY list a URL you CONFIRM resolves via WebFetch AND matches the described resource; drop the rest. Never list an unverified/hallucinated URL.
2. Cross-link the sibling wiki layers: [[mit-curriculum-foundations]], [[mit-curriculum-source-atlas]], [[mit-curriculum-applied-practice]], [[mit-curriculum-advanced-techniques]], plus [[prism-methodology-foundations]].
3. R12 SAFETY: promote NO numeric threshold/constant -- link the method/source, numbers stay owner-gated to lima + constants.ts.
4. Sections: Local code+stores / Canonical repos
... [+816 chars truncated]

### Assistant | 2026-06-10T20:35:25.708Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"compliance-safety\" meta/"
date: "2026-06-10"
first_ts: "2026-06-10T20:33:55.493Z"
last_ts: "2026-06-10T20:34:47.821Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a4c6452873d6bef50.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "compliance-safety" meta/

> **claude-code-cli** | 2026-06-10 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a4c6452873d6bef50.jsonl`

## Transcript

### User | 2026-06-10T20:33:55.493Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "compliance-safety" meta/infra galaxy (owner: golf, focus: STPA/STAMP / functional-safety / fail-closed): knowledge/wiki/compliance-safety/compliance-safety-resource-atlas.md.

PURPOSE (operator directive -- EACH galaxy gets an easy-access resource index, do not stay stagnant): a single hub that links the LOCAL code/store trove + the CANONICAL free online resources (the official tool GitHub repo, the seminal free paper/book, the standards page) so a chat in this galaxy jumps STRAIGHT to the authoritative source. This is DISTINCT from [[compliance-safety-source-atlas]] (which is the where-to-LEARN curriculum): the resource-atlas is the where-to-REACH index -- the canonical repo/paper/standard + the local code, not a course list.

LOCAL TROVE (PRISM code/stores -- LINK verbatim, these are the galaxy's own engine dir + real stores):
mcp-server/src/engines/compliance-safety/; prism_safety dispatcher; omega-thresholds.json

ONLINE CANDIDATES (seeded by a local-LLM offload -- TREAT AS UNVERIFIED; WebFetch EACH before listing; DROP any that 404/redirect-away/don't match; some are hallucinated): MIT STPA Handbook (psas.scripts.mit.edu); IEC 61508 (iec.ch); Leveson Engineering a Safer World (free MIT Press)
You MAY add other canonical free sources you can WebFetch-verify. FREE + LEGAL only (no paywalled/LibGen).
R12: NO numeric S(x)/Omega/SIL promoted -- method/standard only, thresholds owner-gated to golf + constants.ts.

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given engine-dir + store pointers verbatim (verified PRISM paths). ONLINE: ONLY list a URL you CONFIRM resolves via WebFetch AND matches the described resource; drop the rest. Never list an unverified/hallucinated URL.
2. Cross-link the sibling wiki layers: [[compliance-safety-foundations]], [[compliance-safety-source-atlas]], [[compliance-safety-applied-practice]], [[compliance-safety-advanced-techniques]], plus [[prism-methodology-foundations]].
3
... [+1004 chars truncated]

### Assistant | 2026-06-10T20:34:02.339Z

I'll start by verifying the local PRISM paths, then WebFetch each online candidate before listing anything. Let me check the local trove first.

### Assistant | 2026-06-10T20:34:04.331Z

[tool_use: Bash]

### User | 2026-06-10T20:34:37.745Z

[tool_result] /h/prism/mcp-server/src/engines/compliance-safety//
---DISPATCHER---
safetyDispatcher.ts
---OMEGA---
/h/prism/state/shared/omega-thresholds.json

### Assistant | 2026-06-10T20:34:47.821Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

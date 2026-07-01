---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the RESOURCE-ATLAS wiki for the PRISM \"dormant-data\" meta/infra"
date: "2026-06-10"
first_ts: "2026-06-10T20:33:55.492Z"
last_ts: "2026-06-10T20:35:15.730Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a99a171a3aaee1bb8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the RESOURCE-ATLAS wiki for the PRISM "dormant-data" meta/infra

> **claude-code-cli** | 2026-06-10 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_533dad90-22c/agent-a99a171a3aaee1bb8.jsonl`

## Transcript

### User | 2026-06-10T20:33:55.492Z

You are creating the RESOURCE-ATLAS wiki for the PRISM "dormant-data" meta/infra galaxy (owner: victor, focus: GC / MVCC / RCU reclaim / data lifecycle): knowledge/wiki/dormant-data/dormant-data-resource-atlas.md.

PURPOSE (operator directive -- EACH galaxy gets an easy-access resource index, do not stay stagnant): a single hub that links the LOCAL code/store trove + the CANONICAL free online resources (the official tool GitHub repo, the seminal free paper/book, the standards page) so a chat in this galaxy jumps STRAIGHT to the authoritative source. This is DISTINCT from [[dormant-data-source-atlas]] (which is the where-to-LEARN curriculum): the resource-atlas is the where-to-REACH index -- the canonical repo/paper/standard + the local code, not a course list.

LOCAL TROVE (PRISM code/stores -- LINK verbatim, these are the galaxy's own engine dir + real stores):
mcp-server/src/engines/dormant-data/; tmp-orphan-janitor; dormant-data ledger

ONLINE CANDIDATES (seeded by a local-LLM offload -- TREAT AS UNVERIFIED; WebFetch EACH before listing; DROP any that 404/redirect-away/don't match; some are hallucinated): GC Handbook (gchandbook.org); PostgreSQL MVCC docs; jepsen-io/jepsen github; OSTEP
You MAY add other canonical free sources you can WebFetch-verify. FREE + LEGAL only (no paywalled/LibGen).

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given engine-dir + store pointers verbatim (verified PRISM paths). ONLINE: ONLY list a URL you CONFIRM resolves via WebFetch AND matches the described resource; drop the rest. Never list an unverified/hallucinated URL.
2. Cross-link the sibling wiki layers: [[dormant-data-foundations]], [[dormant-data-source-atlas]], [[dormant-data-applied-practice]], [[dormant-data-advanced-techniques]], plus [[prism-methodology-foundations]].
3. R12 SAFETY: promote NO numeric threshold/constant -- link the method/source, numbers stay owner-gated to victor + constants.ts.
4. Sections: Local code+stores / Canonical repos+papers+standards 
... [+792 chars truncated]

### Assistant | 2026-06-10T20:34:05.458Z

I'll start by reading the sibling wiki layers to get cross-link structure right, then verify the local trove paths, then WebFetch each online candidate.

### Assistant | 2026-06-10T20:34:05.954Z

[tool_use: Glob]

### Assistant | 2026-06-10T20:34:08.365Z

[tool_use: Bash]

### User | 2026-06-10T20:34:17.174Z

[tool_result] knowledge\wiki\dormant-data\dormant-data-foundations.md
knowledge\wiki\dormant-data\dormant-data-applied-practice.md
knowledge\wiki\dormant-data\dormant-data-source-atlas.md
knowledge\wiki\dormant-data\dormant-data-advanced-techniques.md

### User | 2026-06-10T20:35:04.453Z

[tool_result] total 1316
drwxr-xr-x 1 wompu 197611     0 May 29 12:34 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 14:24 ../
-rw-r--r-- 1 wompu 197611 10297 Jun  9 22:38 CLAUDE.md
-rw-r--r-- 1 wompu 197611  9801 Jun  9 21:59 MEMORY.md
-rw-r--r-- 1 wompu 197611  6720 May 30 23:16 PATHS.md
-rw-r--r-- 1 wompu 197611  3261 Jun 10 13:02 TOOLBELT.md
---TMPORPHAN---
tmp-orphan-janitor.mjs*
tmp-orphan-janitor.test.mjs
---
... [+9 chars truncated]

### Assistant | 2026-06-10T20:35:15.730Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

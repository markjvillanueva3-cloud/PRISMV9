---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"knowledge-conversion\" "
date: "2026-06-10"
first_ts: "2026-06-10T10:40:37.682Z"
last_ts: "2026-06-10T10:40:38.228Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-aa9c57a4a9cfa3792.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "knowledge-conversion" 

> **claude-code-cli** | 2026-06-10 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-aa9c57a4a9cfa3792.jsonl`

## Transcript

### User | 2026-06-10T10:40:37.682Z

You are creating the Applied Practice wiki for the PRISM "knowledge-conversion" galaxy (owner: golf): knowledge/wiki/knowledge-conversion/knowledge-conversion-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won CS-engineering gotchas, FAILURE MODES, and TECHNIQUE DECISIONS that pure theory does not teach. DISTINCT from knowledge-conversion-foundations.md (theory) -- read it first so you do not repeat it; this entry is "what goes wrong in practice and how an expert avoids it."

FOCUS for knowledge-conversion: NLP/extraction/ETL practitioner gotchas: NER brittleness on domain-specific terms (a milling term mis-tagged), relation-extraction precision-vs-recall trade, ontology drift over time, ETL silent-drop on a malformed record (vs fail-loud), unicode/encoding mangling, dedup over-merge of distinct entities. Free: Stanford CS224N, NLP literature.
CS-engineering claims here are papa-verifiable -- cite course/docs/paper. Leave any benchmark-specific number owner-gated.

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (OSTEP, MIT/Stanford courseware, official docs, man pages, arXiv, NIST/OSHA, reputable engineering reference). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-12 cited gotchas/technique notes across 4-5 themed sections. Each = the gotcha + WHY + the expert's avoidance, source cited inline. Map each to how THIS PRISM galaxy hits it (one line).
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: knowledge-conversion, owner_slot: golf, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice-meta (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: knowledge-conver
... [+325 chars truncated]

### Assistant | 2026-06-10T10:40:38.228Z

You've hit your session limit · resets 7:30am (America/Chicago)

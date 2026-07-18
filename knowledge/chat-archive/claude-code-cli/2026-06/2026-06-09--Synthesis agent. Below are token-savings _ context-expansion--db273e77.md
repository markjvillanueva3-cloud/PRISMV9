---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Synthesis agent. Below are token-savings + context-expansion discovery findings "
date: "2026-06-09"
first_ts: "2026-06-09T10:58:58.783Z"
last_ts: "2026-06-09T10:59:36.627Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_bc876fed-edf/agent-a2d19c906197ad309.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Synthesis agent. Below are token-savings + context-expansion discovery findings 

> **claude-code-cli** | 2026-06-09 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_bc876fed-edf/agent-a2d19c906197ad309.jsonl`

## Transcript

### User | 2026-06-09T10:58:58.783Z

Synthesis agent. Below are token-savings + context-expansion discovery findings for PRISM slot:alpha.

### token-savings
Confirmed: the backend-audit message is fully static (`<path>` is a literal placeholder, never interpolated) — so per-session deduplication loses zero per-file information. This is a genuine win mirroring the doctrineSurface fix shipped today. I have enough verified data. Let me finalize.

Findings:

1. CANDIDATE 2 (CAG cold-cache cache_control wiring) — VERIFIED NON-VIABLE. The cold-tier IS consumed, but via a different mechanism than the anchor implies. `cag-router-inject.mjs:124-129` writes a `skip{}` block into `latest-<sid>.json`; `cag-consume.mjs` reads it to short-circuit the 3 doctrine injectors on COLD-confident prompts — that path already works. The `cag-cold-cache-anchor.mjs` "est savings 4000 tokens if downstream consumes" refers specifically to `cache_control:ephemeral` marking; `grep cache_control` across `.claude/`, `scripts/`, `mcp-server/src/` returned ZERO hits — the harness never applies it, and the hook header itself admits "Today the harness doesn't read a hook-level cache_control hint." More decisively: live tier distribution across 197 consumed `latest-` sidecars is 81% HYBRID-confidence-0 (no keyword match), 6% HOT, only 6% COLD-confident-enough to SKIP (12 of 197). Wiring cache_control could not move the dominant 81% case (it's the low-confidence default that runs full inject by design), and the 6% COLD case is already short-circuited by the existing skip mechanism. No clean win.

2. CANDIDATE 1 (PostToolUse verbose-Bash stdout truncation) — VERIFIED ARCHITECTURALLY NON-VIABLE. Same failure-class as my brief's pre-disqualified item (c). The Claude Code PostToolUse API has no output-replacement field — every PostToolUse hook in the repo confirms this by design: `tsc-error-dedup.mjs:7-8` ("Original output still appears in the transcript, but the summary gives Claude a digested view"); `dsl-output-compressor.mjs:5-7` ("Emits 
... [+11150 chars truncated]

### Assistant | 2026-06-09T10:59:36.627Z

## RANKED QUEUE

**1. Galaxy MEMORY.md per-domain brains into semantic-recall cache (wiring + key-collision fix)**
- Evidence: `scripts/build-memo-embedding-cache.mjs:54` filter `/^(feedback|reference|project|user)_.+\.md$/` + single `MEMORY_DIR` in `scripts/lib/memo-embed-lib.mjs:19-21` exclude all 35 galaxy brains (`find mcp-server/src/engines -maxdepth 2 -name MEMORY.md` = 35; probe `s.has('MEMORY.md')` = false). Cache key collision risk: all 35 share basename `MEMORY.md` → namespaced key required (`loadEmbedCache` Map at ~`memo-embed-lib.mjs:157`).
- Mechanism/value: HIGH retention/expansion — the 35 brains are the densest per-domain context in the repo; today invisible to the 768d semantic-recall hook (`memory-relevance-inject.mjs:134`) that fires every UserPromptSubmit. Makes any slot's NL prompt reach the relevant galaxy brain. The incremental builder already auto-triggers on Stop (`stop-obsidian-memory-feed.mjs:143-147`) and handles +35 new names cheaply — no full GPU re-embed, no operator gate.
- Effort: S (extend source set to walk `mcp-server/src/engines/*/MEMORY.md` + namespaced key `galaxy:<name>:MEMORY.md` + coverage assertion in test).
- Verify-first: `node -e "const {loadEmbedCache}=require('./scripts/lib/memo-embed-lib.mjs'); /* confirm no 'MEMORY.md' key exists today and basenames would collide */"` — confirm 35 brains absent from cache before wiring.

**2. precompact-memo-emit: fold richer episodic bullets from the precompact handoff body**
- Evidence: `.claude/hooks/precompact-memo-emit.mjs:139-165` `buildSessionTrace` emits only `{branch, commits:[{sha,subject}], loopTask}` from `git log --since=12.hours` filtered to `(slot:<slot>)` subjects; hook's own docstring (lines 12-14) claims to capture "a coherent unit of work" but reduces it to commit one-liners. The richer `--state` body already exists at the same compaction event via `precompact-handoff.mjs`.
- Mechanism/value: MEDIUM-HIGH — compaction is the one guaranteed episodic-shed point; readi
... [+4294 chars truncated]

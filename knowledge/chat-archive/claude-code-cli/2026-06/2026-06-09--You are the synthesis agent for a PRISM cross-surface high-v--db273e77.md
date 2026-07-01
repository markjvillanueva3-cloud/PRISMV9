---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "You are the synthesis agent for a PRISM cross-surface high-value discovery (oper"
date: "2026-06-09"
first_ts: "2026-06-09T19:05:25.564Z"
last_ts: "2026-06-09T19:06:53.008Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_9437a375-523/agent-a624e1332f38c083a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# You are the synthesis agent for a PRISM cross-surface high-value discovery (oper

> **claude-code-cli** | 2026-06-09 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_9437a375-523/agent-a624e1332f38c083a.jsonl`

## Transcript

### User | 2026-06-09T19:05:25.564Z

You are the synthesis agent for a PRISM cross-surface high-value discovery (operator /goal: max local-LLM utilization on the new Blackwell + token savings + context retention + obsidian vault value, no quality loss).

Here are 4 lens reports:

### LENS 1 (blackwell-local-llm)
Evidence confirmed: `ollama-route-pretooluse` fires **2126×** keeping 2112, and `grep-index-first` fires **758×** suggesting 128 — both are high-volume seams already wired but barely converting. The 96GB GPU is idle. Three NOVEL proposals below (none duplicate the queue).

---

**1. `read-to-ollama-digest.mjs` — PreToolUse:Read auto-digest for large source files**
(a) WHAT: New PreToolUse:Read hook (sibling to existing `read-auto-limit.mjs`/`json-read-summarizer.mjs`) that, when a Read targets a file >800 lines AND the prompt intent is summarize/understand/locate (not edit), routes the file to a resident gpt-oss:20b via `ask-ollama.mjs` and injects a structured digest + line-map, deferring the full Read. Edit-intent Reads pass through untouched (quality guard).
(b) WHY: Read=7059 is the **#1 tool sink**. `wiki-read-offload-advisory` already proves the pattern but only fires on wiki ≥500 lines; this generalizes to all source. Even routing 15% of the 7059 Reads = ~1,050 offloads.
(c) OWNER: **alpha** — it's an advisory/Read seam, not engine-routing.
(d) EFFORT: M.
(e) IMPACT: +1,000 offloads alone moves the ratio from 6.8% toward ~20-25% (151→~1,150 of ~7,200 ops); 800-line files ≈ 10k tokens each, ~10M tokens deflected.

**2. `grep-to-ollama-rank.mjs` — turn the 758 grep-index-first SUGGESTS into OFFLOADS**
(a) WHAT: Upgrade the existing advisory `grep-index-first` path: when a Grep/Bash-grep returns >40 hit lines, pipe the raw hit-set to a resident model with the query for relevance-ranking + top-10 extraction, injecting the ranked subset instead of the model re-reading 40+ matches.
(b) WHY: `grep-index-first` fired **758×, offloaded 0** (pure suggest). This is the single largest never-converte
... [+9336 chars truncated]

### Assistant | 2026-06-09T19:05:31.559Z

I'll synthesize the four lens reports into a single ranked, dependency-ordered build queue. Let me first verify a few load-bearing claims against the live state before locking the ranking.

### Assistant | 2026-06-09T19:05:35.868Z

[tool_use: Bash]

### Assistant | 2026-06-09T19:05:37.825Z

[tool_use: Bash]

### User | 2026-06-09T19:05:49.348Z

[tool_result] totalOffloaded 11 keptOnClaude 151 silentSuggestions 93
ollama-route-pretooluse fired=2126 sugg=12 off=2
grep-index-first fired=758 sugg=128 off=0
ollama-task-offloader fired=182 sugg=20 off=11
fleet-reaper-coordinator fired=81 sugg=81 off=0
ollama-nav-enforce fired=3 sugg=3 off=0

### User | 2026-06-09T19:05:59.634Z

[tool_result] -rwxr-xr-x 1 wompu 197611     7620 May 12 21:15 H:/prism/.claude/hooks/json-read-summarizer.mjs*
-rwxr-xr-x 1 wompu 197611     2528 May 25 20:40 H:/prism/.claude/hooks/read-auto-limit.mjs*
-rwxr-xr-x 1 wompu 197611     8548 May 20 12:13 H:/prism/.claude/hooks/wiki-read-offload-advisory.mjs*
-rwxr-xr-x 1 wompu 197611    29397 Jun  8 21:31 H:/prism/scripts/ask-ollama.mjs*
-rw-r--r-- 1 wompu 197611  
... [+157 chars truncated]

### Assistant | 2026-06-09T19:06:53.008Z

Live numbers confirm the lens reports precisely: `ollama-route-pretooluse` 2126/12/2, `grep-index-first` 758/128/0, total offloaded 11, kept 151, silent 93. All cited hooks and the 57MB find-cache exist. The ranking below is grounded in these verified numbers.

---

# PRISM CROSS-SURFACE BUILD QUEUE — synthesis (2026-06-09)

Live evidence (verified this session): `ollama-offload-stats.json` → totalOffloaded **11**, keptOnClaude **151**, silentSuggestions **93** (= **6.8%** take-rate). Top seams: `ollama-route-pretooluse` 2126 fired / 12 sugg / **2 off**; `grep-index-first` 758 / 128 / **0 off**; `ollama-task-offloader` 182 / 20 / 11. find-cache.json = 57MB fresh (Jun 9). 96GB Blackwell idle; gpt-oss:20b + gpt-oss:120b can co-reside (66+ ~10GB, ~30GB headroom).

## DEDUP NOTES (cross-lens collisions resolved)
- **Large-Read offload** appears in Lens 1 (#1 `read-to-ollama-digest`) and Lens 3 (#2 `read-dedup-cache`) and overlaps the **known queue's large-Read advisory**. These are NOT the same: Lens-3's cache is a *byte-identical short-circuit* (free), Lens-1's digest is a *model summarization* (offload). Merged into one ranked entry (**A1**) — ship the cache layer first (zero-LLM, zero-risk), then the digest layer on top of it. The queue's advisory is subsumed.
- **`node-card` cold-tier** — Lens 4 #1 is the concrete, highest-ROI alpha item and does not duplicate the queued offset-index work (it's the *fallback when offset is missing/stale*, which the queue does not cover).
- **GNN ref-pool from sidecar** — Lens 4 #3 overlaps the existing `vault-to-gnn-refpool.mjs` (shipped 2026-06-09, memory `reference_vault_to_ai_feeders_2026_06_09`). It's additive (sidecar source vs vault source), but routes to **india** and is NOT alpha-now.

---

## RANKED QUEUE (ROI / effort, dependency-ordered)

**1 — `route-suggest-decay` advisory auto-mute** (Lens 3 #1) · owner **alpha-now** · **S**
Reads existing `ollama-offload-stats.json`; auto-suppresses any advisory with <5% acceptance ov
... [+6908 chars truncated]

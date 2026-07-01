---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "You are the synthesis agent. Below are discovery findings from 4 PRISM surfaces "
date: "2026-06-09"
first_ts: "2026-06-09T10:02:18.992Z"
last_ts: "2026-06-09T10:03:35.976Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_6739d5fd-4d1/agent-a640fe63ca8813f1a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# You are the synthesis agent. Below are discovery findings from 4 PRISM surfaces 

> **claude-code-cli** | 2026-06-09 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_6739d5fd-4d1/agent-a640fe63ca8813f1a.jsonl`

## Transcript

### User | 2026-06-09T10:02:18.992Z

You are the synthesis agent. Below are discovery findings from 4 PRISM surfaces (system-viz, PSN, vault/hermes, Blackwell-LLM) for slot:alpha (token/efficiency/Obsidian/memory-recall lane).

### SURFACE: system-viz
Critical finding confirmed: `galaxy-savings.mjs:119` explicitly states the recall-first PreToolUse hook is **golf-pending (HOOK-PATCH-GCF-RECALL-FIRST.md)** and reports 0 realized savings — the nudge engine is built but never fires. That's a verified high-value alpha-lane candidate. I have enough to write up the candidate list.

---

PRISM /system-viz discovery — alpha-lane (token-savings / context-retention / Obsidian-recall) candidates. All evidence read & verified on disk this session.

**1. Wire the recall-first nudge into a live PreToolUse:Read hook (currently a built-but-dormant engine)** — Effort: S/M · Lane: ALPHA
- Evidence: `scripts/lib/recall-first.mjs:1-50` is a complete pure-core engine (classify/estimate/decide/render recall-instead-of-reread nudges with token-savings estimate). But `scripts/lib/galaxy-savings.mjs:119` reports `cumulativeRealized.recallFirstTokens = 0` with the literal note: *"the recall-first PreToolUse hook is golf-pending (HOOK-PATCH-GCF-RECALL-FIRST.md); honestly reported as unrealized, not projected."* The only consumer found is `recall-first-advisory.mjs` — verify it's actually wired in `settings.json` (I could not confirm it fires on Read). The savings ledger `state/shared/dashboards/recall-first-savings.json` exists (358 bytes — essentially empty).
- Why high-value: This is THE direct token-savings lever for the brain/memory surface — re-reading a multi-KB galaxy `MEMORY.md` costs ~bytes/4 tokens vs ~300 for a recall. The engine is finished; only the firing hook is missing. Highest ROI/effort ratio of the set.
- Caveat: the engine doc says the hook is "golf-pending." Confirm with golf whether the hook ownership is golf's (golf write-allowlist may block alpha from shipping the actual `.claude/hooks/*.mjs` file). If go
... [+30279 chars truncated]

### Assistant | 2026-06-09T10:03:35.976Z

## RANKED ALPHA QUEUE

**1. Heap-safe the tribal-rerank spawn in `tribal-inject-on-edit.mjs` (close silent PSN leg #5 dormancy on every Edit/Write)**
- Evidence: `.claude/hooks/tribal-inject-on-edit.mjs:85` `spawnSync(process.execPath, args, {encoding:"utf8", timeout:4000})` — no `--max-old-space-size`/`NODE_OPTIONS`; the 167MB `state/shared/tribal-embed-index.json` OOMs the child in <4s → timeout → `r.status!==0` → `passthrough()`, tribal hits silently never injected. Sibling `tribal-by-domain-inject.mjs:208` already bumps heap to 8192MB and works.
- Value: Restores PSN leg #5 (tribal recall) on the entire on-edit injection surface fleet-wide — pure context-retention win, $0-Claude when healthy. THE single highest value/effort item; live silent bug now.
- Effort: S (one-line `env:{...process.env, NODE_OPTIONS:[...].join(" ")}` + a regression test asserting the spawn carries the heap flag, mirroring the by-domain-inject test).
- Verify first: `node .claude/scripts/tribal-rerank.mjs --query "mill speeds" --json` (default heap → OOM) vs `node --max-old-space-size=4096 ...` (real hits), and confirm `tribal-inject-on-edit.mjs:85` still lacks the heap env.

**2. Single-source the tribal-rerank-spawn helper so the heap flag can't drift across callers (R7 N-divergent-impl)**
- Evidence: Two divergent spawns of `tribal-rerank.mjs` — `tribal-by-domain-inject.mjs:197-208` (execFileSync, 8192MB) vs `tribal-inject-on-edit.mjs:85` (spawnSync, no heap); `subagent-start-context.mjs:58` is a third future caller (emits the command as text today). The 167MB index makes any heap-unaware spawn OOM, so the divergence is load-bearing.
- Value: Prevents item #1's bug from re-appearing when a 3rd caller spawns; one chokepoint for heap+timeout policy. Same drift class as the WEDM 3-selector / NN schema-read bugs.
- Effort: S (extract `scripts/lib/tribal-rerank-spawn.mjs` with heap-safe env baked in; both hooks import it — do in the same commit as #1).
- Verify first: confirm both call sites
... [+11961 chars truncated]

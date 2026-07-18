---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "GROUNDING (verified this session, build on these -- do NOT re-derive): - Operato"
date: "2026-06-09"
first_ts: "2026-06-09T20:33:09.280Z"
last_ts: "2026-06-09T20:33:30.846Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_950db064-c47/agent-aee42df89eacdee79.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# GROUNDING (verified this session, build on these -- do NOT re-derive): - Operato

> **claude-code-cli** | 2026-06-09 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_950db064-c47/agent-aee42df89eacdee79.jsonl`

## Transcript

### User | 2026-06-09T20:33:09.280Z


GROUNDING (verified this session, build on these -- do NOT re-derive):
- Operator GREENLIT: U5 (RTK config.toml live edit) + #14 go-live (get work to main + wire settings.json). Plus: make GPT-OSS-120B the fleet/settings-wide DEFAULT model for offloaded CODING tasks. Plus: investigate Kimi K2.6 cloud (a verdict memory already exists).
- 5 commits to get live, on branch slot/bravo (worktree H:/prism-slot-bravo), all validated this session:
  U9 7771ca7f86 scripts/lib/ollama-coresidency.mjs (co-residency env + hard-reason mutex)
  U1 2340a2e699 mcp-server/src/engines/OllamaTaskOffloaderEngine.ts (roster refresh + tier-then-latency) + its test
  U2 a2756779c2 .claude/hooks/ollama-route-pretooluse.mjs default->gpt-oss:20b + mcp-server/data/state/ollama-route-config.json + test
  U3 a60d7ba0bf .claude/hooks/route-savings-session-start-inject.mjs (offload-subset take-rate) + test
  U4 612418fde7 scripts/ollama-compress-output.mjs (LLM output compressor) + test
- DANGER: slot/bravo is ~2783 commits BEHIND main (cad-fusion-live-ms0) and has ~13940 UNCOMMITTED files in the worktree. A naive 'git merge slot/bravo' into main risks reverting main's newer versions of files (the U2/U3 commits "brought files current" from a stale sync snapshot that may be OLDER than main's latest). The likely-correct path is cherry-pick the 5 commits onto main (or a fresh branch off main -> PR), NOT a branch merge. VERIFY each touched file's main version vs the commit before applying.
- Hardware: RTX PRO 6000 Blackwell 96GB VRAM, 9950X3D, 136GB RAM. Resident Ollama: gpt-oss:120b(~65GB, native tool_calls), gpt-oss:20b(~14GB, tool_calls), qwen2.5-coder:32b(~37GB, text-only, dedicated coder), qwen2.5-coder:1.5b, nomic-embed-text. 120b CANNOT co-reside with 32b.
- Existing PRISM assets: mcp-server/src/engines/OllamaTaskOffloaderEngine.ts (canonical task->model router, U1 refreshed it); .claude/hooks/ollama-offload-enforce.mjs (already defaults gpt-oss:20b); .claude/hooks/ollama-route-pretooluse.mjs (
... [+1549 chars truncated]

### Assistant | 2026-06-09T20:33:18.246Z

I'll start by reading the 5 commits to understand exactly what each touched, then compare each file's slot/bravo version against main's current version.

### Assistant | 2026-06-09T20:33:18.247Z

[tool_use: Bash]

### User | 2026-06-09T20:33:23.395Z

[tool_result] ===== 7771ca7f86 =====
7771ca7f8645feca3c88912b1e182fccdf4e99c9
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-AUTORUN-BUILD]/U-OAB-U9 (slot:bravo): Ollama VRAM co-residency policy + hard-reason load mutex
2026-06-09 13:35:56 -0500

 scripts/lib/ollama-coresidency.mjs      |  92 ++++++++++++++++++++++++++
 scripts/lib/ollama-coresidency.test.mjs | 112 ++++++++++++++++++++++++++++++++
 2 files changed, 20
... [+1887 chars truncated]

### Assistant | 2026-06-09T20:33:30.846Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

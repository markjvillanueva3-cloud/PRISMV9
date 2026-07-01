---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c0bd535-0ecb-4744-9e62-ac1ea40fbe71"
title: "Read-only research. PRISM has post-processor support across multiple controllers"
date: "2026-05-26"
first_ts: "2026-05-26T20:56:18.127Z"
last_ts: "2026-05-26T21:02:30.304Z"
cwd: "H:\\prism"
messages: 6
user_msgs: 2
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-ad6b2bd86d8db3964.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Read-only research. PRISM has post-processor support across multiple controllers

> **claude-code-cli** | 2026-05-26 | 6 msgs (2 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-ad6b2bd86d8db3964.jsonl`

## Transcript

### User | 2026-05-26T20:56:18.127Z

Read-only research. PRISM has post-processor support across multiple controllers but coverage is uneven.

ENUMERATE the controller capability matrix:

CONTROLLERS TO ASSESS (each = machine + control + firmware tuple):
- Fanuc 0i, 6, 15, 16, 18, 21, 30i, 31i, 32i, 35i (each generation has different feature set)
- Okuma OSP-P200, OSP-P300, OSP-P500
- Haas (NGC, NGC II)
- Mazak Mazatrol (Matrix, SmoothG, SmoothX)
- Heidenhain (TNC 530, TNC 620, TNC 640, iTNC 7) — ISO + conversational modes
- Mitsubishi M70, M80
- Siemens 828D, 840D sl
- Hurco WinMax, UltiMax
- Fadal CNC88, CNC32
- Mori Seiki MSX-501, MSG, MSC

For each controller, audit:
- Whether PRISM has a named post-processor / dialect / capability JSON for it
- Whether PRISM has tribal knowledge tips for it (knowledge/wiki/code-tribal/controller-knowledge-tips-*)
- Whether PRISM has macro-language support for it
- Whether PRISM has conversational support for it (where applicable — Mazak / Heidenhain / Hurco / Siemens)
- Whether PRISM has probe-cycle support (Renishaw integration)

Sources:
- `H:/prism/.claude/commands/` — controller-specific skills (`hurco-*`, `okuma-*`, `fanuc-*`, etc.)
- `H:/prism/knowledge/wiki/code-tribal/controller-knowledge-tips-ctrl-*.md`
- `H:/prism/mcp-server/data/docs/WEDM_DIGEST.json` (5 wedm dialects)
- `H:/prism/mcp-server/src/engines/` — search for *PostEngine, *DialectEngine, *MasterPost, *PPCapability
- `H:/prism/state/shared/system-viz/system-graph.json` — controller nodes

For each controller report a tier:
- TIER-3 = full coverage (post + tribal + macro + sim + prove-out)
- TIER-2 = partial coverage (post + some tribal, no macro/conv)
- TIER-1 = minimal (skill name exists, no real depth)
- TIER-0 = absent

Then identify:
- The 5 controllers PRISM is strongest on
- The 5 controllers PRISM is weakest on
- A capability matrix shape proposal: what fields should each (machine, controller, firmware) tuple's JSON declare? (e.g. G-code set, M-code set, canned-cycle set, parameter-macro 
... [+266 chars truncated]

### Assistant | 2026-05-26T20:56:36.773Z

I'll audit PRISM's controller coverage systematically by checking skills, tribal knowledge, post-processors, and capability data.

### Assistant | 2026-05-26T20:56:37.326Z

[tool_use: Bash]

### User | 2026-05-26T21:02:26.916Z

[tool_result] Command running in background with ID: bue55cn53. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\5c0bd535-0ecb-4744-9e62-ac1ea40fbe71\tasks\bue55cn53.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-26T21:02:29.925Z

Let me check the command status and search more efficiently for controller coverage.

### Assistant | 2026-05-26T21:02:30.304Z

[tool_use: Glob]

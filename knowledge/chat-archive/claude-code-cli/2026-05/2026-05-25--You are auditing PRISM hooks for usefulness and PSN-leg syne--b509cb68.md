---
type: "chat-session"
source: "claude-code-cli"
session_id: "b509cb68-ee29-43c3-a769-df1de44a2b7c"
title: "You are auditing PRISM hooks for usefulness and PSN-leg synergy. Your slice: `H:"
date: "2026-05-25"
first_ts: "2026-05-25T17:41:54.398Z"
last_ts: "2026-05-25T17:42:23.292Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/b509cb68-ee29-43c3-a769-df1de44a2b7c/subagents/agent-afb3f79cf407f5497.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# You are auditing PRISM hooks for usefulness and PSN-leg synergy. Your slice: `H:

> **claude-code-cli** | 2026-05-25 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b509cb68-ee29-43c3-a769-df1de44a2b7c/subagents/agent-afb3f79cf407f5497.jsonl`

## Transcript

### User | 2026-05-25T17:41:54.398Z

You are auditing PRISM hooks for usefulness and PSN-leg synergy. Your slice: `H:/prism/state/shared/audits/hook-slice-8.json` (likely 75-80 entries — the last slice; each has fields: id, file, wired, disabled, events, description, descriptionInferred, tier, sizeBytes, lines).

For EACH hook entry in the slice:
1. Open the file at `H:/prism/<file>` (paths in slice are relative).
2. Read 40-80 lines (header + first function) to understand its actual job.
3. Classify against the PSN 11-leg taxonomy and emit a JSON object.

PSN legs (use these EXACT strings): `Obsidian-brain`, `PRISM-OS`, `Wiki`, `Memories`, `Tribal`, `System-Viz`, `Engines`, `Algorithms`, `Formulas`, `NN-GNN`, `PRISM-AI`

PSN-leg detection signals (keyword/path scans inside the file):
- Obsidian-brain → `MEMORY.md`, `knowledge/memories/`, `.obsidian/`, `_brain`
- PRISM-OS → `prism_operating_system`, `dispatcher_map`, `desk_*`, `shell_bootstrap`
- Wiki → `knowledge/wiki/`, `[[wikilink]]`, `wiki-`, `WikiIndexMaintainer`
- Memories → `knowledge/memories/feedback/`, `knowledge/memories/reference/`
- Tribal → `knowledge/tribal/`, `tribal-`, `playbook`
- System-Viz → `state/shared/system-viz/`, `system-graph.json`, `regen-viz`
- Engines → `src/engines/`, `*Engine.ts`, `EngineRegistry`
- Algorithms → `src/algorithms/`, `algorithmRegistry`
- Formulas → `src/formulas/`, `formulaRegistry`, `src/physics/constants`
- NN-GNN → `nn-graph`, `graphsage`, `GNN`, `neural-`, embedding-source, AUROC
- PRISM-AI → `prism_ai`, `ai-system-router`, `aiSystemRouterEngine`

Schema per hook:
```json
{
  "id": "<id>", "file": "<file>", "wired": <bool>, "events": [...], "tier": "<tier>",
  "purpose": "<1-sentence>", "psnLegs": [<max 4>], "psnSynergized": <bool>,
  "verdict": "live"|"orphan"|"deprecated"|"broken"|"dead-stub",
  "notes": "<1-line or empty>"
}
```

Verdict rules:
- `live` = wired AND non-trivial code AND not deprecated
- `orphan` = wired:false AND has real logic
- `deprecated` = header marks it deprecated/superseded O
... [+524 chars truncated]

### Assistant | 2026-05-25T17:42:10.405Z

I'll start by reading the slice file to understand what hooks I need to classify.

### Assistant | 2026-05-25T17:42:10.493Z

[tool_use: Read]

### User | 2026-05-25T17:42:19.804Z

[tool_result] 1	[
2	  {
3	    "id": "stop-slot-task-claims-advisory",
4	    "file": ".claude/hooks/stop-slot-task-claims-advisory.mjs",
5	    "wired": true,
6	    "disabled": false,
7	    "events": [
8	      {
9	        "event": "Stop",
10	        "matcher": "",
11	        "timeout": 3000,
12	        "type": "command",
13	        "layer": "user",
14	        "disabled": false
15	      }
16	    ],
17	    "descrip
... [+47237 chars truncated]

### Assistant | 2026-05-25T17:42:23.292Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

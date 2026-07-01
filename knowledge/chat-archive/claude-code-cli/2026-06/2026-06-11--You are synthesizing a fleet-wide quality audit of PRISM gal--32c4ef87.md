---
type: "chat-session"
source: "claude-code-cli"
session_id: "32c4ef87-567e-4db1-aef8-17e4186ddcf6"
title: "You are synthesizing a fleet-wide quality audit of PRISM galaxy doctrine files. "
date: "2026-06-11"
first_ts: "2026-06-11T02:23:44.660Z"
last_ts: "2026-06-11T02:23:46.414Z"
cwd: "H:\\PRISM"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/32c4ef87-567e-4db1-aef8-17e4186ddcf6/subagents/workflows/wf_067bb14c-56f/agent-ad33e3ff85eb2b61f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# You are synthesizing a fleet-wide quality audit of PRISM galaxy doctrine files. 

> **claude-code-cli** | 2026-06-11 | 2 msgs (1 user / 1 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/32c4ef87-567e-4db1-aef8-17e4186ddcf6/subagents/workflows/wf_067bb14c-56f/agent-ad33e3ff85eb2b61f.jsonl`

## Transcript

### User | 2026-06-11T02:23:44.660Z

You are synthesizing a fleet-wide quality audit of PRISM galaxy doctrine files. Below is the JSON array of per-galaxy grades (soulGrade/claudeGrade are 0..1; isStubSoul/isStubClaude/coherent are booleans; topIssues are concrete findings).

[]

Produce a CONCISE markdown report (no preamble) with:
1. **Headline** -- fleet mean soulGrade + mean claudeGrade (compute them), count of stub souls, stub CLAUDE.md, incoherent pairs.
2. **Worst souls** -- a ranked table (galaxy | soulGrade | the single most important issue) of the bottom ~8 by soulGrade.
3. **Worst CLAUDE.md** -- same, bottom ~8 by claudeGrade.
4. **Systemic patterns** -- the 3-5 recurring quality problems across galaxies (e.g. "souls are template-filled with only the name changed", "CLAUDE.md duplicates the root playbook instead of domain doctrine"). Cite specific galaxies as evidence.
5. **Recommended fixes, ROI-ordered** -- the highest-leverage improvements (build-once-fleet-wide vs per-galaxy), concrete and actionable.

Be rigorous and honest -- if the souls are uniformly thin template stubs, say so plainly with evidence. If they are genuinely good, say that too. End with a one-line overall verdict.

### Assistant | 2026-06-11T02:23:46.414Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

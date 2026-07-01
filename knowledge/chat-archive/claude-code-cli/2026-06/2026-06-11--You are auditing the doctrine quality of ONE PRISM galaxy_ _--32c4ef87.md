---
type: "chat-session"
source: "claude-code-cli"
session_id: "32c4ef87-567e-4db1-aef8-17e4186ddcf6"
title: "You are auditing the doctrine quality of ONE PRISM galaxy: \"hermes-zulu\". Read B"
date: "2026-06-11"
first_ts: "2026-06-11T02:23:35.103Z"
last_ts: "2026-06-11T02:23:37.648Z"
cwd: "H:\\PRISM"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/32c4ef87-567e-4db1-aef8-17e4186ddcf6/subagents/workflows/wf_067bb14c-56f/agent-afee7815eccd55daa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# You are auditing the doctrine quality of ONE PRISM galaxy: "hermes-zulu". Read B

> **claude-code-cli** | 2026-06-11 | 2 msgs (1 user / 1 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/32c4ef87-567e-4db1-aef8-17e4186ddcf6/subagents/workflows/wf_067bb14c-56f/agent-afee7815eccd55daa.jsonl`

## Transcript

### User | 2026-06-11T02:23:35.103Z

You are auditing the doctrine quality of ONE PRISM galaxy: "hermes-zulu".

Read BOTH files in full:
- H:/PRISM/mcp-server/src/engines/hermes-zulu/SOUL.md
- H:/PRISM/mcp-server/src/engines/hermes-zulu/CLAUDE.md

PRISM context: each galaxy is a manufacturing-intelligence domain (e.g. mill/lathe/wedm = machining, quoting = pricing, cad = geometry, business = ERP, system-viz = the system graph, etc.). SOUL.md is meant to be the galaxy's DOMAIN-SPECIALIST IDENTITY: a specific persona with domain-grounded "refuses" (things it must never do), a domain filter, and a substantive specialist body tied to THIS galaxy's real domain. CLAUDE.md is meant to be a Bibryam-context-cascade GALAXY SENTINEL: real domain doctrine that auto-loads when an engineer edits within this subdir -- engine pointers, domain rules, gotchas, safety rails -- NOT a generic copy-paste.

Grade rigorously and HONESTLY (R12 -- do not inflate):
- soulGrade (0..1): is the soul a REAL, domain-specific specialist identity, or generic boilerplate that could belong to any galaxy? Penalize: vague identity, refuses that are not domain-grounded, no domain filter, template text with only the name swapped.
- claudeGrade (0..1): does CLAUDE.md carry genuine, actionable domain doctrine for THIS galaxy, or is it thin/placeholder/duplicated-from-root? Reward concrete engine/dispatcher/path references and real domain rules.
- isStubSoul / isStubClaude: true when the file is mostly generic.
- coherent: do the two files agree on what this galaxy's domain IS?
- topIssues: up to 4 SPECIFIC issues (quote or name the weak part), empty array if genuinely excellent.

Return ONLY the structured grade for galaxy "hermes-zulu".

### Assistant | 2026-06-11T02:23:37.648Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

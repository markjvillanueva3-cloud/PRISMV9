---
type: "chat-session"
source: "claude-code-cli"
session_id: "a198ff5f-9c3d-44ad-a040-50b918b0a91a"
title: "For slot:mike (canonical domain = WIRE WIZARD per H:/CHAT-SLOT-DOMAINS.md), thin"
date: "2026-05-28"
first_ts: "2026-05-28T16:01:30.856Z"
last_ts: "2026-05-28T16:02:33.192Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-a80355be300a34460.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# For slot:mike (canonical domain = WIRE WIZARD per H:/CHAT-SLOT-DOMAINS.md), thin

> **claude-code-cli** | 2026-05-28 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/agent-a80355be300a34460.jsonl`

## Transcript

### User | 2026-05-28T16:01:30.856Z

For slot:mike (canonical domain = WIRE WIZARD per H:/CHAT-SLOT-DOMAINS.md), think deeply about what NEW custom skills + scripts + hooks would 10x its capability output WITHOUT requiring operator instruction. Read briefly:
- H:/prism/mcp-server/src/engines/wedm/CLAUDE.md (mike's galaxy scope)
- H:/prism/state/shared/per-slot-galaxy-buildout/mike.md (its build brief — for context only)
- C:/Users/wompu/.claude/projects/H--prism/memory/reference_wire_domain_atlas_for_mike_2026_05_27.md (existing domain map)

Then return JSON with these fields:

{
  "slot": "mike",
  "domain": "wedm",
  "recommendations": [
    {
      "kind": "skill" | "script" | "hook",
      "name": "<verb-noun-domain>",
      "purpose": "<one-line — what it does + why now>",
      "trigger": "<when it fires — keyword in prompt / cwd glob / commit / file event>",
      "estimated_loc": <number>,
      "estimated_token_savings_per_use": <number>,
      "leverage_score": <1-10 — how many uses-per-month × savings-per-use × non-obviousness>
    },
    ... (3-5 entries, ranked by leverage_score desc)
  ],
  "biggest_gap": "<one-line — the single most important capability mike lacks today>",
  "fastest_first_ship": "<which of the recommendations to ship first, in <2hr>"
}

Constraints:
- Recommendations must NOT duplicate existing PRISM skills/hooks
- Each recommendation must be writable as ≤200 LOC
- Focus on AUTOMATED activation (per operator: no manual invocation needed)
- Slot owns its work; don't recommend things golf/sierra/papa would build

Report only JSON. Under 600 words total.

### Assistant | 2026-05-28T16:01:50.748Z

I'll read the three context files briefly, then return the JSON.

### Assistant | 2026-05-28T16:01:51.284Z

[tool_use: Read]

### Assistant | 2026-05-28T16:01:51.798Z

[tool_use: Read]

### Assistant | 2026-05-28T16:01:52.455Z

[tool_use: Read]

### User | 2026-05-28T16:01:53.879Z

[tool_result] 1	# WEDM Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-26 — HONEST STUB)
2	
3	> **Bibryam Context Cascade pattern (Pillar P1 of the Galaxy Doctrine).** This file loads automatically when Claude is editing under `mcp-server/src/engines/wedm/`. The root `CLAUDE.md` covers PRISM-wide doctrine; this file SHOULD cover wedm-specific conventions, gotchas, and pointers.
4	>
5	> ## ⚠ HONEST 
... [+6934 chars truncated]

### User | 2026-05-28T16:01:53.942Z

[tool_result] 1	# Galaxy buildout — slot:mike (galaxy:wedm)
2	
3	> **Auto-fire trigger:** this file is THE first prompt slot:mike executes on fresh-launch when `mcp-server/src/engines/wedm/` is missing OR incomplete.
4	> **Master protocol:** `state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md`
5	
6	## Your mission (per operator goal 2026-05-28)
7	
8	Build slot:mike's **complete galaxy** so future sessions get the 
... [+15635 chars truncated]

### User | 2026-05-28T16:01:56.947Z

[tool_result] 1	---
2	name: reference-wire-domain-atlas-for-mike-2026-05-27
3	description: "WEDM/wire-EDM fast-lookup atlas for the mike slot — every backend node + knowledge node + archive path + database/bridge engine on disk, grouped for paste-able lookup. Mirrors the foxtrot mill-domain-atlas pattern. Built 2026-05-27 via 4 parallel Explore agents on operator directive."
4	metadata: 
5	  node_type: memory
6
... [+12652 chars truncated]

### Assistant | 2026-05-28T16:02:33.192Z

```json
{
  "slot": "mike",
  "domain": "wedm",
  "recommendations": [
    {
      "kind": "hook",
      "name": "mike-wedm-physics-constants-guard",
      "purpose": "PreToolUse:Edit/Write hard-block on inlined EDM constants (kc/Taylor mill values applied to wire-EDM, discharge-energy literals, hardcoded wire-tension N values) in mike's worktree. Routes to canonical edm-constants.ts/edm-wires.ts/edm-dielectrics.ts. CLAUDE.md §2 flags those canonical files as 'verify-they-exist' — extraction + guard are co-required.",
      "trigger": "PreToolUse:Edit|Write|MultiEdit, cwd ~ H:/prism-slot-mike/**, file ~ engines/(W?)EDM*.ts, regex match on (kc1\\.1|Kienzle|taylor|discharge.*=.*\\d|wireTensionN.*=.*\\d|pulseOn.*=.*\\d{2,})",
      "estimated_loc": 140,
      "estimated_token_savings_per_use": 4500,
      "leverage_score": 9
    },
    {
      "kind": "hook",
      "name": "mike-jm-die-archive-router",
      "purpose": "Intercepts Glob/Grep over H:/PRISM/JM DIE/WIRE EDM/** (4,058 files, 99 customers) and rewrites to prismSelfAwarenessEngine.getJMDieCustomerPath() + customer-scoped subtree. Prevents 4,000-file Glob explosions; surfaces the 3 ground-truth NC programs (ITW SHAKEPROOF, NOZE TEST, 5-inch-square) automatically when query mentions tech-table/multi-pass/UV-taper.",
      "trigger": "PreToolUse:Glob|Grep where path ~ /JM DIE/WIRE EDM/ OR query keywords match (ITW|TOMEK|OPTIMAS|ATF|HOLO-KROME|tech.?table|multi.?pass|skim|reference.?program)",
      "estimated_loc": 110,
      "estimated_token_savings_per_use": 8000,
      "leverage_score": 9
    },
    {
      "kind": "hook",
      "name": "mike-wedm-post-dialect-resolver",
      "purpose": "On any Edit touching a .cps/.pst/.MIN/.NC file in mike's worktree, auto-injects WEDMPostDialectRouterEngine's canonical Mitsubishi/Sodick/Makino/Agie/Fanuc syntax delta (M-code allowlist, G-code variants, threading sequence, taper M-code) for the resolved controller. Closes the dialect-confusion class that the 16 vendor post
... [+2291 chars truncated]

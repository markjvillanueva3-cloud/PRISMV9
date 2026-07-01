---
type: "chat-session"
source: "claude-code-cli"
session_id: "da9aacf5-7d0a-4de6-899e-d8a50c78583a"
title: "Review a NEW canonical doctrine wiki card for faithfulness + correctness. Read i"
date: "2026-06-02"
first_ts: "2026-06-02T17:54:08.443Z"
last_ts: "2026-06-02T17:55:27.688Z"
cwd: "H:\\prism-slot-alpha"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a1942d624f74cb7ec.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# Review a NEW canonical doctrine wiki card for faithfulness + correctness. Read i

> **claude-code-cli** | 2026-06-02 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a1942d624f74cb7ec.jsonl`

## Transcript

### User | 2026-06-02T17:54:08.443Z

Review a NEW canonical doctrine wiki card for faithfulness + correctness. Read it end-to-end:
H:/prism-slot-alpha/knowledge/wiki/architecture/karpathy-agent-discipline.md

CONTEXT: An operator directed "apply this to all galaxies" where "this" = two Andrej-Karpathy framework images from a tweet (x.com/NainsiDwiv50980/status/2061783825659679047). The two images were:
- Photo 1 "Andrej Karpathy's CLAUDE.md File": 6 Coding Workflow Principles (1 Plan Mode First, 2 Verify Relentlessly, 3 Keep It Simple, 4 Surgical Edits Only, 5 Goal-Driven Execution, 6 Parallelize with Subagents); Core Principles (Simplicity First / No Laziness / Minimal Impact); Engineer Mindset (Tenacity, Leverage, Fun, Atrophy, Speedups≠just-faster, Slopacalypse); TLDR (LLM agents crossed a coherence threshold ~Dec 2025, phase shift, 2026 high-energy year).
- Photo 2 "RAG IS BROKEN — Stop using RAG. Build a Knowledge System": RAG (scattered PDF/DOC/XLS/PPT retrieval) → LLM WIKI (Overview linked to Concepts/Entities/Insights/Connections); footer "Compound Knowledge · Stay Consistent · Get Smarter Over Time."

This card is the SINGLE SOURCE OF TRUTH; 34 galaxy-brain MEMORY.md files will carry a lean pointer to it.

VERIFY:
- Does the card faithfully + completely capture BOTH photos (all 6 workflow principles, the core principles, the engineer mindset items, the TLDR; and Photo 2's RAG→LLM-Wiki thesis + the 3 properties)? Flag any misattribution, omission, or invented content.
- Are the PRISM cross-references plausible/correct as stated: global CLAUDE.md "§KARPATHY DISCIPLINE" + "§CLAUDE.md RULES 5-14", project CLAUDE.md "§PRISM WIKI" + WIKI_SCHEMA.md, the "each galaxy MEMORY.md is an LLM-wiki node" mapping? (You don't need to open those files — judge whether the claims are internally consistent + not overstated.)
- Frontmatter validity, wikilink format, any markdown issues.

Report P0 (factual error / misattribution) + P1 (real issue) explicitly. Grade PASS or FAIL. Be concise — this is a doctrine card
... [+11 chars truncated]

### Assistant | 2026-06-02T17:54:25.909Z

I'll read the card end-to-end and verify it against both source photos and the cross-reference claims.

### Assistant | 2026-06-02T17:54:26.277Z

[tool_use: Read]

### User | 2026-06-02T17:54:53.647Z

[tool_result] 1	---
2	title: Karpathy agent discipline — CLAUDE.md-as-agent-OS + LLM-Wiki
3	type: architecture
4	created: 2026-06-02
5	by: claude-da9aacf5 (slot alpha)
6	tags: [doctrine, claude-md, llm-wiki, agent-discipline, knowledge-system, all-galaxies, token-savings, context-retention]
7	source: "Andrej Karpathy, via @NainsiDwiv50980 (x.com/NainsiDwiv50980/status/2061783825659679047) — 2 framework cards"
8
... [+5382 chars truncated]

### Assistant | 2026-06-02T17:55:27.688Z

The card is short and self-contained. I've read it end-to-end. Let me verify each claim against the two source photos described in the context.

## Review: `karpathy-agent-discipline.md`

**Grade: PASS** (with 1 P1 and several P2/P3 notes)

### Faithfulness to Photo 1 ("Andrej Karpathy's CLAUDE.md File")

- **6 Coding Workflow Principles** — all 6 present, in correct order, with correct names: Plan Mode First, Verify Relentlessly, Keep It Simple, Surgical Edits Only, Goal-Driven Execution, Parallelize with Subagents. Sub-bullets are faithful elaborations consistent with the named principle. PASS.
- **Core Principles** — Simplicity First / No Laziness / Minimal Impact, all three present. PASS.
- **Engineer Mindset** — all 6 items present (Tenacity, Leverage, Fun, Atrophy, Speedups≠just-faster, Slopacalypse), matching the context list exactly. PASS.
- **TLDR** — captures coherence threshold ~Dec 2025, phase shift, 2026 high-energy year. PASS. The card adds "(Claude & Codex)" as the agent examples and an "Intelligence is ahead; integrations/workflows/diffusion must catch up" line — this is a reasonable gloss of the "phase shift in software engineering" thesis, not invented content per se, but see P2 below.

### Faithfulness to Photo 2 ("RAG IS BROKEN")

- **Thesis** — "Stop using RAG. Build a knowledge system." captured verbatim-in-spirit. PASS.
- **RAG depiction** — scattered PDF/DOC/XLS/PPT retrieval, brittle/inconsistent. PASS.
- **LLM-Wiki structure** — Overview at center linked to Concepts/Entities/Insights/Connections. All four node types present and correctly named. PASS.
- **3 footer properties** — Compound Knowledge · Stay Consistent · Get Smarter Over Time, all three present and correctly named. PASS.

No misattribution, no omission, no invented framework content found across either photo. This is the load-bearing check and it passes.

### PRISM cross-references — internal consistency

- Photo 1 → "§KARPATHY DISCIPLINE" + "§CLAUDE.md RULES 5-14": **consistent
... [+3684 chars truncated]

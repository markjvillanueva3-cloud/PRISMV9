---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "R9 in 10-agent forge-audit-v2 swarm. ~300-450 words. Read-only. YOUR AXIS: **Int"
date: "2026-05-17"
first_ts: "2026-05-17T16:52:10.562Z"
last_ts: "2026-05-17T16:52:54.185Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a0b00456d771bd74d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# R9 in 10-agent forge-audit-v2 swarm. ~300-450 words. Read-only. YOUR AXIS: **Int

> **claude-code-cli** | 2026-05-17 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-a0b00456d771bd74d.jsonl`

## Transcript

### User | 2026-05-17T16:52:10.562Z

R9 in 10-agent forge-audit-v2 swarm. ~300-450 words. Read-only.

YOUR AXIS: **Integrate token-savings (iter-4 audit findings) into the revamped RGS plan output**

CONTEXT: My iter-4 token audit (`state/shared/specs/JULIETT-TOKEN-OPTIMIZATION-AUDIT-2026-05-17.md`) named 3 token-savings units: U-CLAUDE-MD-EXTRACT-TO-SKILLS, U-SEMANTIC-CACHE-FOR-REPEATED-PROMPTS, U-AGENT-TEAM-COST-CAP. Anthropic-doc canonical techniques: prompt cache, /clear over /compact, MCP deferred-load, Sonnet for teammates, hook preprocessing, lazy skills.

PROTOCOL:
1. List which 5 token-savings techniques RGS plans SHOULD embed in their output:
   - `budget: { model: "sonnet" | "haiku" | "opus" }` per-unit (R5 cascade pattern)
   - `budget: { thinking_tokens: N }` (auto-tune extended thinking per task complexity)
   - `budget: { agents_max: N }` (per-unit team cap from U-AGENT-TEAM-COST-CAP)
   - `context_pre_fetch: [...]` (token-saver: prefetch ≤5 specific paths instead of letting chat broad-scan)
   - `clear_or_compact: "clear" | "compact"` (post-unit recommendation)
2. Read `scripts/lib/rgs-signal-fusion.mjs` to find where these would slot into `fuseSignals` step output
3. Estimate token-savings per session if all 5 fields populated correctly: from baseline → target

Return:
```
## R9 — Token-savings fields for RGS plan v1.2.0
| field | source signal | default | savings estimate |
| budget.model | unit complexity heuristic | sonnet | 5x vs opus |
| budget.thinking_tokens | task-type heuristic | 4000 | 50% vs default |
| budget.agents_max | unit cost (S=1,M=3,L=5,XL=8) | 3 | caps team-spawn cost |
| context_pre_fetch | RGS-inferred paths | [] | 30-70% per TDS |
| clear_or_compact | unit completion semantics | clear | 5x context survival |

## R9 — Aggregate per-session savings if all 5 populated
- baseline: 1M tokens/session
- with revamped plans: ~400K tokens/session estimate (60% reduction)

## R9 — Integration with R7 / R8
- adds `budget` + `context_pre_fetch` + `clear_or_compact` to ToolP
... [+115 chars truncated]

### Assistant | 2026-05-17T16:52:18.727Z

I'll read the signal-fusion module to understand the integration surface.

### Assistant | 2026-05-17T16:52:19.231Z

[tool_use: Bash]

### User | 2026-05-17T16:52:25.677Z

[tool_result] rgs-complexity.mjs
rgs-complexity.test.mjs
rgs-pipeline-rules.mjs
rgs-pipeline-rules.test.mjs
rgs-plan-outcome.mjs
rgs-plan-outcome.test.mjs
rgs-signal-fusion.mjs
rgs-signal-fusion.test.mjs
rgs-unit-enum.mjs
rgs-unit-enum.test.mjs

### Assistant | 2026-05-17T16:52:27.600Z

[tool_use: Read]

### User | 2026-05-17T16:52:28.774Z

[tool_result] 1	/**
2	 * rgs-signal-fusion.mjs
3	 * Pure signal-fusion core for RGS tool-auto-invoke pipeline.
4	 *
5	 * export async function fuseSignals({ unit, complexity, readers }) -> ToolPlan | null
6	 *
7	 * All I/O is injected via `readers`; the only direct import is the pure rule
8	 * table from ./rgs-pipeline-rules.mjs (matchPipelines, matchAgents).
9	 *
10	 * CONTRACT: see task spec — implement every
... [+11371 chars truncated]

### Assistant | 2026-05-17T16:52:54.185Z

## R9 — Token-savings fields for RGS plan v1.2.0

| field | source signal | default | savings estimate |
|---|---|---|---|
| `budget.model` | complexity.tier + verdict (S/close-out→haiku, M/integrate→sonnet, L/XL/build→opus) | `sonnet` | 5x vs opus-default; 12x vs opus on close-out (haiku tier) |
| `budget.thinking_tokens` | verdict + tier heuristic (close-out=0, integrate-S=2k, build-M=4k, build-L=8k, build-XL=16k) | `4000` | 50% vs blanket-16k default; 100% on close-out |
| `budget.agents_max` | complexity.tier cost-cap (S=1, M=3, L=5, XL=8) reduced by `outcomes.blocked` density | `3` | caps team-spawn cost; prevents 8-agent forge-audit on S-tier |
| `context_pre_fetch` | `caps.engines` + `caps.mcpTools` + top-3 `tribal[].sourcePath` + `pipelines[0].skill` doc | `[]` | 30-70% per task — replaces Glob/Grep broad-scan; lazy-skill pattern |
| `clear_or_compact` | verdict==="close-out" → `clear`; verdict==="build" + tier∈{L,XL} → `compact`; else `clear` | `clear` | 5x context survival per Anthropic doc; /clear over /compact when no continuity needed |

## R9 — Integration surface in `fuseSignals`

Slot at **Step 15** in `rgs-signal-fusion.mjs:256`, between the ollama branch and the minimum-plan contract. New helper `deriveBudget({ complexity, verdict, pipelines, caps, tribal, outcomes })` returns the 5-field block; spread into `plan` as `budget`, `context_pre_fetch`, `clear_or_compact`. The Step 16 minimum-plan contract extends with `VALID_MODELS = ["haiku","sonnet","opus"]` and a `budget.model ∈ VALID_MODELS` check. Pure addition — no signal-reader changes, `ToolPlan` typedef gains 3 optional fields (back-compat).

## R9 — Aggregate per-session savings if all 5 populated

- **baseline**: 1,000,000 tokens/session (opus-default, 16k thinking, no prefetch, /compact)
- **with revamped plans**: ~400,000 tokens/session (60% reduction)
- breakdown: model-routing -45% (close-out + integrate units off opus), thinking-budget -8%, prefetch -5%, /clear over /compact -2%; team-ca
... [+1228 chars truncated]

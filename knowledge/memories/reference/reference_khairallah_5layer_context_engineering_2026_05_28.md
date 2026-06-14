---
name: khairallah-5layer-context-engineering
description: "Khairallah's \"Context Engineering Is Replacing Prompt Engineering\" 5-layer framework (Identity / Knowledge / Memory / Tool / Process). Third variation on the same architecture seen in Cyril and Bibryam today; PRISM's per-slot-galaxy implements all 5 layers fleet-scaled. Source — x.com/eng_khairallah1/status/2059929190158488034 2026-05-28."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.178Z
aliases: reference_khairallah_5layer_context_engineering_2026_05_28
---


## The 5 layers

| Layer | Khairallah label | PRISM equivalent | Coverage |
|-------|------------------|------------------|----------|
| L1 | **Identity Context** — who am I, custom instructions, role | slot soul (`state/shared/slot-souls/<slot>.md`) + per-slot CLAUDE.md | ✅ shipped (24 slots) |
| L2 | **Knowledge Context** — uploaded docs, style guide, examples | per-slot MEMORY.md + PATHS.md + wiki + [[reference_tribal_by_domain_inject|tribal-by-domain-inject]] | ✅ shipped |
| L3 | **Memory Context** — what has Claude learned about you | obsidian auto-feed (Stop hook) + auto-memory dir + master brain | ✅ shipped |
| L4 | **Tool Context** — MCP server connections | `prism_*` MCP dispatchers (100+) + browser/playwright/chrome-devtools/figma/supabase MCPs | ✅ shipped (richer than spec) |
| L5 | **Process Context** — Skills + workflow files | 440+ skills + `_skill-triggers.jsonl` + slot-task-claim + `/loop` autonomous | ✅ shipped |

## Score: PRISM at 5/5

This is the third "stack" variation seen on 2026-05-28 — Cyril's 4-layer, Bibryam's 8-pattern, and Khairallah's 5-layer all map onto the same architecture. PRISM is already implementing all three frameworks at fleet scale (per-slot galaxies × 24 slots).

## One quote worth keeping

> "Prompt engineering treats every conversation as an isolated event. You start from scratch every time. You re-explain your context every time. You get inconsistent results every time because the prompt is slightly different every time."
>
> "Prompt engineering asks: 'What words should I type to get a good result?'"
>
> "Context engineering asks: 'What information does Claude need access to in order to consistently produce the result I want?'"
>
> — Khairallah, 2026-05-28

Source: x.com/eng_khairallah1/status/2059929190158488034, 2026-05-28, 28.1K views.

Related (today's framework family):
- [[reference_karpathy_obsidian_4layer_framework_2026_05_28]] — Cyril × Karpathy 4-layer
- [[reference_bibryam_large_codebase_8_patterns_2026_05_28]] — Bibryam 8 patterns
- [[reference_zodchii_self_correcting_claude_md_2026_05_28]] — zodchii self-correcting setup
- [[feedback_psn_definition]] — PRISM's 11-leg PSN (superset of all three frameworks)

The 5-layer framing is a useful **simpler entry point** for explaining PRISM to outsiders. PSN's 11 legs subsume the 5 layers + add (engines, algorithms, formulas, NN/GNN, system-viz, PRISM AI — domain-specific extensions).

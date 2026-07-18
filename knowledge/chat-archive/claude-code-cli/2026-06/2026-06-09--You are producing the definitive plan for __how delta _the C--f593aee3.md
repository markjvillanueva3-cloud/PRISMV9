---
type: "chat-session"
source: "claude-code-cli"
session_id: "f593aee3-12cf-4e8a-a566-8411386cc606"
title: "You are producing the definitive plan for **how delta (the CAD chat slot) should"
date: "2026-06-09"
first_ts: "2026-06-09T16:18:24.746Z"
last_ts: "2026-06-09T16:19:49.864Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_28042811-3c4/agent-a070a807a775ad90f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# You are producing the definitive plan for **how delta (the CAD chat slot) should

> **claude-code-cli** | 2026-06-09 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f593aee3-12cf-4e8a-a566-8411386cc606/subagents/workflows/wf_28042811-3c4/agent-a070a807a775ad90f.jsonl`

## Transcript

### User | 2026-06-09T16:18:24.746Z

You are producing the definitive plan for **how delta (the CAD chat slot) should use local Ollama LLM models to improve its efficiency** — token savings, speed, and offload — WITHOUT compromising CAD correctness or safety.

You have 4 scoping-lens reports below: (1) local model + existing PRISM Ollama surface inventory, (2) delta CAD task taxonomy with Ollama-suitability, (3) concrete wiring candidates in delta's codebase, (4) adversarial/safety red-lines. The fleet-wide standing directive is feedback_utilize_ollama_for_efficiency (route to local Ollama whenever viable); current fleet offload rate is only ~6% (big headroom).

Produce an operator-facing markdown plan:

1. **TL;DR** — the 3-5 highest-ROI Ollama routings for delta, one line each.
2. **Available local models** — the table from lens 1 (model · size · best-for · delta use).
3. **Reuse map** — existing PRISM Ollama surfaces delta plugs into (don't rebuild): exact skill/script/engine + how delta calls it.
4. **Routing plan by tier:**
   - **Tier 1 — route NOW (drop-in, existing surface):** each item = delta task · Ollama model · invocation (`ask-ollama.mjs <mode>` etc.) · est % token savings · guardrail.
   - **Tier 2 — small wire:** what to build/wire, dependency order, acceptance test.
   - **Tier 3 — defer / risky.**
5. **RED LINES (never route to Ollama)** + **GUARDRAILS** — from lens 4, non-negotiable (geometry correctness, GD&T/PMI, unit disambiguation, safety S(x), ISO286 fits).
6. **Concrete first step** — the single drop-in delta should do first, with the exact command, and the est. session-token savings.

Be SPECIFIC (model tags, file paths, ask-ollama modes, % estimates). Resolve any lens disagreement in favor of the safety/adversarial lens. This plan is the deliverable.

SCOPING REPORTS:
===== LENS inventory =====
I have everything verified. The `model-router` skill name has no command file (it resolves to the cost-router lib). I have the full model inventory, all surfaces, and the live offload 
... [+37580 chars truncated]

### Assistant | 2026-06-09T16:19:49.864Z

I'll produce the operator-facing plan now. I have all four lens reports and have resolved disagreements in favor of the adversarial/safety lens (lens 4).

# Delta CAD — Ollama Local-LLM Efficiency Plan

**Slot:** delta (CAD galaxy) · **Date:** 2026-06-09 · **Standing directive:** `feedback_utilize_ollama_for_efficiency` · **Fleet offload rate now:** ~6.8% (target ≥30%) · **Posture:** default-deny on geometry; offload only mechanical text.

---

## 1. TL;DR — the 5 highest-ROI Ollama routings for delta

1. **Fix the dead archetype-labeler** — `cad-ollama-archetype-label.mjs:14` pins a RETIRED tag (`qwen2.5-coder:7b`); it silently no-ops and Claude hand-classifies instead. Repoint to `qwen2.5-coder:32b` via `resolveSynthesisModel()`. **~95% savings on every part Claude currently classifies.** (Drop-in, do this first.)
2. **Offload context-regain / transcript synthesis** — route each per-digest summarize to `ask-ollama.mjs summarize`, leave only the final fuse for Claude. **~85%** + dodges the rate-limit that killed workflow `wf_66199e81-28f`.
3. **Narrate print-vs-CAD compares locally** — pipe the deterministic compare JSON through `ask-ollama.mjs explain`; Claude keeps the PASS/FAIL judgment. **~70%** of the narration turn.
4. **Gloss wiki/tribal feature nodes via Ollama** — clone `summarize-all-scripts-via-ollama.mjs`; Ollama owns ≥70% of per-node prose (WIKI PROTOCOL). **~80%.**
5. **Route large CAD-doc/wiki reads to `/route-to-obsidian`** — any cad wiki/memory entry ≥500 lines summarized locally instead of read into context. **~3-10K tokens/read.**

> **All five are mechanical text ops. ZERO touch geometry, units, tolerances, fits, or collision margins** — those stay Claude-only (see §5).

---

## 2. Available local models (verified live `/api/tags` 2026-06-09)

| Model tag | Size | Best-for | Delta use |
|-----------|------|----------|-----------|
| `gpt-oss:120b` | 65.4 GB | Top synthesis/reasoning brain (120B MoE, ~134 tok/s) | Galaxy roll-ups, multi-digest fus
... [+12823 chars truncated]

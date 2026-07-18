---
title: Karpathy agent discipline — CLAUDE.md-as-agent-OS + LLM-Wiki
type: architecture
created: 2026-06-02
by: claude-da9aacf5 (slot alpha)
tags: [doctrine, claude-md, llm-wiki, agent-discipline, knowledge-system, all-galaxies, token-savings, context-retention]
source: "Andrej Karpathy, via @NainsiDwiv50980 (x.com/NainsiDwiv50980/status/2061783825659679047) — 2 framework cards"
---

# Karpathy agent discipline (canonical card — applied to ALL 34 galaxies)

The single source of truth for the two Andrej-Karpathy frameworks the operator directed be applied fleet-wide (2026-06-02). Every galaxy brain (`mcp-server/src/engines/<domain>/MEMORY.md`) carries a concise pointer to **this** card rather than duplicating it — that DRY/single-source structure is itself the discipline (Photo 2: *stay consistent, don't scatter*; Photo 1: *Simplicity First, Minimal Impact*).

PRISM already embodies both frameworks — this card names them explicitly so every per-domain AI operates under them:
- Photo 1 → global CLAUDE.md **§KARPATHY DISCIPLINE** + **§CLAUDE.md RULES 5–13** (the section heading reads "5–13"; its body extends through R14).
- Photo 2 → project CLAUDE.md **§PRISM WIKI** + `WIKI_SCHEMA.md` (Karpathy LLM-Wiki, adopted 2026-04-27).

---

## Framework 1 — "Andrej Karpathy's CLAUDE.md File" (the agent operating system)

A CLAUDE.md is not a prompt — it behaves like an **operating system for the agent**. LLMs become dramatically better when forced into disciplined workflows. The failure modes it counters: models *assume instead of asking*, *overengineer simple tasks*, *hide confusion*, *rewrite unrelated code*, *optimize for completion not correctness*.

### 6 Coding Workflow Principles
1. **Plan Mode First** — plan mode for any non-trivial task; write detailed specs up front; reduce ambiguity before writing code; lightweight inline plan for smaller tasks.
2. **Verify Relentlessly** — watch like a hawk; check assumptions, edge cases, tradeoffs; run tests, review diffs, verify correctness; don't blindly accept — **stay in the loop**.
3. **Keep It Simple** — avoid overengineering + bloated abstractions; prefer 100 lines over 1000; clean up dead code and cruft; ask "is there a simpler way?"
4. **Surgical Edits Only** — change only what's necessary; don't touch unrelated code/comments; don't "improve" what isn't broken; minimize side effects and churn.
5. **Goal-Driven Execution** — give clear **success criteria**; write tests first then make them pass; use tools (e.g. browser/MCP) in the loop; **let the agent iterate until the goal is met**.
6. **Parallelize with Subagents** — offload research/exploration/analysis; use subagents to keep context clean; one task per subagent for focus; **merge results back with judgment**.

### Core Principles
- **Simplicity First** — minimal code that solves the problem; nothing speculative.
- **No Laziness** — find root causes; no temporary fixes; senior-developer standards.
- **Minimal Impact** — only touch what's necessary; no side effects; no new bugs.

### Engineer Mindset
- **Tenacity** — agents never tire; relentless iteration beats giving up; stamina is a force multiplier.
- **Leverage** — give success criteria and watch it go; *imperative → declarative*; multiply your leverage.
- **Fun** — remove drudgery, focus on creativity; more courage, less blocking.
- **Atrophy** — writing and reading code are different; stay sharp intentionally.
- **Speedups ≠ just faster** — do more, not just faster; expand *what* you can build, not just *how quickly*.
- **Slopacalypse** — brace for AI slop in 2026; hype will be loud; **signal requires judgment**.

### TLDR
LLM agent capabilities (Claude & Codex) crossed a coherence threshold ~Dec 2025 — a phase shift in software engineering. Intelligence is ahead; integrations / workflows / diffusion must catch up. 2026 = high-energy year as the industry metabolizes it.

---

## Framework 2 — "RAG is broken — build a Knowledge System" (the LLM-Wiki)

**Stop using RAG. Build a knowledge system.** Retrieval over a pile of scattered PDF/DOC/XLS/PPT files (RAG) is brittle and inconsistent. Instead, build an **LLM-Wiki** — a structured, interlinked knowledge graph:

- **Overview** at the center, linked to **Concepts**, **Entities**, **Insights**, **Connections**.
- Three properties that make it compound: **Compound Knowledge** (every addition links to what exists) · **Stay Consistent** (one source of truth, not N scattered copies) · **Get Smarter Over Time** (the system improves with each session instead of re-deriving).

**PRISM mapping:** the `knowledge/wiki/` tree IS the LLM-Wiki; **each galaxy `MEMORY.md` is that galaxy's LLM-wiki node** — a compounding brain (Concepts/Entities/Insights/Connections via `[[wikilinks]]`), queried *before* re-deriving. The galaxy-federation roll-up (`galaxy-cards/`) is the cross-node Connections layer. This is why a galaxy brain is a *brain*, not a log: it compounds.

---

## How this is applied to all galaxies

`scripts/apply-karpathy-doctrine-to-galaxies.mjs` appends one consistent pointer block (marker `## Karpathy agent discipline`) to every `mcp-server/src/engines/*/MEMORY.md` — idempotent (skip-if-present), additive, deterministic. Re-runnable any time a new galaxy is added. The pointer keeps each brain's always-loaded context lean (a few lines) while making the full doctrine one `[[karpathy-agent-discipline]]` hop away — the recall-over-reread / DRY discipline that is alpha's whole ethos and the frameworks' own teaching.

Memory: [[feedback_karpathy_discipline]] · [[feedback_r5_thru_r12_doctrine]] · related [[feedback_obsidian_brain]] (the LLM-Wiki substrate).

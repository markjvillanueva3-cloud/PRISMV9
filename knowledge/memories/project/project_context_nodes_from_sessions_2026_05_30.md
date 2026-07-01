---
name: project_context_nodes_from_sessions_2026_05_30
description: FUTURE TASK (operator-requested 2026-05-30) — mine all Claude-Code session transcripts to generate "context nodes" keyed to "code words", injected when a code word is encountered. Alpha domain. Spec written; build pending (Stage 2 Ollama-gated).
type: project
source: prism-memory
synced: 2026-06-27T20:30:46.457Z
aliases: project_context_nodes_from_sessions_2026_05_30
---


**Operator request (verbatim, 2026-05-30):** *"can we go through all previous sessions including
this one and generate context nodes for when we encounter code words?"* Told to ADD AS A FUTURE
TASK (not build now).

**What it is:** mine every Claude-Code session transcript (`C:/Users/wompu/.claude/projects/
H--prism*/**/*.jsonl` + the live session) to discover the project's **code words** (recurring
jargon / operator coinages / acronyms / unit-IDs / named systems) and generate a durable **context
node** per code word (definition + key_facts + provenance pointers + co-occurrence edges). At
runtime, when a code word is encountered in a prompt, inject the matching node.

**Why it's not already covered:** the existing injectors (`master-index-precheck-inject`,
`wiki-precheck-inject`, `memory-relevance-inject`, `tribal-by-domain-inject`) index *code / wiki /
memory files* — they do NOT mine the **session transcripts**. Operator coinages and the dense
context around them often live ONLY in `.jsonl` history and never get promoted to wiki/memory. This
surfaces that un-mined tribal conversational knowledge. This is alpha's domain
(context/memory/efficiency/Obsidian-brain) and a PSN brain-upgrade candidate.

**How to apply (when picked up):** read the full spec
`state/shared/specs/CONTEXT-NODES-FROM-SESSIONS-CODEWORDS-2026-05-30.md`. 3 stages: (1) MINE
transcripts → codeword candidates (no LLM, validatable now — build FIRST); (2) GENERATE context
nodes (Ollama-summarize — DEFERRED, `/api/chat` was dead 2026-05-30, foundation-first split like
U-TRIBAL-INDEX-LOCK); (3) INJECT runtime hook (prefer FEEDING master-index over a 5th parallel
injector — R8). Advisory + mustHumanVerify on every node; streaming `.jsonl` reader (no OOM);
incremental watermark; real-corpus E2E test (hermetic fakes don't prove wiring). `.claude/` hook
wiring is golf-routed from the alpha worktree. Run `duplicationGuardEngine.mustCheckBeforeCreating()`
before any engine. Reuse `scripts/lib/master-index-search-lib.mjs` for ranking.

Unit: `U-CONTEXT-NODES-CODEWORDS` (proposed milestone `BRAIN-CONTEXT-NODES-MS0`). Sibling sweep:
[[reference_alpha_tribal_index_race_2026_05_30]] (foundation-first-when-Ollama-dead pattern).
Standing rule: [[feedback_always_fill_gaps]].

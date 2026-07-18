---
name: feedback_synergy_definition
description: "Canonical operator definition of \"synergy\"/\"synergize\"/\"synergized\" -- it means EVERY PRISM substrate working together in unison, optimally and strategically. The all-systems directive. Sibling of [[feedback_psn_definition]]."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.446Z
aliases: feedback_synergy_definition
---


**Operator directive (2026-06-14, FLEET-WIDE).** When the operator says **"synergy"**, **"synergize"**, or **"synergized"**, it is a TOTALITY directive: it means **ALL** of the following PRISM substrates must **work together in unison, optimally and strategically** -- each feeding and reinforcing the others, none idle, siloed, or merely advisory. "Synergize X" = wire/optimize X so it participates in this whole-system loop. Treat it like [[feedback_all_means_all]] applied to systems, not records.

**The substrates that "synergy" spans (the complete population):**

1. **AI / learning / reasoning** -- PRISM AI systems, PRISM learning systems, PRISM reasoning systems, LoRA, NN, GNN, CAG, RAG (+ hybrids), deep learning, deep reasoning, all other AI learning systems, `PRISMCreativeReasoningEngine`.
2. **PSN + knowledge substrates** -- the 11-leg PSN ([[feedback_psn_definition]]), the Obsidian vault, memories, wikis, tribal-knowledge injections, `/system-viz` (the 110K-node master graph).
3. **Hermes + orchestration** -- the Hermes app/fleet (now free-local on Ollama, [[reference_hermes_bridge_ms0_2026_06_13]]), Claude Code CLI (26-slot NATO fleet), agent orchestration, the `/ask-hermes` bridge.
4. **Code assets** -- engines, pipelines, algorithms, formulas, databases, the mcp-server + ALL its dispatcher tools, skills, scripts, hooks, container skills.
5. **Doctrine + context** -- per-galaxy `CLAUDE.md`, per-galaxy `souls.md`, galaxy/chat-slot/domain mappings, PRISM awareness, PRISM injection, context injection during 1M-context sessions.
6. **Session lifecycle** -- token-savings measures, precompaction, compaction (incl. proactively self-invoking `/compact` BEFORE the 1M auto-compaction when warranted), session handoff, auto-startup, the check-in system, every Stop hook + auto-invoking mechanism, git-tree committing + organizing.
7. **Model routing** -- automatic utilization of Ollama + the right local model (gpt-oss:120b / qwen2.5-coder:32b / gpt-oss:20b / qwen2.5vl:32b ...) to offload and save tokens WITHOUT losing quality; automatic model switching per task class (Ollama -> Sonnet -> Opus ladder).
8. **Domain data + product** -- the resource folder, the JM Die shop fleet, documents (Docustrata), PRISM app features.

**Why:** the operator repeatedly invokes "synergy" as shorthand for the whole-system integration goal; pinning the canonical meaning prevents both under-scoping (treating it as one subsystem) and the unbounded-prose trap (treating it as "improve everything forever"). "Synergize <scope>" is BOUNDED by the named scope -- apply the all-substrates loop TO that scope, with a deterministic done-signal (R12/loss-function), not an open-ended rewrite of the fleet.

**How to apply:** when a prompt contains synergy/synergize/synergized, (1) identify the SCOPE (which galaxy/feature/substrate the operator named -- if none, ask or default to the current slot's galaxy); (2) make every substrate above that is relevant to that scope actively participate -- read-before (PSN/master-graph/vault), route mechanical work to Ollama, persist outcome after (memory->Obsidian->master-index), wire to every natural consumer, eval-gate with numbers; (3) state the bounded done-signal. Enforced/surfaced by `.claude/hooks/synergy-definition-inject.mjs` (UserPromptSubmit, keyword-gated; knob `PRISM_SYNERGY_DEFINITION_INJECT_DISABLE=1`). Sibling: [[feedback_psn_definition]], [[feedback_all_means_all]], [[feedback_offload_forceable_boundaries_not_mainloop]].

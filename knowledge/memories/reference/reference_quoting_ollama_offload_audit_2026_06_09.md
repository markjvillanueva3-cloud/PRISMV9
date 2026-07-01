---
name: reference_quoting_ollama_offload_audit_2026_06_09
description: "Audit verdict (2026-06-09, slot charlie): the QUOTING galaxy has NO high-ROI Ollama-offload code unit to add -- it is already adequately served. Scripts are mechanical (no Claude to offload). The 2 reasoning bridges already model claude-vs-ollama routing + are tested. Classify tasks are fast string heuristics (Ollama would be slower). Dev loop covered by fleet-wide infra. ollama-fast-classify is a reserved-unused substrate (correct). Future opportunity ONLY: wire a real high-volume-classify question class to ollama-fast-classify IF one is identified. Don't re-audit; don't manufacture a busywork offload (R13)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.142Z
aliases: reference_quoting_ollama_offload_audit_2026_06_09
---


**Operator standing directive** [[feedback_utilize_ollama_for_efficiency]]: "utilize ollama for better task efficiency when viable." Charlie audited the **quoting galaxy** for where to apply it (the loop's ollama-synergy clause, R15 apply-to-galaxy). Verdict below so no future charlie session re-audits.

## Verdict: NO high-ROI quoting-specific offload to ADD (galaxy already adequately served)

Audited surfaces (all read with file:line evidence, 2026-06-09):

1. **Scripts** (`scripts/{compile,generate}-quoting-knowledge.mjs`, `index-quoting-data-files.mjs`, `generate-quoting-awareness.mjs`) -- **mechanical**. e.g. `compile-quoting-knowledge.mjs` derives each entry summary by `frontmatter description -> first prose line -> .slice(0,200)` (line ~66-98). NO Claude call exists to offload. Routing these to Ollama would ADD cold-load + per-doc latency to a regen for a marginal quality gain -- not a token/compute efficiency win. **Not offloadable for efficiency.**

2. **Reasoning bridges** -- `QuotingDeepReasoningBridgeEngine` (`ROUTING_MAP` line ~55) already MODELS the claude-vs-ollama decision: maps 5 question classes to deep substrates (explain-bias->prism-creative, find-pattern->psn-nn-gnn, suggest-rate-adjust->claude-deep-reasoning, cross-customer-rec->prism-creative, outlier-investigate->tribal-rag). All 5 are genuine DEEP reasoning -- none are high-volume-classify, so correctly NONE route to the `ollama-fast-classify` substrate (which IS declared, with reason "cheap local LLM for high-volume classify tasks", but intentionally unused). Routing is TESTED in `OutsideKnowledgeAndDeepReasoning.test.ts` (lines 110-129, "routing matrix" -- asserts 4 of 5 routes; `cross-customer-rec` is the one untested route, a minor R9 coverage nit, NOT an ollama issue). `QuotingNeuralReasoningBridgeEngine.route()` likewise routes via `aiSystemRouterEngine.route()` (claude|ollama|prism_calc|...). **Already correctly wired; deep reasoning is KEEP-ON-CLAUDE.**

3. **Classify tasks** (customer-name filter / `quoting-baseline-guard.mjs`) -- fast string heuristics. Offloading a microsecond heuristic to a cold-loaded local LLM is SLOWER, not efficient. **Not offloadable for efficiency.**

4. **Dev loop** -- charlie's offloadable reads/triage are already covered by the **fleet-wide** infra (`ask-ollama.mjs` summarize/explain/triage, `wiki-read-offload-advisory.mjs`, `OllamaHookBridgeEngine`). Sierra shipped the fleet-wide offload audit (`U-OLLAMA-AUDIT`, commit 7ec4a5ea02). **Quoting inherits it; no galaxy-specific clone needed.**

## The ONE genuine future opportunity (not actioned -- not bounded today)
`ollama-fast-classify` is a real, correct substrate awaiting a use. IF a genuine **high-volume classify** quoting question class emerges (e.g. bulk classify N quote records / line items where a 32B local model is good enough and Claude would be wasteful), add it to `QuotingDeepReasoningBridgeEngine.ROUTING_MAP -> "ollama-fast-classify"` + wire the downstream `aiSystemRouterEngine.route()` execution + an R9 routing test. Until such a task exists, adding it is speculative (R13: comprehensive != inventing busywork).

## Method note (the directive, demonstrated)
This audit was launched as a 5-agent Claude `Workflow` (`wf_9167d994-7ea`) but ALL agents failed on a server-side rate-limit (`Server is temporarily limiting requests`, not usage). Rather than re-wall (872K tokens already burned for null), I routed the audit to the **lean local path** (greps + targeted reads, main loop) -- which is itself the directive applied: when Claude is the bottleneck, do the work where it is cheap. Lesson: a multi-agent Workflow is the WRONG tool for a bounded single-galaxy scan that greps + 4 reads answer directly; reach for it only when fan-out genuinely exceeds one context.

Related: [[feedback_utilize_ollama_for_efficiency]] · [[feedback_ollama_token_routing]] · [[reference_ollama_cost_routing]] · the charlie soul (`route-cycle-time-and-physics-before-cost`).

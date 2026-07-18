---
name: reference_sierra_viz_vault_ollama_synergy_2026_06_24
description: "Sierra 2026-06-24: shipped synergy-ask.mjs (commit 715755e2ed) -- the graph+vault->ollama JOIN the utilization protocol named missing. Answers a PRISM question grounded on BOTH the system-viz graph AND the Obsidian vault, synthesized by local Ollama ($0). Two R16 gaps closed live: system-viz-query find is AND-conjunctive (keyword-extract + per-keyword OR-merge); vault node ids use vault.mem.*/vault.wiki.* not only wiki.*/memory_* (idToVaultPath covers all 4)."
type: reference
slot: sierra
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.204Z
aliases: reference_sierra_viz_vault_ollama_synergy_2026_06_24
---


# Sierra: system-viz + obsidian-vault + ollama SYNERGY combiner (2026-06-24)

Operator: "improve utilization of system-viz, obsidian vault and ollama offloading; synergize the
three together." The utilization protocol ([[tribal---obsidian---system-viz-utilization-protocol]])
named them "three islands rather than one compounding artefact": `ask-ollama viz` grounds on the
GRAPH only; `galaxy-reasoning-bridge` on per-galaxy DOCTRINE only -- NEITHER joins the live graph AND
the vault as grounding for an Ollama answer.

## SHIPPED: scripts/synergy-ask.mjs (commit 715755e2ed, 10 test blocks)
The missing JOIN. `node scripts/synergy-ask.mjs "<question>" [--k 12 --snippets 4 --json]`. Every call
exercises all THREE substrates, $0, read-only (no graph regen, no vault mutation):
1. **system-viz**: per-keyword `system-viz-query find` (graph breadth; find ALSO returns vault nodes).
2. **obsidian**: resolve the top vault hits to their `.md` + pull content snippets -> real RAG grounding.
3. **ollama**: `ask-ollama ask <grounded-prompt>` -> vault-cited answer (recorded as an executedOffload
   -> drives the ollama-utilization metric the fleet keeps measuring near-0).
Fail-soft: ollama-down still returns the grounded hit list. Wired into system-viz TOOLBELT.

## TWO R16 GAPS closed by LIVE validation (pure-fn tests were green while the integration failed)
1. **`system-viz-query find` is AND-conjunctive** -- every term must match ONE node. A natural-language
   question ("how does PRISM offload mechanical work to ollama to save tokens") returned **0 hits**;
   even "ollama offload tokens" (3 words) returned 0 while "ollama offload" (2) matched. FIX:
   `extractKeywords` (drop stopwords/<3-char, dedupe, cap 5) + query EACH keyword individually and
   merge = OR-semantics over the AND matcher. Live after fix: 8-10 grounded hits.
2. **Vault node ids use the `vault.mem.*` / `vault.wiki.*` namespace**, NOT only `wiki.*` / `memory_*`
   (those came from a different query path). So `idToVaultPath` resolved 0 snippets at first. FIX:
   `idToVaultPath` + `isVaultHit` cover all 4 namespaces; `vault.mem.<segs>` ->
   `knowledge/memories/<segs-as-path>.md` (verified files exist). Live after fix: 3 snippets resolved.

LIVE proof: "how does PRISM offload to ollama" -> 8 hits / 3 vault snippets / 798-char grounded answer.

## Lesson (general)
A tool that shells to an existing search CLI must know that CLI's match SEMANTICS -- `system-viz-query
find` is AND-conjunctive, so a multi-word/NL query silently returns nothing. Extract keywords + per-term
OR-merge. And node-id NAMESPACES are richer than the first sample shows (wiki.*/memory_*/vault.mem.*/
vault.wiki.*) -- pure-fn tests pass on the assumed namespace while the live integration resolves 0;
only LIVE validation with real ids surfaces it (sibling of the resolver memory-safety lesson:
green pure-fn tests don't prove the integration). [[reference_sierra_resolver_memory_safe_2026_06_24]]

Related: [[tribal---obsidian---system-viz-utilization-protocol]] · [[feedback_synergy_definition]] ·
[[reference_sierra_resolver_memory_safe_2026_06_24]] · [[reference_sierra_heavy_graph_levers_nongaps_2026_06_24]]

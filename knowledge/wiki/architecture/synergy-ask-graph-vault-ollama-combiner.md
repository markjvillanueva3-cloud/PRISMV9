---
name: synergy-ask-graph-vault-ollama-combiner
description: synergy-ask -- the graph+vault->Ollama JOIN. Answers a PRISM orientation question grounded on BOTH the system-viz graph AND the Obsidian vault, synthesized by local Ollama ($0). The combiner the utilization protocol named missing (ask-ollama viz = graph-only; galaxy-reasoning-bridge = doctrine-only).
tags: [system-viz, obsidian, ollama, synergy, utilization, rag, slot-sierra]
related:
  - tribal---obsidian---system-viz-utilization-protocol
  - cheap-node-access-ms0
  - ollama-expand-ms0
---

# synergy-ask: the graph + vault -> Ollama combiner

`scripts/synergy-ask.mjs` (slot:sierra, SIERRA-VAULT-OPS). The JOIN that makes
PRISM's three knowledge substrates compound instead of behaving as
[[tribal---obsidian---system-viz-utilization-protocol|"three islands"]]:

- `ask-ollama viz`            grounds an Ollama answer on the **system-viz graph only**.
- `galaxy-reasoning-bridge`   grounds on **per-galaxy doctrine only**.
- **synergy-ask**             grounds on the **graph AND the Obsidian vault together**, then
  has local Ollama synthesize a cited answer. $0, read-only (no regen, no vault mutation),
  and every call records an `executedOffload` (drives the ollama-utilization metric).

## Use it for
"Where is X / what does Y do / how does PRISM Z" -- a grounded ORIENTATION answer about PRISM
itself, instead of Grep/Glob or re-deriving from compacted memory.

```bash
node H:/prism/scripts/synergy-ask.mjs "<question>" [--k 12] [--snippets 4] [--json] [--model gpt-oss:20b]
```

## How one call works
1. **system-viz** -- `extractKeywords(question)` then `system-viz-query find <kw> [--brain-only]`
   per keyword. `find` is **AND-conjunctive** (every term must match one node), so a
   natural-language question is OR-merged across its keywords -- without this it returns 0 hits.
   `mergeHits` then **reserves up to `min(4, graphCount, k/3)` slots for structural graph hits**
   (vault still leads). Without this reservation, vault-first + the k-cap evicts EVERY graph hit
   for any documented query (the vault holds a node per commit), so the combiner would silently
   ground vault-only -- defeating the join.
2. **obsidian** -- the top vault hits (`wiki.*` / `memory_*` / `vault.mem.*` / `vault.wiki.*`)
   are resolved to their `.md` and snippet-extracted -> real RAG content grounding.
3. **ollama** -- `ask-ollama ask <grounded-prompt>` -> vault-cited answer.

## Guarantees (enforced in code, not by trusting the model)
- **Zero grounding -> no LLM call.** If the graph+vault yield 0 hits, synergy-ask returns
  `{grounded:false, answer:""}` and NEVER calls Ollama (R5/R12). A 0-hit prompt can only
  hallucinate, so "does not invent" is enforced deterministically, not delegated to the prompt.
- **Fail-soft.** Ollama-down still returns the grounded hit list (just an empty `answer`).

## Reachability (utilization = reachability)
- `/synergy-ask` skill + `skill-auto-trigger` suggestion on orientation phrasings.
- `audit-viz-first-inject` (UserPromptSubmit, PROMPT-side reflex) routes the fleet's orientation
  questions ("where is / how many / what exists / list all") INTO synergy-ask -- a one-line pointer
  appended for WEAK/orientation intents only (STRONG/audit intents get the raw node list).
- `viz-first-redirect` (PreToolUse:Grep|Glob, TOOL-side reflex) appends the synergy-ask pointer when
  Claude greps a concept-noun with **>=3 graph hits** (gated hard: 1-hit exact-match + 2-hit
  disambiguation paths are untouched, so it stays rare).
- system-viz galaxy `TOOLBELT.md` -> "Graph + vault grounded Q&A".

## Lesson
A tool shelling to an existing search CLI must know that CLI's match SEMANTICS
(`system-viz-query find` is AND-conjunctive) and its full id NAMESPACES
(`vault.mem.*`/`vault.wiki.*`, not only `wiki.*`/`memory_*`) -- pure-fn tests pass on the
assumed shape while the live integration resolves 0 hits/0 snippets. Only LIVE validation with
real ids surfaces it. Commits: 715755e2ed (combiner) -> ca7af888b5 (reflex-wire) ->
8f358a2e19 (zero-grounding guard).

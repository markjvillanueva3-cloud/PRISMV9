---
name: reference_sierra_synergy_ask_reflex_wire_2026_06_24
description: "Sierra 2026-06-24 (commit ca7af888b5): wired the fleet's orientation-question reflex (where is / how many / what exists / list all) INTO synergy-ask via the EXISTING audit-viz-first-inject hook -- NO new hook (injection layer is over-supplied per the utilization protocol). buildBody appends a synergy-ask pointer ONLY for WEAK/orientation intents, never STRONG/audit intents. The follow-up the synergy-ask ship (715755e2ed) named as optional. Also: the shared-tree git index.lock contention pattern -- retry-on-failure loop (let git win the lock race), never rm a live lock."
type: reference
slot: sierra
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.200Z
aliases: reference_sierra_synergy_ask_reflex_wire_2026_06_24
---


# Sierra: orientation reflex -> synergy-ask, via the existing injector (2026-06-24)

`synergy-ask.mjs` (the graph+vault->Ollama combiner, commit 715755e2ed) was reachable only by
name. This unit (commit `ca7af888b5`) makes it reachable from the fleet's actual ORIENTATION
reflex point -- WITHOUT adding a hook (the utilization protocol's explicit anti-pattern: "the
injection layer is over-supplied, not under-supplied").

## What changed (minimal, additive)
`audit-viz-first-inject.mjs` already auto-runs `system-viz-query find` (graph-only) on
UserPromptSubmit audit/orientation intents. Its `buildBody` now appends a ONE-LINE synergy-ask
pointer -- but only when `WEAK_AUDIT_KEYWORDS.has(matched)` (the orientation verbs: where is /
how many / what exists / list all / find all / check for / are there any / missing). STRONG
audit intents (audit/inventory/orphan/duplicate/unwired/survey/reconcile/enumerate/gap analysis)
get NO synergy nudge -- they want the raw node list, not a grounded NL answer. Inserted via
array-spread (`...(cond ? [line] : [])`) so `return [...]` stays one expression and the existing
emoji header line is untouched (ASCII-guard safe). Dedup unaffected (keys on `intent::noun`, not
body). Fires fleet-wide -> all-galaxy coverage with zero per-slot work.

## R15 proof
- WIRE: into the existing injector (no orphan, no new hook). `buildBody` exported.
- TEST: +4 R9 routing tests in `audit-viz-first-rate-gate.test.mjs` -- WEAK->pointer present +
  names all 3 substrates + threads the noun; STRONG->absent; node-list+Knobs survive BOTH
  branches; pointer is ASCII-only. 35/35 pass (31 pre-existing + 4 new).
- VALIDATE (live-fired the real hook): "how many MasterIndexEngine..." -> synergy-ask pointer
  with the noun threaded in; "audit MasterIndexEngine for orphans" -> no pointer. Both correct.

## Lesson: shared-tree git index.lock contention (recurred this session)
The shared `H:/prism` tree had 5 concurrent `git.exe` peers; `.git/index.lock` cycled
continuously. NEVER `rm` a live lock (corrupts a peer's in-flight commit). A check-then-`git add`
loses the race (peer re-grabs between the `[ -f .git/index.lock ]` test and the add). The correct
pattern: a RETRY-ON-FAILURE loop that just runs `git add`/`git commit` and lets GIT win the lock
race atomically -- `for i in 1..8; do cmd && break; sleep 4; done`. Won on try 1 once the lock
cleared. Cap the retries (session-limit aware); the edits are durable on disk regardless.

Related: [[reference_sierra_viz_vault_ollama_synergy_2026_06_24]] ·
[[tribal---obsidian---system-viz-utilization-protocol]] · [[feedback_conflict_fork_rule]] ·
[[feedback_synergy_definition]]

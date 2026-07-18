---
source: project
section: KARPATHY DISCIPLINE — think → simplify → surgical → goal-driven
slug: karpathy-discipline-think-simplify-surgical-goal-driven
indexed_at: 2026-04-30T17:22:57.835Z
---

## KARPATHY DISCIPLINE — think → simplify → surgical → goal-driven

**Before writing ANY code** (4-step pre-write checklist — do this in your reply, not in your head):
1. **CLASSIFY** — problem type? (search · state · async · parse · cache · validate · transform · physics · concurrency)
2. **TECHNIQUE** — name the algorithm/pattern. (hash vs tree · FSM vs reducer · `Promise.all` vs sequential · stream vs batch · lazy vs eager)
3. **EDGE CASES** — empty · null · overflow · concurrent · NaN · Infinity · unicode · timeout · oversize · zero · negative
4. **FAILURE MODES** — network · disk · OOM · race condition · invalid state · partial write · stale cache · permission

Code must handle ALL above from line 1. No TODO / FIXME / empty catch / stubs / `toBeDefined()` / `.skip`. Every changed line must trace to the user's request — not "while I'm here" / "might as well".

**Anti-drift checkpoint** (every ~5 tasks, before continuing):
- Am I still on the user's literal goal, or did I wander?
- Is this the simplest solution, or am I over-engineering?
- Did I check existing assets via `duplicationGuardEngine` before building?
- Have I verified each assumption that's load-bearing?

**Use the awareness system, not memory**: `prismSelfAwarenessEngine.recommendAIFeatures(<task>)` for build/route guidance · `prism_session:tool_route_best` for action lookup · `MASTER_INDEX_COMPACT.md` for asset catalog · `PRISM-INVENTORY-LATEST.md` for live counts. Never trust counts in this file's prose.

### Awareness API vs static digest — decision rules
1. **Need to *invoke* something now** (returns `dispatcher:action` you can fire) → `prismSelfAwarenessEngine.findCapabilities(q)` or `recommendAIFeatures(task)` (iterate `[].fullAction`).
2. **Engine-creation dedup beyond `duplicationGuardEngine`** → `findEngines(q)` (ranked, with reason).
3. **JM Die fuzzy lookup** → `searchJMDieCustomer(q)` / `getJMDieProgramPaths(type)`; exact path → `getJMDieCustomerPath(name)`.
4. **Tribal / playbook lookup** → `searchTribalKnowledge(q)` / `searchPlaybookRules(q)` — never grep tribal JSON directly.
5. **Live counts mid-session** → `getManifest().counts` (5-min cache); never inline numbers.
6. **Browsing 3018 engines / 96 dispatchers cheaply** → `ENGINE_DIGEST.md` / `MASTER_INDEX_COMPACT.md` (no JS execution cost).

`recommendAIFeatures` returns `AIFeatureRecommendation[]` — iterate the array; each entry has `{feature, reason, priority, engines, actions, fullAction}`.

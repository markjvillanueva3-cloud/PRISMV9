# MODEL-ROUTING-MS0 — auto-enforced model switching + Ollama offload (slot:india, 2026-06-11)

**Operator goal:** "fable 5 just absolutely demolished our session limits ... auto enforce the use of
fable for heavy planning/brainstorming/gap-filling/deep-reasoning/deep-logic; opus for lighter
reasoning + heavy building/coding; ollama for free verified-100% tasks (heavy-test it); sonnet/haiku
for tasks they're capable of. Goal: wired, fully tested, fully active auto-invoked model switching +
task offloading to ollama."

## What shipped (all committed [MAIN-FORCE] [MODEL-ROUTING-MS0])

| Unit | Artifact | Role |
|---|---|---|
| U-OLLAMA-CAP-PROBE | `scripts/lib/ollama-capability-battery.mjs` + `scripts/ollama-capability-probe.mjs` | 6 verifiable task-types + live runner; **heavy-tested 5 models × 6 tasks** -> `state/shared/ollama-capability-matrix.json` |
| U-CLAUDE-TIER-ROUTE | `scripts/lib/claude-tier-router.mjs` | the MISSING fable-vs-opus layer (composes the canonical `claudeFallbackModel` for the cheap split) |
| U-MODEL-ROUTE-POLICY | `scripts/lib/model-routing-policy.mjs` | the single per-prompt brain: fuses tier-router + capability matrix -> one verdict |
| U-CLASSIFY-STEM-FIX | `scripts/lib/local-llm-task-router.mjs` | bug fix: `classify`/`categorize` never matched (trailing-`\b` stem) -> never offloaded |
| U-MODEL-TIER-ADVISOR | `.claude/hooks/model-tier-advisor.mjs` | **WIRED + LIVE** UserPromptSubmit hook -> injects the per-prompt recommendation |
| U-LANE-MAINFORCE-CONSISTENCY | `.claude/hooks/git-add-lane-guard.mjs` | R11: `[MAIN-FORCE]` now a consistent staging escape (surfaced by dogfooding) |
| (config) | `C:/Users/wompu/.claude/settings.json` | wired the advisor into UserPromptSubmit + default model `fable` -> `opus` (operator-chosen) |

## The routing policy (single source of truth)

For every prompt, `model-routing-policy.routePrompt({prompt, matrix})` returns ONE verdict:

```
safety-critical                                  -> claude/opus (frontier, NEVER local)
matrix-proven mechanical class (classify/extract/format) -> ollama/<100%-verified model>  ($0)
plan/brainstorm/gap-fill/deep-reason/logic (THINK)       -> claude/fable
build/code/wire/refactor (BUILD)                         -> claude/opus
explain/summarize/document (capable)                     -> claude/sonnet
trivial mechanical kept on Claude                        -> claude/haiku
```

The axis is **THINK-vs-BUILD**, not light-vs-heavy: deep planning -> fable even when heavy; building
-> opus even when heavy (operator was explicit).

## Heavy-test findings (the empirical basis — `ollama-capability-matrix.json`)

5 models × 6 verifiable tasks, scored by CODE verifiers (correctness, not format):

| Task | best 100% models |
|---|---|
| classify-enum | gpt-oss:20b, qwen2.5-coder:32b, qwen3-coder:30b, gpt-oss:120b |
| unit-convert | qwen2.5-coder:32b, qwen3-coder:30b, gpt-oss:120b |
| extract-number | qwen2.5-coder:1.5b, qwen2.5-coder:32b, qwen3-coder:30b |
| json-extract | qwen2.5-coder:1.5b, qwen2.5-coder:32b, qwen3-coder:30b, gpt-oss:120b |
| boolean-judgment | qwen3-coder:30b, gpt-oss:120b |
| keyword-extract | **0% on all** (fuzzy — correctly excluded from auto-offload) |

**Standouts:** `qwen3-coder:30b` 100% on 5/6; `qwen2.5-coder:32b` 100% on 4/6. Re-run anytime:
`node scripts/ollama-capability-probe.mjs --models <csv> --out`. Adding a task to the battery + re-probing
auto-expands the offload-safe set (manifest-driven).

## HONEST limitation (R12) — what is and isn't "auto"

- **AUTO (no agent involvement):** the per-prompt advisory fires on every prompt (wired hook); the
  Ollama lane is auto-executed downstream by the existing offloader/AUTOEXEC for scripts that call the
  offload primitives; the **session default** (opus) means new sessions rest on the right bulk tier.
- **NOT hook-forceable:** the main-loop model cannot be switched mid-session by a hook — there is no
  harness API for it. The advisor makes the recommendation **impossible to miss** (same mechanism as
  the SKILL AUTO-INVOKE block); the operator acts via `/model <tier>`, or the next session's default
  applies. This is the maximal real per-prompt enforcement.
- **Subagent routing (fully controllable):** when an orchestrator dispatches agents, it picks the
  model per this policy — `Agent({model: routePrompt(...).model})`. Mechanical/narrow subagent work ->
  sonnet/haiku/ollama; judgment/synthesis -> inherit/fable.

## Knobs
- `PRISM_MODEL_TIER_ADVISOR_DISABLE=1` — silence the advisor · `..._VERBOSE=1` — always show even when on-tier.
- default model: `settings.json "model"` (now `opus`; `/model fable` for an explicit deep-think session).

## Tests (all green)
12 (battery) + 12 (tier-router) + 10 (policy) + 1 (classifier regression) + hook live-validated E2E.

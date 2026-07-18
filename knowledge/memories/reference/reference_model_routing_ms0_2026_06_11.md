---
name: reference_model_routing_ms0_2026_06_11
description: "Auto-enforced model switching (fable/opus/sonnet/haiku/ollama) + heavy-tested Ollama capability matrix, wired+live (2026-06-11 slot:india)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.662Z
aliases: reference_model_routing_ms0_2026_06_11
---


# MODEL-ROUTING-MS0 — auto-enforced model switching + Ollama offload (2026-06-11, slot:india)

**Operator goal:** "fable demolished our session limits" -> auto-enforce fable=deep-think,
opus=build/lighter-reason, ollama=verified-100% mechanical, sonnet/haiku=capable. Wired+tested+active.

**Shipped (all [MAIN-FORCE] [MODEL-ROUTING-MS0], commits 0ab5e0a98b + the tier/policy/advisor commits):**
- `scripts/lib/ollama-capability-battery.mjs` + `scripts/ollama-capability-probe.mjs` -> heavy-tested
  5 models x 6 verifiable tasks -> `state/shared/ollama-capability-matrix.json`. **qwen3-coder:30b 100%
  on 5/6; qwen2.5-coder:32b 100% on 4/6.** 16 (task,model) pairs 100%-safe. keyword-extract 0% (fuzzy).
- `scripts/lib/claude-tier-router.mjs` -- the MISSING fable-vs-opus layer (the canonical
  `ollama-cost-router.resolveExecutor`/`claudeFallbackModel` collapsed the top tier into one "opus"
  placeholder). Composes claudeFallbackModel for the cheap split; adds ONLY the THINK-vs-BUILD split.
- `scripts/lib/model-routing-policy.mjs` -- `routePrompt({prompt,matrix})` = the single per-prompt
  verdict fusing tier-router + the matrix. `ollamaSafeClassModels` = conservative (a class is safe only
  if EVERY measured facet is 100%).
- `.claude/hooks/model-tier-advisor.mjs` -- **WIRED** into both settings.json UserPromptSubmit (after
  ollama-pipeline-injector) + LIVE-validated E2E: plan->fable, build->opus, extract->ollama, explain->sonnet.
- **Default model fable -> opus** (operator-chosen via AskUserQuestion): future sessions rest on opus;
  the advisor nudges up to fable for deep-think, down to sonnet/haiku/ollama. `/model fable` for explicit deep-think.

**TRUE enforcement hook (U-SUBAGENT-MODEL-ENFORCE, commit 5402bcc134):** `.claude/hooks/subagent-model-enforce.mjs`
(PreToolUse[Agent], wired both settings) DENIES the unambiguous leak -- a MECHANICAL subagent task
dispatched to opus/fable -- naming the cheaper model to re-dispatch with. Pure `decideSubagentModel`
(scripts/lib/, 9 tests): deny iff model is opus/fable AND routeClaudeTier says mechanical; allow no-model
(inherits), cheap models, and genuine think/build/safety on opus/fable. Modes
`PRISM_SUBAGENT_MODEL_ENFORCE=strict(default)|warn|off`; fail-soft. LIVE: mechanical->opus DENIED,
think->fable ALLOW, mechanical->sonnet ALLOW, safety->opus ALLOW.

**HONEST limitation (R12):** the MAIN-LOOP model is NOT hook-forceable (no harness API) -- the advisor
RECOMMENDS (impossible-to-miss directive); the operator acts via /model or the session default applies.
What IS hook-enforceable + now enforced: SUBAGENT dispatch (the deny hook above). The OLLAMA lane
auto-executes downstream (offloader/AUTOEXEC).

**Re-run the heavy test:** `node scripts/ollama-capability-probe.mjs --models <csv> --out`. Add a task to
the battery + re-probe to auto-expand the offload-safe set. Knobs: `PRISM_MODEL_TIER_ADVISOR_{DISABLE,VERBOSE}`.

Spec: `state/shared/specs/MODEL-ROUTING-MS0-2026-06-11.md`. Bug fix: [[reference_classify_stem_bug_2026_06_11]].
Composes (not duplicates) tango's [[reference_u_flor_claude_tier_2026_06_11]] (the ollama-miss fallback ladder).

---
node_type: architecture
title: REASON-BEFORE-ACTION-MS0 -- fleet-wide pre-action reasoning gate (octopus PROCEED|REVISE|BLOCK)
status: engine+dispatcher+hook shipped + LIVE-VALIDATED (settings activation operator-gated)
slot: india
created: 2026-06-28
related:
  - psn-octopus-fleet-synergy-ms0
  - multimodelconsensusengine
  - corrigibilitygateengine
  - advisory-offload-telemetry-not-a-gap
  - crossroad-brainstorm-workflow
---

# REASON-BEFORE-ACTION-MS0

The "reason before any action" capability from the AI-systems synergy assessment
(`state/shared/specs/AI-SYSTEMS-SYNERGY-ASSESSMENT-2026-06-28.md`). Before this, PRISM's
multi-model substrate (octopus consensus, local Ollama panel, Claude) was only ever invoked
**caller-explicitly** -- nothing fired a sanity check BEFORE a consequential action. This MS0
closes that gap with the cheapest-sufficient-reasoner pattern, designed adversarially first
(Workflow `wduc6yswq`: 3 recon + 2 design lenses + 1 adversarial + synthesis) because the gate
touches every tool call across 26 concurrent chats.

## Components (shipped)

| File | Role |
|------|------|
| `mcp-server/src/engines/ReasonBeforeActionEngine.ts` | `plan({intent,tool_name,tool_input,risk_level}) -> {verdict:PROCEED\|REVISE\|BLOCK, ...}`. Routes by risk: kill-switch/low = deterministic (no model), medium = 2 local Ollama votes, high = diverse local panel. |
| `prism_ai:reason_before_action` (`aiReasoningDispatcher.ts`) | MCP surface; mirrors `capability_probe`. Callable now. |
| `.claude/hooks/reason-before-action-gate.mjs` | Default-OFF PreToolUse gate that actuates the engine. **NOT wired into settings.json** (operator-gated activation). |

Verifiable core only: reuses `MultiModelConsensusEngine.ask()` (the octopus) + `CorrigibilityGateEngine`
(the human kill switch). 65 tests (40 engine + dispatcher, 25 hook), tsc-clean, 2-arm per-file scrutiny PASS x3.

## Safety invariants (a fleet-wide reasoner MUST hold all)

- **FAIL-OPEN**: every fault (throw / infra-down / null consensus / unparseable / cap-breach) -> PROCEED, NEVER BLOCK. A safety check must not halt work on its own infra hiccup. Three layers in the hook (try/catch + engine `ok:false` + `continueOnError`).
- **CORROBORATED-BLOCK**: a BLOCK requires >=2 succeeding voices at >=0.70 agreement, else softens to REVISE. A weak/thinly-voiced BLOCK never hard-blocks (never strands a slot).
- **$0 / LOCAL-ONLY**: all 6 cloud voice flags (`includeClaude/Codex/Grok/Gemini/DeepSeek/GLM`) hard-set `false` as engine-owned literals; a leaked non-Ollama vendor trips a circuit breaker (loud + self-disable).
- **NO-RECURSION**: sets `PRISM_RBA_IN_FLIGHT` + forces `PRISM_LOCAL_LLM_VIA_MCP=0` + bumps `PRISM_RBA_DEPTH` around the consult so the gate's own Ollama call is direct-HTTP, never an MCP tool call that re-enters the gate. The hook also skips when the sentinel/depth is set.
- **LATENCY-CAPPED**: the HOOK's `Promise.race` 1500ms cap is the real bound; the engine's own timeout is untrusted defense-in-depth.
- **GOVERNANCE (2-key + allowlist)**: blocking requires `PRISM_RBA_GATE_ENABLE=1` AND `PRISM_RBA_GATE_ENFORCE=1` AND an operator-authored allowlist match. Absent any -> advisory annotate only. Kill switch `PRISM_RBA_GATE_DISABLE=1` overrides all. (Satisfies the soul refuse `unsafe-fleet-control-before-governance` structurally.)

## Live validation (U-RBA-LIVE-VALIDATE, 2026-06-28)

The 65 unit tests inject a FAKE consensus panel -- they prove LOGIC, not that the engine
reaches the live local octopus. The R15 VALIDATE leg (`mcp-server/scripts/rba-live-validate.mts`,
a standalone NON-hermetic script -- re-run before activation) ran `plan()` against the REAL
MultiModelConsensusEngine + local Ollama and surfaced a **critical defect the unit tests could
not**: the engine inherited the consensus layer's HEAVY default models (gpt-oss:120b 65GB +
qwen2.5-coder:32b), which cold-load tens of seconds and even warm vote in ~9-14s -- so under the
PreToolUse hook's sub-second cap the gate **fail-opened on 100% of consequential actions** (live:
0/4 medium+high reached the panel). A gate that never reasons is a silent no-op; had it been
activated on the green unit tests, it would have given false "reasoning before action" assurance.

Fix (3 levers, all $0/local):
1. **PIN fast small models** -- `rbaPinnedModels()` defaults to `qwen3-vl:8b-instruct` + `qwen2.5vl:7b`
   (live: ~0.6-0.9s, correct verdicts; `rm -rf` -> REVISE). NOT `qwen2.5-coder:7b` -- it reproducibly
   HANGS to the timeout on this box. These VL tags are host-specific fast classifiers; on a host
   MISSING them the shared engine substitutes a NON-vision model (its picker excludes VLMs) that may
   be slow -> fail-open (safe, but a silent no-op). So on other hosts SET `PRISM_RBA_OLLAMA_MODEL[_2]`
   to that host's fast models. (RBA deliberately seats VLMs the shared picker would reject -- for a
   one-word verdict they are live-verified correct + fast.)
2. **Cap the vote output** -- new additive `ConsensusInput.ollamaMaxTokens` (default 1024 = no change
   for existing consumers); RBA passes 32. A verdict is one word, but an uncapped model can spend
   seconds emitting up to 1024 tokens of prose/`<think>` first.
3. **2 voices, both tiers** -- Ollama voices SERIALIZE on the single GPU, so a 3rd voice only adds its
   full latency; `>=2` already satisfies CORROBORATED-BLOCK. High-risk differs by a longer timeout,
   not more voices (the old diverse-panel-for-high added a capability probe + a 3rd serialized voice
   and reliably blew the budget).

Proven live: `git commit` -> REVISE (2 voices, agreement 1.0); `rm -rf` -> REVISE (1 voice BLOCK
correctly SOFTENED to REVISE -- the corroboration invariant working). Every safety invariant held
under all live conditions (every fail-open = PROCEED; never a false BLOCK). **Activation caveat:**
votes are sub-second in ISOLATION but QUEUE on the shared Ollama daemon under concurrent fleet load
(5-6 active slots -> 16-30s -> the gate times out -> fail-open). So activation either needs a
prioritized/dedicated inference lane for the gate, or accepts fail-open degradation at peak load.
The hook cap default was raised 1500 -> 2500ms (must exceed warm vote latency or it always fail-opens)
and activation REQUIRES pre-warming the pinned models (keep_alive).

## Lessons (bug-finding -> wiki gate)

1. **`*/` inside a JSDoc block comment terminates the comment.** The hook's header wrote `mcp__*/prism_*`; the `*/` closed the block comment, turning the rest into code -> `SyntaxError: Unexpected identifier 'git'`. Caught by the test run. Rule: never write `*/` inside a block comment (use `/` and `*` separated, or a line comment).
2. **`CorrigibilityGateEngine.evaluate()` fails CLOSED.** A fresh process has `lastHeartbeatAt=null`, so `evaluate()` returns `{permitted:false}` and would BLOCK every action -- violating fail-open. The synth spec said "consume `evaluate()` as the pre-gate"; the correct consumption is `snapshot().killSwitchRaised` ONLY (the genuine human interrupt), never the heartbeat dimension. A per-file scrutiny correction.
3. **R7 -- parse the VOTE answer, not `recommendation`.** In `mode:"vote"`, `ConsensusResult.recommendation` (accept/review/escalate) measures AGREEMENT STRENGTH, not the decision: 3 models unanimously voting BLOCK yields `recommendation:"accept"`. The synth spec's C3 mapped `accept->PROCEED`, which would misread a unanimous BLOCK as PROCEED. The engine parses `consensus.answer` (the actual vote) and uses agreement as confidence. Surfaced, not averaged.
4. **Engine-load under portable node v22.12 (NO TS type-strip).** A plain-`node` hook cannot import the `.ts` engine. The hook consults via an env-injectable loader `PRISM_RBA_ENGINE_PATH` (mock in tests; a built/tsx module in prod), fail-open on miss. Same class as the charlie tsx-reexec regression.
5. **A green hermetic test suite can hide a 100%-dead feature -- only LIVE validation catches it.** The 65 unit tests passed while the engine fail-opened on EVERY real action (inherited heavy default models too slow for the latency cap). The mock proved the LOGIC; it could not prove the engine reaches a usable model in budget. R15's VALIDATE-on-live-data leg is non-optional for anything latency-bounded: a feature that "passes tests" but never actually runs its core path is a silent no-op (sibling of the charlie/india "green while broken" mocks).
6. **A latency-bounded model call must pin a FAST model + cap output tokens -- never inherit a deep-consensus default.** The shared MultiModelConsensusEngine rightly defaults to heavy models (gpt-oss:120b) for a thorough, latency-tolerant consensus; a pre-action GATE has the opposite need (one-word verdict, sub-second budget). Same engine, opposite tuning -> the caller must pin small models + a tiny `ollamaMaxTokens`. And because the GPU SERIALIZES local voices, voice count is a latency multiplier: use the fewest voices that satisfy corroboration (2), not the most.

## Activation (U-RBA-WIRE-05, operator-gated -- NOT done)

Never default-ON across 26 chats on day one. Roll out: (1) `npm run build` (or set `PRISM_RBA_ENGINE_PATH` to a loadable module); (2) append the hook to the END of `PreToolUse` in `settings.json` with `continueOnError:true`; (3) `PRISM_RBA_GATE_ENABLE=1` on ONE slot, advisory-first; (4) measure block-rate + latency; (5) expand. Enforcement adds `PRISM_RBA_GATE_ENFORCE=1` + a governance allowlist.

## Provenance

Assessment + R12 catch (T1 offload-actuator DEFLATED as a measurement artifact -- see
[[advisory-offload-telemetry-not-a-gap]]); design Workflow `wduc6yswq`. Memory:
`reference_ai_systems_synergy_assessment_2026_06_28`. Commits `[RBA]/U-RBA-ENGINE-DISPATCH` + `[RBA]/U-RBA-HOOK-04`.

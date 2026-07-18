---
name: reference-octopus-hermes-agents-2026-06-25
description: "OCTOPUS-HERMES-AGENTS (slot:sierra, operator-directed): the octopus multi-model consensus now seats Hermes-AGENT persona voices (distinct system-prompt + label), extending alpha's OCTOPUS-HERMES-MULTIMODEL (model-only voices). hermesGrokModels accepts {model,system,name} specs; hermesAgentLenses() = 5-lens default panel; persona via real role:system through the free Hermes proxy ($0)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.668Z
aliases: reference_octopus_hermes_agents_2026_06_25
---


# OCTOPUS-HERMES-AGENTS — hermes-agent persona voices in the octopus

Operator asked (2026-06-25): **"can we add hermes agents into octopus?"** -> YES, built (slot:sierra).

## What was already there (alpha, OCTOPUS-HERMES-MULTIMODEL, `2b990d785d`)
`MultiModelConsensusEngine.ts` already seated **N distinct Hermes-served MODELS** as voices via `hermesGrokModels: string[]` -> one voice per model through the free Hermes OAuth proxy (`:8645`, $0), opt-in `--with-hermes-grok`. Each called by `callGrokHermesVoice(prompt, model)` with a SHARED prompt -> model-diversity only.

## What sierra added (OCTOPUS-HERMES-AGENTS, this session, 2 commits)
1. **Engine `U-SIERRA-OCTOPUS-HERMES-PERSONAS`** (`MultiModelConsensusEngine.ts`): `hermesGrokModels` now accepts bare model strings OR agent specs `{model, system?, name?}`. `normalizeHermesGrokModels` returns `HermesAgentVoice[]` (string -> `{model}`; back-compat; dedup by `name ?? model` so two DISTINCT personas on ONE model are BOTH seated). `callGrokHermesVoice(prompt, model, timeoutMs, system?, label?)` threads the persona `system` as a REAL `role:system` message (`GrokExecOptions.system` is honored, `GrokClientEngine.ts:221` -- NO client change) + `label` makes a persona a distinct consensus voice. New exported `hermesAgentLenses(model?)` = the proven brainstorm-path-forward 5 lenses (safety-first/root-cause/fastest-unblock/distributed-ownership/adversarial), all on one model at $0, caller-overridable. 12/12 tests; tsc type-clean (file). Downstream fact-check/quorum/agreement unchanged.
2. **CLI `U-SIERRA-OCTOPUS-HERMES-CLI-WIRE`** (`octopus-first-live-record.mjs`): its hermesGrokModels filter stripped non-strings (would drop specs) -> now passes strings OR specs through.

## How to use
- Direct: `multiModelConsensusEngine.ask({ ...input, includeGrok: true, hermesGrokModels: hermesAgentLenses() })` -> 5 persona voices (requires Hermes proxy reachable).
- Or pass your own specs: `hermesGrokModels: [{model:"grok-4.3", system:"You are the X reviewer...", name:"x"}, ...]`.

## iter15 -- DEFAULT-ON (operator: max-pro account -> "drastically increase hermes agent utilization")
`U-SIERRA-OCTOPUS-HERMES-DEFAULT-ON`: the 5-lens persona panel now AUTO-seats on EVERY consensus when the Hermes proxy is reachable (was opt-in). Pure helpers `shouldSeatHermesLenses` (default-ON; precedence: explicit per-call `includeHermesAgentLenses` > knob `PRISM_OCTOPUS_HERMES_AGENTS=0` > default-on) + `resolveHermesVoices` (merge explicit + panel, dedup-by-name). Voices fan out PARALLEL (Promise.all -> latency ~= 1 call); fail-soft per voice; off-proxy unchanged. 29/29 (single-grok-voice contract test opts out explicitly; +1 default-on integration test proving 5 persona voices end-to-end; +9 helper tests). MultiModelConsensusEngine 58/58. This propagates system-wide: EVERY consensus invocation (manual `prism_ai:consensus` AND auto-consensus hooks like critical-edit review) now uses 5 hermes agents instead of 1.
- **PRE-EXISTING (R12, NOT mine):** 2 `AutoConsensusHooks.test.ts` failures (`fakeResult` 1-voice fixture vs a 2-voice cache-quorum check) -- that path reads a CACHE fixture, never calls ask(), so my seating change cannot affect it. A `fakeResult`-vs-quorum mismatch in a different feature/owner. My default-on actually HELPS the quorum (real runs now have 5+ voices). Also pre-existing tsc errors in ReinforcementLearningCAMFeedbackEngine x2 + routes/cost.ts x1 (files I never touched).

## iter16 -- DISPATCHER CONTROL (DONE; was deferred): `U-SIERRA-OCTOPUS-HERMES-DISPATCHER`
`prism_ai:consensus` (`consensus_decide`) schema gained `hermesAgents?: boolean` -> threaded to ask() as `includeHermesAgentLenses`. So a dispatcher caller can force (`true`) / opt out (`false`, quick baseline) / default (on, via iter15). includeGrok stays voice-gated (no forced grok, no test breakage); the engine still backend-gates the hermes path. 23/23 AIDispatcherConsensusDecide; tsc type-clean (my files). FEATURE NOW COMPLETE END-TO-END: engine (personas + default-on) -> CLI (specs) -> dispatcher (control).

## STILL DEFERRED (R12 -- needs operator direction / not autonomously shipped)
- **Auto-INVOKE consensus at MORE decision points** (the bigger "within our system" lever): default-on makes every consensus use 5 agents, but to drastically increase utilization FURTHER, consensus must FIRE more often (e.g. expand the auto-consensus-critical-edit triggers, or route the brainstorm-path-forward crossroad workflow through the hermes panel). Offered to the operator; needs greenlight (changes auto-fire behavior on more operations).
- A live 5-persona consensus run (5 hermes-proxy calls) was NOT executed (latency); validated by unit + integration tests + the confirmed proxy `system` support, not a live fan-out.

## LIVE VALIDATION FINDING (2026-06-25, R12 -- IMPORTANT for the operator + zulu)
`hermes_status` = up:true, **authenticated:FALSE**. A live `hermes_ask` (with a persona system prompt) returned **401 `upstream_auth_failed`: "No available xAI OAuth credentials found. Run `hermes auth reset xai-oauth` or re-authenticate with `hermes auth add xai-oauth --type oauth`."** So although the operator set up a max-pro account, the PROXY's xAI OAuth is NOT currently authenticated. **R12 SELF-CORRECTION (my first-pass report was WRONG):** `GrokClientEngine.hermesProxyReachable()` (GrokClientEngine.ts:177,192) ALREADY auth-gates -- it probes `/health` and returns true ONLY when `{status:"ok", authenticated:true}`. The proxy reports `authenticated:false`, so it returns FALSE -> `includeGrok` (MultiModelConsensusEngine.ts:601) is false (absent XAI_API_KEY/grok-CLI) -> the WHOLE grok/hermes branch is skipped -> NO hermes voices seat (no 5 personas, no single grok, NO doomed calls). Consensus cleanly uses claude+codex+ollama. So there is NO "5 doomed calls" issue and NO refinement needed -- the system already fails fast correctly when OAuth is down. The feature is CORRECT + ready; the 5 personas auto-seat the instant the OAuth is (re)authenticated. The SOLE blocker is the OAuth auth -- zulu's hermes-CLI/auth domain + an operator action (`hermes auth add xai-oauth --type oauth` / `hermes auth reset xai-oauth`).

## Related
- [[reference_octopus_hermes_multimodel_2026_06_25]] (alpha's model-voices base) · [[reference_octopus_hermes_grok_voice_2026_06_24]] · [[reference_psn_octopus_fleet_synergy_2026_05_31]] · [[crossroad-brainstorm-workflow]] (the 5 lenses' origin)

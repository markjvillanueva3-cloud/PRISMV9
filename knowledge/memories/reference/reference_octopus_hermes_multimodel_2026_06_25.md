---
name: reference_octopus_hermes_multimodel_2026_06_25
description: "OCTOPUS-HERMES-MULTIMODEL (slot:alpha, 2026-06-25, commit 2b990d785d) -- octopus consensus now seats N DISTINCT Hermes-Grok models as separate voices via the free OAuth proxy, was exactly 1. Plus the ledger-collapse gap caught by R8."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.669Z
aliases: reference_octopus_hermes_multimodel_2026_06_25
---


**OCTOPUS-HERMES-MULTIMODEL** (slot:alpha, 2026-06-25, commit `2b990d785d` on cad-fusion-live-ms0).

Operator goal: "enhance octopus to utilize hermes agents running through DIFFERENT models with the
xAI api key the backbone." Octopus already seated ONE Grok voice via the free local Hermes OAuth
proxy (:8645) since OCTOPUS-HERMES-SYNERGY (`e3080308e8`). This extends it to seat ONE voice per
DISTINCT Grok model -> genuine cross-MODEL diversity in one consensus run at $0 (the managed OAuth).

**Shipped (6 source files, all additive / default byte-identical):**
- `MultiModelConsensusEngine.ts`: exported pure `normalizeHermesGrokModels` (trim/dedupe -- dedupe
  prevents double-weighting a voice, R7); `ConsensusInput.hermesGrokModels?: readonly string[]`; the
  `ask()` grok-voice branch seats one `callGrokHermesVoice` per distinct model ONLY when the list is
  non-empty AND `hermesProxyReachable()` (memoized; free without the proxy), else the single legacy
  `callGrok`. `callGrokHermesVoice` pins the exact model through `execViaHermesProxy`, fail-soft.
  Mirrors the existing diverse-local Ollama panel idiom (multiple same-vendor voices).
- `scripts/lib/octopus-dispatch.mjs` (`mapConsensusToLedger`): **the gap R8 caught** -- the model-tag
  was hard-coded `vendor==="ollama"`, so multiple xai voices COLLAPSED to bare "xai" in the ledger,
  silently defeating the goal AT THE LEDGER LAYER. Generalized: tag `vendor:model` when a vendor
  fields 2+ voices (ollama always-tagged; single xai stays bare "xai", back-compat).
- `octopus-first-live-record.mjs` (buildLocalOnlyAskOverrides + runLive), `octopus-utilization-driver.mjs`
  (`--hermes-models a,b,c` flag -> AUTO-enables the Grok voice), `install-octopus-utilization-task.ps1`
  (`-HermesModels` param so the continuous cron CAN drive the panel).

**Validated LIVE ($0):** real runLive -> dispatch -> src engine via tsx against the live proxy ->
ledger (`state/shared/octopus-runs.jsonl`) shows 2 DISTINCT Grok models
`["xai:grok-4.3","xai:grok-4.20-0309-reasoning"]` + a local ollama voice. 18/18 tests (5 mapper +
7 wiring round-trip + 6 normalize). 2-arm scrutiny PASS.

**R12 caveat:** SOURCE + tested + tsx-validated. The cron loads the COMPILED `dist/engines/
MultiModelConsensusEngine.js` which is STALE; the panel goes live for the scheduled task on the next
routine fleet `npm run build` (a full rebuild now risks disrupting ~25 live peers -- same deferral as
OCTOPUS-HERMES-SYNERGY). Until then it fail-softs to a single legacy Grok voice.

**Lesson (R8/R16):** a multi-voice consensus feature is only end-to-end if the LEDGER mapper also
distinguishes the new voices -- the ollama-only model-tag would have shown 2 collapsed "xai" voices
and "passed" a broken loss function. Read the consumer (the mapper) before trusting the seating.
Builds on [[reference_octopus_hermes_voice_synergy_2026_06_23]] + [[reference_octopus_utilization_driver_2026_06_24]].

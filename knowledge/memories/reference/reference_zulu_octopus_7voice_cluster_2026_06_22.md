---
name: reference_zulu_octopus_7voice_cluster_2026_06_22
description: ZULU 2026-06-22 — shipped the octopus 5->7-voice consistency cluster (banner + includeGLM consensus round-trip lock + setup-CLI parity + comment honesty), closing the named U-GLM-CONSENSUS-WIRE fast-follows. Bulk-synthesis quicker-turnaround stays routed to alpha (live). Lib-comment "5-voice" drift logged as bounded debt.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.283Z
aliases: reference_zulu_octopus_7voice_cluster_2026_06_22
---


# ZULU octopus 7-voice cluster — 2026-06-22 (slot:zulu, session 679ad5a6)

Operator `/checkin-zulu /goal /loop`: reorient 6/09-6/21 + complete remaining backend (priority zulu) + improve hermes/obsidian/ollama/octopus utilization + synergize via loops/harnesses/crons.

## Reorientation verdict (R12)
Zulu's OWN buildable backend queue is DRY (confirmed by [[reference_zulu_backlog_reconcile_2026_06_19]] + [[reference_zulu_revival_timeout_deferred_2026_06_20]]; the zebra->zulu opt-in path-bug was the last blocker, fixed 6/20 `472764b2df`, now dry-run-observe). Recent zulu work (6/20-6/21) was already deep on the goal's targets: HERMES-UTIL (GLM octopus voice + consensus wire, hermes model fallback, offload-source-split visibility), OLLAMA-OFFLOAD (ask-ollama codegen), MISC-TASKS verifier. The genuine open work = the **named fast-follows** from `122831a2ac` (U-GLM-CONSENSUS-WIRE): *"Probe-banner GLM voice + dedicated includeGLM round-trip test."*

## Shipped this session (4 commits, all [MAIN-FORCE] slot:zulu on cad-fusion-live-ms0)
1. **U-OCT-PROBE-GLM-DEEPSEEK** — `octopus-provider-probe.mjs buildBanner` credited only 5 voices while `MultiModelConsensusEngine` fans out to **7** (it grew DeepSeek `DEEPSEEK_API_KEY` + GLM/Zhipu `GLM_API_KEY||ZHIPU_API_KEY` — engine gates L498/L500). Bumped 5->7 (same undercount class U-OCT-PROBE-GROK-CLI fixed for Grok). +5-core-host-is-honestly-5/7 R9 test. 23/23. **Live: this host renders "READY (3/7 voices)" (was misreporting 3/5).**
2. **includeGLM consensus round-trip lock** (same commit) — `mkGLM(GLMResult)` helper + 5 tests THROUGH `ask()` (joins+dualOllama-suppressed / ZHIPU-alone OR-gate / keyless back-compat / includeGLM:false opt-out / fail-soft errored zhipu voice). `GLM_API_KEY`+`ZHIPU_API_KEY` added to the `_VENDOR_KEYS` hermetic scrub. 51/51 (was 46). tsc clean.
3. **U-OCT-SETUP-GLM-DEEPSEEK** — R15 apply-to-all-surfaces: `scripts/octopus-setup.mjs` (the operator credential checklist, the SECOND voice surface) was still 5-voice -> disagreed with the banner. Added `deepseek`+`glm` cases (`probeEnvAny` OR-gate helper), dynamic `${totalCount}-voice` H1. 25/25. **Live: checklist now 3/7 ready, matching the banner exactly.**
4. **U-OCT-PROBE-COMMENT-HONESTY** — `main()` probe comment still said "probe all 5 voices"; R12 fix to 7.

Scrutiny: 3 reviewer-agent passes (banner arm A reviewer + arm B code-analyzer; setup reviewer) all PASS no P0/P1/P2; 3-of-3 ledger marked for the session. 99/99 tests across the 3 files.

## Bounded debt logged (NOT chased — drift discipline)
~8 peripheral octopus-lib **comments** still say "5-voice" / "the 5 voices" (descriptive prose, not functional): `octopus-dispatch.mjs:3`, `octopus-record-lib.mjs:5`, `octopus-input-curator.mjs:5/8/29`, `octopus-corpus-loader.mjs:498`, `octopus-with-hermes-rag.mjs` (4x), `auto-consensus-sync-bash.mjs:34`, `octopus-route-policy.mjs:13` (a trigger keyword — could ADD "7-voice"). `hermes-zulu/MEMORY.md:54` galaxy brain says "5-voice". None are functional (no hardcoded count miscounts) — comment/doc drift only. A future zulu sweep can normalize them; the FUNCTIONAL surfaces (engine + banner + setup CLI) all agree at 7.

## Routed to peer slots (live — coordinate, do NOT collide)
- **Quicker-turnaround / ollama offload (17.9% vs 30% target):** the lever is bulk-synthesis model routing (gpt-oss:120b picked for BULK sweeps -> timeouts/reaper-kills; route to qwen2.5-coder:32b). Owner = **alpha** (`scripts/lib/host-aware-synthesis-model.mjs`, token-optimization) per [[reference_zulu_revival_timeout_deferred_2026_06_20]]; alpha was running a live loop this session. R7 quality-vs-speed tradeoff — do not unilaterally flip a peer's deliberate model choice.
- **BIG_VISION_PREFERENCE phantom qwen3-vl:32b-instruct** (skips resident qwen3-vl:32b for OCR) — routed to **xray** (`8e4983aa14`).
- **GLM voice live-activation** = key-gated; needs an operator-supplied `GLM_API_KEY`/`ZHIPU_API_KEY` (prohibited for me to enter). Set the env var -> the voice auto-joins consensus + the banner/checklist auto-credit it.

## Next-session pointer
Octopus 7-voice consistency is closed (functional surfaces). Optional bounded sweep: normalize the ~8 lib "5-voice" comments + add "7-voice" trigger keyword. Otherwise hunt ladder: own-domain dry -> any-domain fallback (zulu sanctioned) or await operator GLM credential / opt-in governance for the orchestrator activation track (A-21/A-22/A-25). Linked: [[reference_zulu_backlog_reconcile_2026_06_19]] · [[reference_zulu_revival_timeout_deferred_2026_06_20]].

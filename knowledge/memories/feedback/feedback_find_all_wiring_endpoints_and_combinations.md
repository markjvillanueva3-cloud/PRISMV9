---
name: feedback_find_all_wiring_endpoints_and_combinations
description: As you FINISH any build, exhaustively enumerate ALL wiring endpoints AND all viable combinations — never stop at the first/obvious consumer
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.425Z
aliases: feedback_find_all_wiring_endpoints_and_combinations
---


**Rule (operator directive, 2026-05-29 to slot tango):** *"always try to find all wiring endpoints, combinations as you finish a build."*

When a build is "done" the wiring is usually NOT done. An asset wired to one endpoint when it has five is a **partial orphan**; viable combinations left unwired are **missed synergy** (the "synergize the galaxy" value). At build completion, do an exhaustive sweep — not the first/obvious hookup.

**Why:** this is tango's anti-orphan mandate generalized + the CLAUDE.md "ENGINE WIRING — WIRE TO ALL SOURCES" doctrine. A node nobody can reach (or that nobody knows composes with X) is latent waste even when technically built+tested. Surface coverage > a single green wire.

**How to apply — closing checklist at the END of every build (before declaring done):**

1. **All DISPATCHER endpoints** — grep every dispatcher that would naturally consume it; wire ALL in the same commit (e.g. a physics engine → `prism_calc` AND `prism_safety`; a CAM engine → `prism_cam` AND the vendor dispatcher). One dispatcher is rarely the whole answer.
2. **All GALAXY brains** — map the asset to every consuming domain and append an awareness block to each `mcp-server/src/engines/<domain>/MEMORY.md` ([[feedback_wire_algos_into_galaxies]] is the algorithm-specific instance of this step).
3. **All COMBINATIONS (the synergy layer)** — enumerate which already-built nodes COMPOSE with the new one, and wire/document those compositions too. Examples already shipped: `ml_pca` composes `ml_lowrank`; `ml_attention` + `ml_layernorm` = a transformer block; `FiniteDifferenceMethod.makeMethodOfLinesRHS` → `ODEIntegrator/RK4` = a PDE solver; `ml_viterbi` (exact) ↔ `ml_beam_search` (approx) = the sequence-decoding pair. A new node's value is multiplied by what it can be chained with — find those chains.
4. **All PSN legs** — Engines/Algorithms (#8), PRISM AI (#11 via dispatcher), wiki (#3), memories (#1/#4), tribal (#5), system-viz (#6 ghost roost / graph node), NN-GNN (#10 if it feeds the classifier). Reflect across the 4 doc surfaces per [[feedback_reflect_all_changes_post_update]].
5. **Verify reachability, not just existence** — a synergy/round-trip test that asserts the asset is reachable through EVERY wired endpoint (not just the singleton); for dispatchers, assert `z.enum(ACTIONS)` membership so a mock server can't false-green a missing entry.

**Tools that find the endpoints/combinations:** `/master-index <noun>`, `/impact` (blast radius), `system-viz-query find <noun>`, `duplicationGuardEngine` (also surfaces near-neighbours = combination candidates), `/dispatcher-coverage`, `/orphan-inventory`. Hit these at build-end, not just build-start.

If an endpoint is genuinely inapplicable, say so explicitly (R12) — `// WIRE-EXEMPT: <reason>` — rather than silently leaving it unwired. First applied: ALGO-SYNERGY 2026-05-29 (11 algos → prism_algorithm + india/oscar/sierra galaxies + documented compositions). Related: [[feedback_wire_algos_into_galaxies]] · [[feedback_reflect_all_changes_post_update]] · [[feedback_psn_definition]] · [[reference_tango_algo_synergy_batch_2026_05_29]].

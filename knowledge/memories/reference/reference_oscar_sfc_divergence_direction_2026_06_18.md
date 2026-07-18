---
name: reference_oscar_sfc_divergence_direction_2026_06_18
description: "SFC closed-loop divergence reasoning made DIRECTION-CONSISTENT + the verified ground-truth PRISM-vs-OEM bias (H/K/S all PRISM-HIGH); S over-speed is a physics-reviewer follow-up"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.700Z
aliases: reference_oscar_sfc_divergence_direction_2026_06_18
---


**U-OSC-DIVERGENCE-REASON-DIRECTION** (2026-06-18, slot:oscar, commit `e9dffef3a2`). The closed-loop's catalog-divergence reasoning was emitting **direction-inconsistent** improvement candidates — a latent accuracy regression in the system meant to *generate accurate cutting data*.

**Verified ground truth** (from `state/sfc-catalog-compare/bias-report.md`, signed `(PRISM-OEM)/OEM`, 743 OEM milling rows / 2229 cited cells, 8 brands): every flagged milling regime is **PRISM ABOVE OEM**:
- **ISO S (heat-sensitive superalloy/Ti)**: roughing +32%, semi +25%, finishing +17%; containment ~9% (PRISM outside the OEM vc range ~91% of the time, on the HIGH side). Octopus-confirmed. **A real, directional over-speed signal.**
- **ISO H (hardened)**: +55–61%. **ISO K (cast iron)**: +16–38%. **M**: roughing +18%, else ~neutral. **N/P**: ~neutral/slightly conservative.
- ALL 18 regimes are `low_confidence` BY CONSTRUCTION (a single tool-agnostic PRISM point vs the WIDE tool-specific OEM spread) and `vendor_corroborated=0` → **directional diagnostics, NOT calibration-grade**. A vc-table edit is **physics-reviewer-gated** + not calibration-grade — do NOT rush it in an autonomous loop (oscar soul: verify vendor parity; defer force/stability to physics-reviewer).

**The bug:** qwen3-coder:30b tagged the +55–61% PRISM-HIGH ISO-H/K regimes `base_model_vc_table` (= the category DEFINED as PRISM-BELOW) with *"PRISM conservative / raise vc"* root causes. Acting on that would push an already-too-high vc HIGHER.

**Fix (3 parts, all in `scripts/sfc-catalog-divergence-reason.mjs`):**
1. `directionConsistent(o, r)` gate — rejects any verdict whose category/improvement contradicts the signed bias (PRISM-high → never `base_model_vc_table`, never a "raise vc" improvement; PRISM-low → never `over_speed_risk`/`base_model_vc_high`, never "lower vc"). **Negation-aware** ("do NOT raise" is not a raise). Reject → falls back to the direction-correct deterministic reason.
2. New category `base_model_vc_high` (PRISM-above non-heat; review, never auto-raise) so high-non-heat regimes have a direction-correct home.
3. Hardened prompt — states the direction + the only valid/forbidden categories explicitly.
4. `REASON_LOGIC_VERSION` folded into `regimesFingerprint` so a logic change invalidates the skip-if-fresh cache (else a continuous tick serves stale verdicts for unchanged input — same salt pattern as [[reference_oscar_sfc_closed_loop_cpu_skip_2026_06_18]]).

**LIVE (real 7-regime data):** pre-prompt-harden the gate caught **6/7 Ollama inversions** → deterministic; post-prompt-harden **ollama 7/7 kept, 0 fellback, 0 direction-violations** — H/K now `base_model_vc_high`, S `over_speed_risk`, all via Ollama. 30/30 tests (incl the exact ISO-H inversion regression). Validated by the continuous cron itself (it runs the working tree).

**OPEN FOLLOW-UPS (not done this unit):**
- **Octopus ≥2-voice guard (P2):** the direction gate now excludes inverting panel models, so octopus dropped to 1 voice → a degenerate "consensus" (agreementScore 1.0 → always accept). Should emit `insufficient_voices` when <2 distinct direction-consistent voices.
- **S over-speed → RESOLVED 2026-06-18 (physics-reviewer + code verification): NO over-speed hazard.** A physics-reviewer agent confirmed the ISO-S milling base vc table (`UltimateSpeedFeedEngine` CUTTING_PARAMS S 46/55/61 m/min balanced; kc1.1=2800, Taylor C=150/n=0.18) is physically sound and inside published Ti-6Al-4V/Inconel carbide ranges (~30-80 / ~20-50 m/min). The +25-32% bias is a benign low-confidence point-vs-range artifact (PRISM's conventional S vc is within published safe ranges; it merely sits above the conservative OEM cut_type-matched POSITION). NOT calibration (vendor_corroborated=0). **R12 CORRECTION:** the physics-reviewer attributed the bias to a "1.3 (hsm) x 1.26 (hardness 200 vs Ti 330) = 1.64x inflation" — that mechanism is WRONG. `sfc-catalog-compare.mjs` buildCells `eng.calculate()` passes only {iso_group, tool_diameter_mm, operation, cut_type, flutes}; it NEVER receives strategy/hardness_hb, so the engine uses conventional (vc_factor 1.0) + material-typical hardness (mat.hardness_hb_typical=330 for Ti). The `sample` object's strategy:"hsm"+hardness_hb:200 were INERT FALSE METADATA (no downstream consumer). PROVEN: correcting the labels left the S bias byte-identical (+32.1/+25.0/+17.5) → labels never reached the calc. Fixed the false provenance in `U-OSC-CATALOG-COMPARE-PROVENANCE-HONEST` (`a9f05af5e7`). Lesson: verify a review agent's DATAFLOW claims against the actual calc-call site before acting (it traced the `sample` metadata, not the `calculate()` inputs).

3-of-3: main-model 3-lens self-review PASS (subagents rate-limited until 12:40pm CT 2026-06-18; formal 3-agent pass deferred). See [[reference_oscar_sfc_catalog_divergence_reasoning_2026_06_18]] · [[reference_oscar_sfc_closed_loop_cpu_skip_2026_06_18]].

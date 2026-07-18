---
name: reference_oscar_hss_aggressive_vc_cap_2026_06_25
description: "SFC fix -- HSS has no aggressive cutting-SPEED gear in hot-cutting ISO groups; clamp aggressive Vc to balanced (P/M/K/S/H, NOT N-aluminum). Commit cb40bbba7b."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.690Z
aliases: reference_oscar_hss_aggressive_vc_cap_2026_06_25
---


# SFC HSS aggressive-Vc thermal cap (slot:oscar, 2026-06-25, commit cb40bbba7b)

**Work order:** "continue with calculation training and fine tuning." Closed the handoff's open thread
**(b) P3 HSS-thermal aggressive Vc cap** -- the in-lane calculation fine-tuning continuation after the
276k-cell accuracy-validation arc completed.

## The gap (live-probed, high-RPM machine so the RPM cap can't mask it)
HSS red-hardness (~600 C) means its recommended (balanced) Vc IS its thermal ceiling, but aggressive/
productivity mode multiplied it ~1.4-2x with NO absolute thermal cap (only the RPM-cap + S(x) backstops).
Probe HSS-aggressive Vc m/min: **P 58->80, M 37->52, K 21->30, N 128->266, S 7->12** (P/M/N over-reach;
K/S already safe). HSS has no "aggressive Vc gear" -- aggressive MRR for HSS comes from depth+feed, not Vc.

## Why it is NOT the balanced-ratio fix
The 2026-06-09 physics-reviewer adjudication (`reference_oscar_sfc_hss_overspeed_finding_2026_06_09`) is
authoritative + DEFERRED to: HSS BALANCED 0.35 ratio (~35-54 m/min steel) is CORRECTLY calibrated to
MODERN HSS-Co (24 m/min is the old plain-HSS floor, the wrong anchor) -- do NOT lower balanced. K
over-speed already fixed by `hss:{K:0.13}`. This change is the ORTHOGONAL aggressive-MODE over-reach.

## The fix
New sourced `HSS_THERMALLY_VC_CAPPED_ISO = {P,M,K,S,H}` + `isHssAggressiveVcThermallyCapped()` in
`mcp-server/src/physics/tool-material-speed-override.ts` (clones the validated 2026-06-09 per-ISO override
pattern, same module -- categorical policy, not a Kienzle/Taylor value). Engines clamp ONLY the aggressive
Vc base to the balanced base via mode-agnostic `min()` (no-op for conservative/balanced; catches BOTH
productivity (vc[2]) AND shop_recommended (the balanced->aggressive blend)); fz/ap stay aggressive. Applied
at 3 sites: `UltimateSpeedFeedEngine` primary Vc + `alternatives.aggressive`, AND
`SpeedFeedOrchestratorEngine` aggressive alternative multiplier (R15 -- the reviewer P2: it builds its own
synthetic 1.30x aggressive Vc that would have diverged for HSS after the engine fix).

**N (aluminum) DELIBERATELY EXCLUDED:** low cutting temperature gives HSS real Vc headroom (~1.5-2x).
Independent **xAI-Grok (Hermes)** physics consensus corroborated both the exclusion AND the no-aggressive-Vc
claim for P/M/K/S. Source: Trent & Wright Metal Cutting 4e (red-hardness); Machinery's Handbook 31e HSS
tables (single Vc band, no aggressive column for HSS, unlike carbide).

**MONOTONICALLY SAFE:** only ever lowers Vc (lower Vc also lowers spindle power P=Fc*Vc); aggressive fz/ap
stay gated by the existing force/workholding/deflection clamps. Carbide/cermet/ceramic/CBN/PCD untouched.

## Validation
18 new tests (engine + orchestrator clamp, N-exclusion + carbide-untouched negative controls,
fz-stays-aggressive); 71/71 401-gauntlet + override-factor byte-identical; 160/160 SFC orchestrator
regression; tsc exit 0. physics-reviewer PASS + reviewer PASS + 3way code-analyzer PASS (3-of-3 cleared).

## P2 follow-ups
1. **SpeedFeedPropagationBridgeEngine** (`:297-298,312`) -- **INVESTIGATED 2026-06-25: WORKING-AS-INTENDED,
   no fix (a "fix" would be a regression).** The reviewer flagged that the roughing override feed derives
   from the Vc ratio not `aggressive.fz`, so capped-HSS feed "drops to balanced." But reading the code:
   `feedScale(vc) = (vc/rec.Vc) * base_feed` scales feed by the Vc RATIO, which holds CHIP LOAD (fz)
   CONSTANT (feed = fz*z*rpm, and rpm scales by the same ratio). The bridge deliberately uses a
   constant-fz, scale-by-SPEED model for ALL tool materials -- it never consumes per-band fz. So for capped
   HSS the roughing override correctly becomes balanced-speed + proportional feed at constant fz, which is
   exactly right (HSS has no aggressive speed gear, so its roughing override shouldn't either). Switching to
   `aggressive.fz` would INTRODUCE a chip-load increase the bridge intentionally avoids. NOT a gap.
2. **effectiveIso vs raw-iso parity**: the engine evaluates the predicate on `effectiveIso` (post-remap
   hb>400 P->H), the orchestrator on raw `material.iso_group.value`. Benign today (both P and H are in the
   set); latent foot-gun only if a future ISO is capped post-remap but not pre-remap. Document or align.
3. **Separate known issue:** `SpeedFeedOrchestratorEngine` headline Vc for HSS is material-blind (~200 m/min
   for HSS-1045 = carbide speed) -- the convergence-plan gap (delegate core physics to UltimateSpeedFeedEngine),
   NOT this unit. My clamp makes aggressive==balanced regardless of the (separately-wrong) balanced level.

Related: [[reference_oscar_sfc_hss_overspeed_finding_2026_06_09]] · [[reference_oscar_full_sweep_276k_accuracy_2026_06_25]] · [[feedback_oscar_sfc_physics_discipline]]

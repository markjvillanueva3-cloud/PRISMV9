# PRISM_UPGRADED optimal-reference findings — observed vs physics-optimal (data-grounded)

**Owner:** kilo · **Date:** 2026-06-01 · **Unit:** U-CAM-OPTIMAL-REFERENCE
**/goal clause (most-emphasized):** *"use our vast knowledge to learn to optimize… what really optimized programs look like… time, efficiency, safety, accuracy."* This contrasts the **observed** JM practice (`CAM-CORPUS-PROFILE.md`) against the **physics-optimal** `PRISM_UPGRADED` corpus, on real data both sides. Extractor: `mcp-server/scripts/cam-upgraded-reference-profile.mjs`.

## The optimal-reference corpus (118 files, 376 physics blocks, 59/60 customers)
`H:/PRISM/JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/<machine>/*.nc` — each file carries one header block per JM machine variant (LTH-02..07), computed by `UltimateSpeedFeedEngine.calculate`.

| target (ISO-H / tool_steel, n=296) | value |
|---|---|
| effective SFM | **180** (min=median=max — uniform) |
| RPM | 1905–2095 (varies only by machine spindle-clamp) |
| feedrate | 248–272 mm/min |
| depth of cut | **1.5 mm** (≈0.059 in — uniform) |
| optimize_for | balanced (100%) |
| rigidity | medium (150) / high (146) — by machine model |
| machines | GENOS L200E-M, Multus B250II, LNC8, LB-3000EX(±II/BigBore), GENOS L300-M |

## THE finding (R12): the "optimal" reference is SINGLE-MATERIAL, not per-part-optimal
Every block is **ISO-H / tool_steel** with **identical** SFM (180) + DOC (1.5mm). The upgrade run **assumed all parts are hardened tool steel** and applied one physics result uniformly; the only per-part variation is the machine spindle-RPM clamp. So:
- It is NOT a per-part-optimized corpus — it's a coarse, one-material upgrade.
- Learning "copy PRISM_UPGRADED" would teach the system to always use 180 SFM / 1.5 mm DOC — **correct for genuine hardened tool steel, wrong for the aluminum / brass / soft-steel parts JM also runs.**

## Observed vs optimal (the real optimization deltas, corrected)
| axis | observed JM .MIN | PRISM_UPGRADED (ISO-H) | corrected lesson |
|---|---|---|---|
| SFM | ~250 (G96) | 180 | For ISO-H *hardened tool steel*, observed ~250 is **slightly aggressive**, not "too conservative". My earlier generic "raise to 600–1000" was WRONG for H-group — that envelope is for soft ISO-P steel. **SFM is material-dependent; resolve ISO group first.** |
| DOC | 0.031–0.040 in radial | 1.5 mm (0.059 in) | Optimal is **deeper → fewer passes** (confirms the air-cut / pass-count gap). |
| RPM | median 800 | 1905–2095 | Higher, but RPM = f(SFM, diameter) — not directly comparable without per-part dia. |
| passes | 3 nominal (2 redundant air-cuts) | physics single-pass-to-DOC | Eliminate air-cut passes (time). |

## What this means for the regimen (sharpens the learn-to-optimize target)
1. **The true optimization target is per-part physics with the part's REAL material** — not "match PRISM_UPGRADED" (single-material) nor "match observed" (varied/conservative). The generator (#5b) must resolve ISO group + material **from the print** (kilo's print-to-program domain) before calling `UltimateSpeedFeedEngine`.
2. The resolver's `cutting_condition_directive` (already physics-delegated, U-CAM-RECIPE-RESOLVER) is the right shape — it passes `material_iso_group` to the physics surface. This finding **validates** delegating (never inlining) and **requires** material resolution upstream (do not default to tool_steel).
3. **Follow-up:** re-run the JM upgrade with per-part material (from blueprint extraction) to produce a genuinely per-part-optimal reference corpus. Tracked alongside #43.

## PSN
Reuses real corpus (no synthetic). Pairs with `CAM-CORPUS-PROFILE.md` (observed), `CAM-OP-TEMPLATE-MATRIX.json` (corrects its generic "raise SFM" optimizations → material-dependent), `UltimateSpeedFeedEngine` (the physics backend), whiskey lathe surfaces. Memory: [[reference_cam_optimal_reference_single_material_2026_06_01]].

## Reproduce
```
cd mcp-server && node scripts/cam-upgraded-reference-profile.mjs 60 2
```

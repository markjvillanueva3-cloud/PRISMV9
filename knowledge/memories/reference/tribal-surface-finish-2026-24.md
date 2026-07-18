---
type: tribal-consolidation
topic: surface_finish
iso_week: 2026-24
cluster_size: 29
cluster_size_synthesized: 10
aggregate_confidence: 88.6
tags: ["operation:finishing", "cusp-height", "stepover", "ball-nose", "tool:ball_endmill", "finishing", "scallop", "surface-finish"]
materials: []
operations: ["wire_edm", "finishing", "5_axis", "grinding", "polishing", "3d-milling", "3d_finishing", "scallop"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: surface_finish — 2026-24

_29 tips clustered on 'surface_finish' with mean confidence 88.6/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (10)

### 1. Wire EDM achieves Ra 0.2-0.8 µm with ±0.01mm tolerance — burr-free finish

- **id:** `wedm-web-002` · **confidence:** 94/100 · **usage:** 0
- **source:** runsom.com:wire-edm-process:2026
- **tags:** wire-edm, surface-finish, tolerance, precision, burr-free, operation:finishing



### 2. Stepover Calculation for Target Cusp Height

- **id:** `pm-018` · **confidence:** 93/100 · **usage:** 0
- **source:** web:powermill-docs
- **tags:** stepover, cusp-height, ball-nose, surface-quality, variable-stepover, tool:ball_endmill

Calculate stepover from target cusp height using: stepover = 2 × sqrt(2×R×h - h²), where R is the ball nose radius and h is the desired cusp height. For a 10mm ball nose targeting 0.005mm cusp: stepover = 2 × sqrt(2×5×0.005) = 0.447mm. In P…

### 3. 5X strategies: prefer Center Point tool reference for smooth paths

- **id:** `TK-DL-hm-019` · **confidence:** 92/100 · **usage:** 0
- **source:** document:hypermill-cam-v33@p1065
- **tags:** hypermill, 5-axis, tool-reference, center-point, smooth-path, v33

In hyperMILL 5X machining, set the tool reference point to Center Point (not Tip) on the Tool dialog page. For strong tilting movements between two points, the center point path produces considerably smoother motion than a tip reference pat…

### 4. Surface finish Ra targets by manufacturing quality level

- **id:** `TK-RX-004` · **confidence:** 92/100 · **usage:** 0
- **source:** document:Fusion360-Skill-Roadmap@surface-finish-targets
- **tags:** Ra, Rz, roughness, N-grade, quality-level, cost

Target surface roughness Ra by quality level: Rough machining: 6.3-12.5 µm (N9-N10, stock removal only). Semi-finish: 1.6-3.2 µm (N7-N8, functional non-critical). General finish: 0.8-1.6 µm (N6-N7, standard tolerance surfaces). Fine finish:…

### 5. Scallop height formula: h = ae²/(8R) for ball nose, verify with actual stepover measurement

- **id:** `TK-RX-013` · **confidence:** 92/100 · **usage:** 0
- **source:** document:Fusion360-Skill-Roadmap@scallop-height-math
- **tags:** scallop, ball-nose, stepover, Ra, formula, finishing

Theoretical scallop height for ball nose finishing: h = ae²/(8×R) where ae = stepover (mm), R = ball radius (mm). Examples: R=5mm (10mm ball), ae=0.3mm → h = 0.09/(40) = 0.00225mm = 2.25µm. R=5mm, ae=0.5mm → h = 0.25/40 = 0.00625mm = 6.25µm…

### 6. Scallop-Constant Finishing for Uniform Surface Quality

- **id:** `ec-025` · **confidence:** 90/100 · **usage:** 0
- **source:** web:edgecam-milling
- **tags:** scallop-constant, cusp-height, uniform, finishing, operation:finishing

Edgecam's constant-scallop finishing dynamically adjusts stepover to maintain uniform cusp height across surfaces of varying curvature. On flat areas stepover increases; on steep or highly curved areas it decreases. This eliminates the visi…

### 7. Scallop Height Calculation for Ball-Nose Cutters

- **id:** `ec-086` · **confidence:** 90/100 · **usage:** 0
- **source:** web:edgecam-surface
- **tags:** scallop-height, ball-nose, stepover, ra-calculation, operation:finishing, tool:ball_endmill

For ball-nose finishing, scallop height h = S-squared / (8 x R), where S is stepover and R is ball radius. For a 10mm ball nose at 0.3mm stepover: h = 0.0011mm. On curved surfaces the effective radius changes. Enable constant-scallop mode t…

### 8. Scallop-Based Finishing Maintains Constant Cusp Height

- **id:** `esp-014` · **confidence:** 90/100 · **usage:** 0
- **source:** web:esprit-3d-machining
- **tags:** scallop, cusp-height, finishing, surface-quality, operation:finishing

ESPRIT's scallop machining adjusts the stepover dynamically to maintain a constant scallop (cusp) height across the entire surface, regardless of surface curvature. On flat areas the stepover increases; on steep areas it decreases. Set the …

### 9. Scallop Height Control for Predictable Surface Finish

- **id:** `esp-097` · **confidence:** 90/100 · **usage:** 0
- **source:** web:esprit-surface-quality
- **tags:** scallop, surface-finish, ball-nose, stepover, operation:finishing, tool:ball_endmill

ESPRIT calculates the theoretical scallop height from the tool geometry, stepover, and surface curvature. For a ball-nose cutter of radius R with stepover S on a flat surface, scallop height h ≈ S²/(8R). For a 10mm ball nose at 0.3mm stepov…

### 10. 3D Finish with Raster and Scallop Control

- **id:** `ec-019` · **confidence:** 89/100 · **usage:** 0
- **source:** web:edgecam-milling
- **tags:** 3d-finishing, raster, scallop, cusp-height, operation:roughing, operation:finishing

For 3D finishing in Edgecam, choose between raster (parallel lines) and scallop (constant cusp height) strategies based on surface geometry. Raster is faster for gently curved surfaces; scallop produces more uniform finish on varying curvat…

## Common Threads

Top tags across the cluster: `operation:finishing`, `cusp-height`, `stepover`, `ball-nose`, `tool:ball_endmill`, `finishing`, `scallop`, `surface-finish`.

## Sources Cited

- web:edgecam-milling (2)
- runsom.com:wire-edm-process:2026 (1)
- web:powermill-docs (1)
- document:hypermill-cam-v33@p1065 (1)
- document:Fusion360-Skill-Roadmap@surface-finish-targets (1)

## Citations

- [[wedm-web-002]]
- [[pm-018]]
- [[TK-DL-hm-019]]
- [[TK-RX-004]]
- [[TK-RX-013]]
- [[ec-025]]
- [[ec-086]]
- [[esp-014]]
- [[esp-097]]
- [[ec-019]]


---
title: WEDM tactics — taper/UV, corner strategy, and FA-10S program structure
type: code-tribal
domain: wedm
tags: [wedm, wire-edm, taper, uv, corner, mitsubishi-fa, m-code, adaptive-control, slot-mike]
related:
  - code-tribal/wedm-tactics-multipass-and-recast
  - code-tribal/wedm-tactics-wire-and-flushing
  - architecture/engines/wedm
slot: mike
last_verified: 2026-05-29
---

# WEDM tactics — taper/UV, corner strategy, FA-10S program structure

> Third curated wedm tactic page (companions: [[code-tribal/wedm-tactics-multipass-and-recast]], [[code-tribal/wedm-tactics-wire-and-flushing]]). Authored by slot:mike (Wire Wizard). Every value cites the canonical tribal source `mcp-server/src/data/wedm-knowledge-tips.ts` + `jm-die-wedm-tech-tables.ts`. Wire-EDM is spark erosion — mechanical-cutting physics (Kienzle/Taylor) does not apply.

## Taper / UV cutting
- **Set ALL H-registers to ZERO on a taper program.** The Mastercam Mitsubishi-FA post handles geometric taper compensation in the UV coordinates themselves; a non-zero wire-offset H double-compensates and produces the wrong taper angle. Ground truth: `NOZE TEST.NC` (E28xx 5-pass UV stainless) runs `H175=0` and `H1..H5 = 0.0000`. *(wedm-jmd-005, jm-die-004, tech-tables `E28XX_TAPER_5PASS` offset_mm:0)*
- **Taper UV applies only to G1 linear moves.** G2/G3 arcs are cut straight (UV=0). *(wedm-kb-020)*
- **Taper accuracy is 1.5–2× worse than straight** (the wire deflects differently at angle; the offset-comp must account for the angled-kerf geometry). Always run ≥2 skim passes on taper (vs 1 acceptable on straight). *(wedm-kb-019)*
- **Max taper angle = atan(UV_max_travel / guide_gap)** — a FA20S with ±30 mm UV over a 350 mm guide gap maxes near ±5°. Verify `U0 V0` yields a straight cut before every job; a 0.01 mm UV-offset error tapers across the full thickness. *(wedm-kb-018, wedm-kb-017)*
- **Taper feed ASCENDS, unlike straight skims.** E28xx 5-pass measured feed: 0.16 < 0.23 < 0.26 < 0.30 ipm. *(jm-die-wedm-program-patterns.ts NOZE TEST)*

## Corner strategy
- **Wire breaks at sharp inside corners (<R0.5 mm)** — the wire bends around the corner while discharge energy concentrates on a smaller area. Mitigations: reduce feed to 60% where corner radius < 2× wire dia, increase OFF time 20–30% in corner segments, step down to 0.20 mm wire for tight radii (0.004-in fine wire on Makino SP43/SP64 reaches ~0.003-in inside radius). *(wedm-kb-002, wedm-sp-001)*
- **Mitsubishi FA corner-control (CC)** auto-adjusts power at corners — enable it rather than hand-tuning.
- **Drum-shape error (DSE)** compounds across multi-pass strategies and is often missed in single-pass optimization. *(wedm-research-007)*

## FA-10S program structure (JM Die canonical)
- **Adaptive control = ROUGH CUT ONLY.** Structure: `M91` (AC off) → thread → `M90` (AC on) with the Pass-1 E-code → skims inherit `M91` (off). Low-power skim discharge looks like a near-short to the AC algorithm → servo hunting → −10–15% Ra + dimensional scatter. *(wedm-jmd-003, jm-die-014)*
- **Tank-fill `M78` is ALWAYS doubled (`M78 M78`)** on the FA-10S — a single `M78` causes intermittent insufficient-fluid alarms during AWT. *(wedm-jmd-002)*
- **Canonical M-code sequence** (`JM_DIE_MCODE_SEQUENCE` in `jm-die-wedm-tech-tables.ts`): start `M91 M20 M78 M80 M82 M84 M90` → end `M85 M83 M81 M21 M58`; `double_tank_fill=true`, `adaptive_rough_only=true`, `H175_MASTER_OFFSET`.
- **`M01` optional-stop = glue / slug-retention stop** before the final separating cut on no-core / slug-tab jobs.

## See also
- Engine surface: `EDMWireSlugCornerTaperEngine`, `WEDMTaperErrorBudgetEngine`, `WEDMCornerPhysicsEngine`, `WEDMPostMitsubishiEngine`.
- Galaxy brain: `mcp-server/src/engines/wedm/CLAUDE.md` §5 (15 gotchas) · memory [[reference_mike_wedm_discharge_gotchas_2026_05_29]].

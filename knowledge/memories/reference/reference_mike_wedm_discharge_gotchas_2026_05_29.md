---
name: reference-mike-wedm-discharge-gotchas-2026-05-29
description: "15 VERIFIED wire-EDM discharge-physics gotchas (cited to wedm-knowledge-tips.ts tip ids + JM Die FA-10S NC programs). The replacement for alpha's deliberately-empty galaxy stub §5. Wire-EDM is electrical spark erosion — Kienzle/Taylor/Merchant DO NOT apply."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.657Z
aliases: reference_mike_wedm_discharge_gotchas_2026_05_29
---


# WEDM discharge-physics gotchas — verified + cited (slot:mike, 2026-05-29)

Mined from `mcp-server/src/data/wedm-knowledge-tips.ts` (122 entries) + `jm-die-wedm-tech-tables.ts` + ground-truth NC programs (ITW SHAKEPROOF, NOZE TEST, Choctaw/Fiocchi). All 17 cited tip-ids verified to exist. Full text in `mcp-server/src/engines/wedm/CLAUDE.md` §5.

1. **H-offset cascade MUST strictly decrease** or re-cut/leftover (AP003). FA-10S E12xx 4-pass: 0.0085>0.0064>0.0058>0.0053 in; heavy 5-pass 0.00995/0.00725/0.00585/0.00535/0.0052. *(jm-die-002/013, tech-tables)*
2. **Skim feed PEAKS mid-sequence**, not monotone: P1 0.12 < P2 0.24 > P3 0.21 > P4 0.20 ipm. *(wedm-jmd-006)*
3. **Recast ∝ pulse-on** (Carslaw-Jaeger d=2√(α·t_on)): rough 15-25µm → 4 skims 1-3µm; AMS 2628 caps ~7.5µm; D2/M2 recast carries carbides. *(wedm-kb-011, jm-die-007/010)*
4. **Pulse-on = Ra↔MRR tradeoff** (Ton causal 0.85-0.90); over-long pulses *reduce* MRR (ion sharing). *(wedm-ml-006)*
5. **Wire break: REDUCE Ton 10-15% BEFORE raising tension** (discharge energy is the wire-heater). safe_mode -55% breaks @ +28% time. *(wedm-kb-001, wedm-ml-007)*
6. **Flushing ∝ 1/√(thickness/50)** above 50mm (~58% @150mm); #1 break cause >50mm; coaxial + submerged. *(wedm-kb-004/013/021)*
7. **Flush pressure PER-PASS**: 8-10 bar rough, 3-5 bar skim (high pressure vibrates wire, kills skim Ra). *(wedm-kb-023/022)*
8. **Taper (UV): set ALL H-registers to ZERO** — post handles taper in UV coords; non-zero H double-comps. *(wedm-jmd-005, E28XX offset=0)*
9. **Taper accuracy 1.5-2× worse** than straight; run ≥2 skims on taper; verify U=0 V=0 → straight first. *(wedm-kb-017/018/019)*
10. **Dielectric resistivity = FIRST check** when Ra worse than predicted (5-15 MΩ·cm; WC ≤5 µS/cm or Co-binder attack). *(wedm-kb-007, wedm-sp-004)*
11. **Zinc-coated (not plain) brass for WC/PCD** — sacrificial Zn improves flushing, -30-50% breaks; mandatory on WC at JM Die. *(wedm-kb-005/015, jm-die-012)*
12. **Closely-spaced features (pitch <3× wire dia): HALVE rough feed** to F0.06 (secondary discharge destroys thread root). *(wedm-jmd-008, jm-die-003)*
13. **Thermal HAZ distortion = #1 dim error >75mm hardened**; stress-relieve before; **H13/S7 crack DELAYED — inspect 24-48h after**. *(wedm-kb-016, jm-die-009/011)*
14. **Adaptive control (M90 on/M91 off) = ROUGH ONLY**; AC on skims → servo hunting. **FA-10S quirk: M78 tank-fill ALWAYS doubled (M78 M78)**. *(wedm-jmd-003/002, jm-die-014)*
15. **Corner strategy**: breaks at sharp inside corners (<R0.5mm) — 60% feed + Toff + smaller wire; FA corner-control auto-adjusts; DSE compounds across passes. *(wedm-kb-002, wedm-sp-001)*

Cross-refs: [[reference_mike_wedm_galaxy_buildout_2026_05_29]] · [[reference_wire_domain_atlas_for_mike_2026_05_27]]

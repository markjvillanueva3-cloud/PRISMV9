# TSC-FIX/U-TSC-EDM-KUNIEDA — [MAIN] [TSC-FIX]/U-TSC-EDM-KUNIEDA: restore EDM_PHYSICS.kunieda volumetric-efficiency block (-10 TS2339)

**Commit:** `36671c7406a8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:31:48-05:00
**Tags:** tsc-fix, u-tsc-edm-kunieda, auto-distilled

## Subject
[MAIN] [TSC-FIX]/U-TSC-EDM-KUNIEDA: restore EDM_PHYSICS.kunieda volumetric-efficiency block (-10 TS2339)

## Body
```
[MAIN] [TSC-FIX]/U-TSC-EDM-KUNIEDA: restore EDM_PHYSICS.kunieda volumetric-efficiency block (-10 TS2339)

WireEDMSettingsEngine.ts L147-155 referenced EDM_PHYSICS.kunieda.eta_*
for 5 materials (steel/aluminum/titanium/inconel/carbide) — the block
was missing from physics/constants.ts (10 TS2339 across the engine).

Restored block contains published eta values from Kunieda et al. CIRP
Annals 54(2) 2005, Fig. 8 + Table 2. Eta is the spark-energy-to-material
removal coupling coefficient — distinct from DiBitonto's
removal_efficiency (which is crater-volume removal ratio).

Values (real published physics, NOT invented):
  eta_steel:     0.30  — most common WEDM workpiece
  eta_aluminum:  0.45  — highest energy coupling
  eta_titanium:  0.20  — low conductivity + high melt point
  eta_inconel:   0.18  — Ni superalloys
  eta_carbide:   0.12  — grain-pullout dominates over melting

Source line cites Kunieda 2005 explicitly.

Critical-file guard (physics/constants.ts) acknowledged: change is
ADDITIVE (new block, no existing values modified) and reflects
canonical published source. esbuild clean (exit 0). Errors: 777→767
(-10). WireEDMSettings 16→6 remaining (other classes: toenshoff,
max_duty_rough, MaterialEntry shape — separate units).
```

## Files touched (2)
- mcp-server/src/physics/constants.ts | 20 ++++++++++++++++++++
- 1 file changed, 20 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 36671c7406a8`
- Milestone envelope: `mcp-server/data/milestones/TSC-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
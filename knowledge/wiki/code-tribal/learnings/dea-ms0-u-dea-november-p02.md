# DEA-MS0/U-DEA-november-P02 — [MAIN] [DEA-MS0]/U-DEA-november-P02 (slot:november): activate MachineGeometricAccuracyEngine -> MachineCapabilitySurfaceEngine.getCapabilityWithAccuracy

**Commit:** `1b2b1584d2ed` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T21:45:22-05:00
**Tags:** dea-ms0, u-dea-november-p02, auto-distilled

## Subject
[MAIN] [DEA-MS0]/U-DEA-november-P02 (slot:november): activate MachineGeometricAccuracyEngine -> MachineCapabilitySurfaceEngine.getCapabilityWithAccuracy

## Body
```
[MAIN] [DEA-MS0]/U-DEA-november-P02 (slot:november): activate MachineGeometricAccuracyEngine -> MachineCapabilitySurfaceEngine.getCapabilityWithAccuracy

DEA-MS0 P02 — bridges built-but-uncalled geometric-accuracy methods (acc_volumetric +
acc_abbe_offset + acc_ball_bar) into the capability-summary surface so callers get
controller-tier or measured accuracy bands as part of the machine-capability response.

ENGINE (MachineCapabilitySurfaceEngine.ts +254 lines):
- New getCapabilityWithAccuracy(machineId, opts): chains MachineGeometricAccuracyEngine
  3-call set into the base getCapabilitySummary surface.
- accuracy_source: 'measured' (caller-supplied axis_errors) -> 'controller-default'
  (tier inferred from volumetric_compensation + nano_smoothing) -> 'no-data' (low-spec).
- Controller-tier defaults (ISO 230-2:2014 typical bands + Mazak/Haas/DMG citations):
  premium {pos:5, str:3, ang:5, sq:5} / mid {10,6,10,10} / economy {20,12,20,20}.
- Ball-bar is opt-in only (skipped when measured_points absent) — preserves proof grade.
- accuracy.volumetric / abbe[] / ballBar individually try/catch so a single accuracy
  failure surfaces as null instead of poisoning the whole envelope.

DISPATCHER (cadDispatcher.ts +action, already absorbed in delta U-AI-08 182b8eb39f):
- prism_cad:cad_machine_capability_with_accuracy — name + options normalization
  (machine_id|machineId, axis_errors|axisErrors, volumetric_grid_points|... etc).
- Type-safe via Parameters<typeof engine.getCapabilityWithAccuracy>[1].

TEST (cad_machine_capability_with_accuracy.test.ts +14 tests, all PASS):
- happy path, unknown-machine null, tier monotonicity (economy > premium),
  measured-override flips provenance, tight axis -> tighter envelope,
  custom abbe_queries, ball-bar opt-in + empty-points stays null,
  adversarial loose errors > LOOSE_ENVELOPE_FLOOR_UM, zero-angular skips abbe,
  workspace monotonicity, backwards-compat (base has no accuracy keys),
  all-zero axes no-throw, dispatcher contract {success,data} shape.
- Anti-regression: existing MachineCapabilitySurfaceEngine.test.ts 41/41 PASS.

DOMAIN: Type B dormancy (wired methods, uncalled chain). Pattern: orchestrator-style
bridge — one new dispatcher action chains two engines instead of either engine
exposing the merged surface itself.
```

## Files touched (3)
- .../cad_machine_capability_with_accuracy.test.ts   | 233 +++++++++++++++++++
- .../src/engines/MachineCapabilitySurfaceEngine.ts  | 254 +++++++++++++++++++++
- 2 files changed, 487 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1b2b1584d2ed`
- Milestone envelope: `mcp-server/data/milestones/DEA-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
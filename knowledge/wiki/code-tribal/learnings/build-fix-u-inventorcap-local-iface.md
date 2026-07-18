# BUILD-FIX/U-INVENTORCAP-LOCAL-IFACE — [MAIN-FORCE] [BUILD-FIX]/U-INVENTORCAP-LOCAL-IFACE (slot:india): clear the sole authoritative-build tsc error -- type INVENTOR_CAPABILITIES against a precise local interface + cast at the canonical boundary

**Commit:** `a4a89dcc921b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T04:58:16-05:00
**Tags:** build-fix, u-inventorcap-local-iface, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-FIX]/U-INVENTORCAP-LOCAL-IFACE (slot:india): clear the sole authoritative-build tsc error -- type INVENTOR_CAPABILITIES against a precise local interface + cast at the canonical boundary

## Body
```
[MAIN-FORCE] [BUILD-FIX]/U-INVENTORCAP-LOCAL-IFACE (slot:india): clear the sole authoritative-build tsc error -- type INVENTOR_CAPABILITIES against a precise local interface + cast at the canonical boundary

WHAT: the authoritative build `tsc -p mcp-server/tsconfig.json --noEmit` had exactly
ONE error -- InventorCADCodeGeneratorEngine.ts(148,3) TS2353 'maxOpsPerScript' does not
exist in type 'CADCapabilityMatrix'. A RED authoritative build is a fleet-wide blocker.

ROOT CAUSE (puzzle resolved): INVENTOR_CAPABILITIES was annotated `: CADCapabilityMatrix`
but carries a vendor-divergent vocabulary -- 9 fields not on the canonical interface
(maxOpsPerScript, supportsParameters, supportsBatchExecution, parametricModeling,
directModeling, assemblyModeling, sheetMetal, surfaceModeling, meshModeling) AND it omits
5 canonical required fields (cadSystem/nativeLengthUnit/nativeAngleUnit/requiresSubprocess/
typicalLatencyMs). tsc surfaced only the first excess prop; the prior session's speculated
fix (add maxOpsPerScript? to the interface) would have CASCADED the other 8 excess fields.

FIX (surgical, convention-matching): introduce a local `interface InventorCapabilityMatrix`
capturing the precise 11-field vendor shape, type the const against it (so field typos stay
compile-checked), and cast `as unknown as CADCapabilityMatrix` ONLY at the abstract
`readonly capabilities` override boundary -- mirroring the file's own established cast at
the supportedOps field. Runtime object byte-identical (the locked Inventor capability tests
read its vendor fields directly). The local interface deliberately does NOT extend
CADCapabilityMatrix: that would demand Inventor's canonical nativeLengthUnit/nativeAngleUnit/
requiresSubprocess/typicalLatencyMs VALUES, which are CAD-galaxy (delta) domain knowledge a
non-CAD slot must not guess (R8/R12). The cross-generator interface migration stays delta-owned
and is flagged in-code.

VERIFY: authoritative tsc 1 error -> 0. Inventor capability tests pass (cadDispatcher.inventor
maxOpsPerScript===500; engine "reports capability flags correctly" + "has maxOpsPerScript
limit"). Diff confined (43 ins/3 del, capability block only). Per-file 2-arm scrutiny
(reviewer + code-analyzer) PASS, 0 P0/P1.

NOT FIXED (pre-existing, delta lane, R12): 6 Inventor engine tests fail in buildScript/emitOp
op-arg validation (feature_loft 'sections', feature_sweep 'profile_sketch', assembly_constrain
'occurrence_a', export_step/stl/dxf) -- unrelated to the capability matrix, untouched by this
diff, owned by delta.
```

## Files touched (2)
- mcp-server/src/engines/InventorCADCodeGeneratorEngine.ts | 46 +++++++++++++++++++++++++++++++++++++++++++---
- 1 file changed, 43 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a4a89dcc921b`
- Milestone envelope: `mcp-server/data/milestones/BUILD-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
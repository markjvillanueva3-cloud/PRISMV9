# INVENTOR-CAD-CONTRACT/U-TSC-REQUIREARG-BASE — [MAIN-FORCE] [INVENTOR-CAD-CONTRACT]/U-TSC-REQUIREARG-BASE (slot:papa->delta): delete redundant requireArg override, use base (tsc 9->8)

**Commit:** `23316cfe6322` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T15:22:00-05:00
**Tags:** inventor-cad-contract, u-tsc-requirearg-base, auto-distilled

## Subject
[MAIN-FORCE] [INVENTOR-CAD-CONTRACT]/U-TSC-REQUIREARG-BASE (slot:papa->delta): delete redundant requireArg override, use base (tsc 9->8)

## Body
```
[MAIN-FORCE] [INVENTOR-CAD-CONTRACT]/U-TSC-REQUIREARG-BASE (slot:papa->delta): delete redundant requireArg override, use base (tsc 9->8)

TS2416 at InventorCADCodeGeneratorEngine.ts:528 -- the private requireArg<T>(op,key,
expectedType:'...|object') override was incompatible with the base
UnifiedCADCodeGeneratorBase.requireArg (protected, kind:'...|array'): it narrowed
visibility (private<protected) AND used 'object' where the base uses 'array'. The
override was a redundant re-impl of the base (the base is strictly better: typed
CADBuildError + Array.isArray-aware). Deleted it; the sole 'object' call site (line
649, points:number[]) now passes 'array', which the base validates via Array.isArray.

Verified: InventorCAD 2 errors -> 1 (only the :139 Set remains), NO cascade (the file
regressed 2->26 on a prior naive Set fix -- this requireArg fix is isolated + safe),
44/44 inventorCADCodeGenerator.ops tests pass, tsc 9->8, 0 new errors. No test
asserted the override's error text; CADBuildError extends Error (catch-compatible).

REMAINING InventorCAD:139 (owner-bound -> delta): INVENTOR_SUPPORTED_OPS cast
'as unknown as Set<string>' but the field is ReadonlySet<CADOperationKind>; ~24 set
members aren't in the 97-kind union. Honest fix (fix typos / add kinds to the union /
widen the matrix field type) is a delta CAD-op-taxonomy decision -- papa won't
cast-to-pass (would weaken type safety).
```

## Files touched (2)
- mcp-server/src/engines/InventorCADCodeGeneratorEngine.ts | 24 +++++-------------------
- 1 file changed, 5 insertions(+), 19 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 23316cfe6322`
- Milestone envelope: `mcp-server/data/milestones/INVENTOR-CAD-CONTRACT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
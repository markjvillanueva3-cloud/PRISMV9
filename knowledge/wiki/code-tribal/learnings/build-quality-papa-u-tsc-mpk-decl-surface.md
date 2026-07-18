# BUILD-QUALITY-PAPA/U-TSC-MPK-DECL-SURFACE — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-MPK-DECL-SURFACE (slot:papa): MillingPhysicsKernelEngine declaration-emit surface clean (37->0, type-only)

**Commit:** `18a44f3008c5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T22:28:49-05:00
**Tags:** build-quality-papa, u-tsc-mpk-decl-surface, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-MPK-DECL-SURFACE (slot:papa): MillingPhysicsKernelEngine declaration-emit surface clean (37->0, type-only)

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-MPK-DECL-SURFACE (slot:papa): MillingPhysicsKernelEngine declaration-emit surface clean (37->0, type-only)

Resolves 37 declaration:true emit errors in MillingPhysicsKernelEngine.ts
(17x TS4053 "return type cannot be named" + 20x TS4094 "exported anonymous
class type may not be private/protected") -- all cache-masked by .tsbuildinfo
(the documented incremental under-report trap; a clean run revealed them).

ROOT CAUSE: the facade delegates to ~80 sub-engine singletons whose Impl
classes are not exported and whose result types are not imported into MPK.
With declaration:true the .d.ts generator could not name those return types.

FIX (type-only, contained to MPK, ZERO sub-engine edits, ZERO physics):
- delegate methods -> ': ReturnType<typeof <singleton>.<method>>'
- two switch methods -> union of each case's ReturnType + '| undefined'
  (no default branch -> undefined was already in the inferred type)
- singleton getters -> ': typeof <singleton>'
Annotations are byte-faithful to the prior INFERRED types (verified): no
widening/narrowing, no 'any'/'as', no type-weakening, no behavior change
(types erase at runtime). The idiom (annotate via the exported singleton)
is stable under clean rebuild.

VERIFIED: clean declaration emit (rm .tsbuildinfo, 16GB heap) -> 0 errors in
MillingPhysicsKernelEngine.ts. Per-file 2-arm scrutiny PASS (reviewer +
code-analyzer, both ran independent clean emits).

R12 NOTES (not this diff):
- global mcp-server tsc is a MOVING TARGET under live fleet churn:
  InventorCAD:139 (TS2322 Set->ReadonlySet taxonomy) re-regressed after my
  0-count run -> delta-owned, routed.
- 2 PRE-EXISTING mill tool-life test failures (calculateToolLife coating
  multiplier + extended-exponent q=0.15 vs 0.2) are physics-value mismatches
  from bulk-absorb 9dee8736ad -> foxtrot + physics-reviewer, NOT papa.
- TOOLING GAP: project "build" = tsc --noEmit, which does NOT catch
  declaration-emit errors; they only surface on actual .d.ts emit. This is
  why the 37 sat masked. Candidate: add a declaration-check to build:verify.
```

## Files touched (2)
- mcp-server/src/engines/MillingPhysicsKernelEngine.ts | 30 +++++++++++++++---------------
- 1 file changed, 15 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 18a44f3008c5`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
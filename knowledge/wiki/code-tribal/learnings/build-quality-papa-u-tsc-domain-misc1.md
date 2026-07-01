# BUILD-QUALITY-PAPA/U-TSC-DOMAIN-MISC1 — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-DOMAIN-MISC1 (slot:papa): clean tsc 93->91 (2 papa-safe reconciliations)

**Commit:** `2d8b674ba02b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T22:02:05-05:00
**Tags:** build-quality-papa, u-tsc-domain-misc1, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-DOMAIN-MISC1 (slot:papa): clean tsc 93->91 (2 papa-safe reconciliations)

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-DOMAIN-MISC1 (slot:papa): clean tsc 93->91 (2 papa-safe reconciliations)

CADRegenerationTestEngine.ts: (318) destructure the real export name via alias
(neuralCADGenerationEngine: neuralCadGenerationEngine) -- casing fix, all usages preserved;
(341, un-masked by 318) move the GenerationConfig {maxRetries,temperature} from the 3rd
positional slot (embeddingBackend?) to the real 5th param -- signature: generate(input,
backend, embeddingBackend?, corpus?, config?). File now fully clears.

QuotingMaterialBridgeEngine.ts: (113) resolveMaterial({ name }) -> ({ material_name })
-- compiler-named real field on the resolveMaterial param type.

No fabricated values; both reconcile to verified producer types. Regression diff empty
(no new un-masking). Deferred this pass (domain-entangled, would risk fabrication/contract
break): IntelligentSequencingAdapter SequenceResult contract (kilo/CAM adapter design --
reverted my touch to baseline), CADAdapterRegistry mastercam adapter (delta), python-api
tribal search method (tribal/quebec), SolidWorks/Inventor CAD result-shape (delta).
```

## Files touched (3)
- mcp-server/src/engines/CADRegenerationTestEngine.ts   | 4 +++-
- mcp-server/src/engines/QuotingMaterialBridgeEngine.ts | 2 +-
- 2 files changed, 4 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2d8b674ba02b`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
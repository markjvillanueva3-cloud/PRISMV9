# BUILD-QUALITY-PAPA/U-TSC-CONTRACT-11 — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-CONTRACT-11 (slot:papa): retype MergedMachineView.canonical_package to EnrichedCanonicalPackagePreview (overlay shape, not persisted CanonicalMachinePackage) -- tsc 12->11

**Commit:** `951764e07f65` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T12:04:01-05:00
**Tags:** build-quality-papa, u-tsc-contract-11, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-CONTRACT-11 (slot:papa): retype MergedMachineView.canonical_package to EnrichedCanonicalPackagePreview (overlay shape, not persisted CanonicalMachinePackage) -- tsc 12->11

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-CONTRACT-11 (slot:papa): retype MergedMachineView.canonical_package to EnrichedCanonicalPackagePreview (overlay shape, not persisted CanonicalMachinePackage) -- tsc 12->11

The field was annotated CanonicalMachinePackage|null (keys: id/machine_type) but
getMergedView builds an overlay-preview literal keyed on canonical_id; the sole
consumer (MachineConsumerBindingEngine:286) reads .canonical_id via optional chain.
Define EnrichedCanonicalPackagePreview matching the literal exactly (controller.model
string|undefined; spindle/coolant optional for the {} fallback; envelope/provenance
Record<string,unknown>) and retype the field. Removed now-unused CanonicalMachinePackage
import. No fabrication; verified cold 16GB-heap tsc 12->11, ShopMachine 0 errors.
```

## Files touched (2)
- mcp-server/src/engines/ShopMachineOverlayEngine.ts | 43 ++++++++++++++++++++++++++++++++++++++++---
- 1 file changed, 40 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 951764e07f65`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
# POST-BRIDGE-SYNERGY-MS0/U-BRIDGE-CONTRACT-VERIFY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-BRIDGE-CONTRACT-VERIFY (slot:echo /loop iter36 /yolo): cross-target parity guarantee + LIVE integration over iter33+34+35 — closes 15/15 phase-1 envelope dependency.

**Commit:** `5981bff185f6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:36:47-05:00
**Tags:** post-bridge-synergy-ms0, u-bridge-contract-verify, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-BRIDGE-CONTRACT-VERIFY (slot:echo /loop iter36 /yolo): cross-target parity guarantee + LIVE integration over iter33+34+35 — closes 15/15 phase-1 envelope dependency.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-BRIDGE-CONTRACT-VERIFY (slot:echo /loop iter36 /yolo): cross-target parity guarantee + LIVE integration over iter33+34+35 — closes 15/15 phase-1 envelope dependency.

Depends on iter33 (Mastercam) + iter34 (hyperMILL) + iter35 (Inventor HSM)
manifest substrates. The three add-in manifests each have target-specific
categories + dialect tokens, but the *contract* — schema fields, required
invariants, version-bumping conventions, diff semantics, function surface —
MUST be identical so the operator-facing add-in code is ONE codebase with
three target configs (no per-target code branches).

This iter ships scripts/lib/bridge-contract-verify.mjs:

  SHARED_CORE_CATEGORIES (7): the categories EVERY target must support
    (post_processor / tool / material / holder / machine_profile /
     sample_program / dialect_map). Target-specific extensions are
     allowed on top (Mastercam adds none, hyperMILL adds 2,
     Inventor adds 4).
  SHARED_REQUIRED_MANIFEST_FIELDS (5) + SHARED_REQUIRED_RESOURCE_FIELDS (4):
     identical-across-targets schema contract.
  ALL_BRIDGE_TARGETS = ['mastercam', 'hypermill', 'inventor_hsm']

  verifyBridgeParity({mastercam, hypermill, inventor_hsm}) runs 6 cross-
  cutting checks:
    1. All 3 targets supplied (else missing-target mismatch)
    2. schemaVersion uniform across targets (else divergence mismatch)
    3. Each target self-IDs correctly (ADDIN_TARGET matches argument key)
    4. Each target covers SHARED_CORE_CATEGORIES (no baseline drift)
    5. Each target has SHARED_REQUIRED_*_FIELDS
    6. Each target exports the 5 canonical functions
       (buildResourceCatalog/validateManifest/diffManifests/summarize/
        resolveDialect)
  Returns {ok, mismatches[]} with concrete error strings naming the
  failing target + dimension.

  findCommonDialectOps(maps[]) returns operations present in EVERY
  target's dialect map — these can be unified at the add-in UI without
  per-target branching. LIVE test confirms 'flood_on' + 'drill_cycle'
  are universal across all 3 add-ins.

  findTargetOnlyDialectOps(target, allMaps) returns operations present
  in EXACTLY ONE target — these REQUIRE per-target branching. LIVE
  test confirms 'heidenhain_drill_cycle' is hyperMILL-only and
  'probe_pre_position' is Inventor-only.

  canonicalizeResourceId(target, id) namespace-prefixes 'mastercam::id'
  to prevent cross-target ID collision when manifests load together.
  parseCanonicalResourceId() round-trips back to {target, id}; refuses
  invalid prefixes + missing-separator inputs.

  summarizeParity() aggregates the verify result with bridgeTargets
  list + coreCategories count + common/target-only dialect ops for
  dashboard rendering.

13 exports. 49 concrete-value tests including 6 LIVE INTEGRATION
ASSERTIONS that actually import iter33+34+35 modules and verify the
real cross-target contract holds — this is the load-bearing
regression test that catches any of the three add-in manifests
drifting from the shared contract in future iterations.

LIVE assertions verified:
  ✓ All 3 manifests pass verifyBridgeParity → ok=true (zero mismatches)
  ✓ Each self-IDs correctly (mastercam/hypermill/inventor_hsm)
  ✓ All share schemaVersion=1
  ✓ All cover SHARED_CORE_CATEGORIES (7 baseline)
  ✓ 'flood_on' is universal (M8 in all 3 dialect maps)
  ✓ 'drill_cycle' is universal (G81 fallback in all 3)
  ✓ 'heidenhain_drill_cycle' (hyperMILL-only) + 'probe_pre_position'
    (Inventor-only) correctly classified as target-specific

CLOSES PHASE-1 BRIDGE-ENABLER DEPENDENCY (units #12-15 in envelope):
  ✓ U-MASTERCAM-ADDIN-RESOURCES   (iter33, 47 tests)
  ✓ U-HYPERMILL-ADDIN-RESOURCES   (iter34, 51 tests)
  ✓ U-INVENTOR-ADDIN-RESOURCES    (iter35, 52 tests)
  ✓ U-BRIDGE-CONTRACT-VERIFY      (iter36, 49 tests w/ LIVE integration)
Total bridge-enabler shipment: 199 tests over 4 substrates with
end-to-end contract proof. Next: U-CAM-EXPORT-FORMAT-EXHAUSTIVE
or whatever's next in priority.
```

## Files touched (3)
- scripts/lib/bridge-contract-verify.mjs      | 221 ++++++++++++++++++++
- scripts/lib/bridge-contract-verify.test.mjs | 304 ++++++++++++++++++++++++++++
- 2 files changed, 525 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5981bff185f6`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
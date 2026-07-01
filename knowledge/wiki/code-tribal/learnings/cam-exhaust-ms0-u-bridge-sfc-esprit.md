# CAM-EXHAUST-MS0/U-BRIDGE-SFC-ESPRIT — [MAIN] [CAM-EXHAUST-MS0]/U-BRIDGE-SFC-ESPRIT+SOLIDCAM: 2 of 6 tier-1 CAM bridges

**Commit:** `76dc1b53cbea` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T20:02:19-05:00
**Tags:** cam-exhaust-ms0, u-bridge-sfc-esprit, auto-distilled

## Subject
[MAIN] [CAM-EXHAUST-MS0]/U-BRIDGE-SFC-ESPRIT+SOLIDCAM: 2 of 6 tier-1 CAM bridges

## Body
```
[MAIN] [CAM-EXHAUST-MS0]/U-BRIDGE-SFC-ESPRIT+SOLIDCAM: 2 of 6 tier-1 CAM bridges

Iter 4 of the picker→bridge /loop. With the picker now slot-domain-correct
(iters 1-3), echo=cam surfaced the BRIDGE-DEEP units. Dedup-preflight found
CAMSpeedFeedBridgeEngine already covers 4 of 6 tier-1 CAM systems (hyperMILL,
Fusion360, Inventor HSM, Mastercam) — Esprit + SolidCAM were the genuine gap
(0 references). This is a bounded engine extension, not a from-scratch build.

Engine (CAMSpeedFeedBridgeEngine.ts):
  - SFBridgeTargetSchema: +esprit +solidcam (5→7 targets incl. generic)
  - SFNativeRequestSchema: +cutterDiameter/surfaceSpeed/feedPerToothEsp
    (ESPRIT) +solidcamDiameter/spinSpeed/feedZ (SolidCAM)
  - normalizeRequest pickFirst chains extended; ESPRIT surfaceSpeed routes
    through the existing SFM→m/min conversion (0.3048 ft→m, like Mastercam)
  - targetToCamSystem +ESPRIT +SolidCAM
  - encodeResponse: ESPRIT pipe record (vc echoed in SFM for US UI),
    SolidCAM flat JSON tag
  - supportedTargets + translation-matrix doc updated

Dispatcher: camDispatcher.ts cam_speedfeed_compute/translate pass target
straight to the engine Zod enum (target-agnostic) — new targets flow
through with no dispatcher change; no separate schema enum hardcodes the
old list (verified via independent reviewer grep).

Tests (CAMSpeedFeedBridgeEngine.test.ts): 48/48 pass. Added esprit/solidcam
translation + encoding + real-orchestrator E2E + dispatcher-round-trip.
ALSO fixed pre-existing broken real-corpus tests: r.payload→r.native_payload
(the field never existed — tests were vacuous), material_iso→iso_group,
removed toBeDefined()/presence-only .match() (test-legitimacy gate blocked
2 attempts until these were cleaned — fixed not weakened).

Mid-build R12 catch: the targetToCamSystem edit was silently dropped by a
host-OOM hook error; the new tests CAUGHT it (3 cam_system-undefined
failures) → re-applied → 48/48. Exactly why real assertions matter.

Per-file scrutiny: physics-review-agent PASS (unit-conversion correct:
400 SFM→121.92, 500→152.4, round-trip lossless; no inlined physics
constants — 0.3048 is the ft→m definition). Independent reviewer PASS
(switch-exhaustiveness verified across all 4 target switches; dispatcher
wiring confirmed; 0 weak assertions). 0 P0/P1; 2 P2 — comment-clarity
P2 fixed this commit, passthrough-fields P2 is pre-existing (logged).

Closes U-BRIDGE-SFC-ESPRIT + U-BRIDGE-SFC-SOLIDCAM. The other 4 SFC
bridges (hyperMILL/Fusion/InventorHSM/Mastercam) are silent close-out
debt — already built, flag for envelope reconciliation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../src/__tests__/CAMSpeedFeedBridgeEngine.test.ts | 298 ++++++++++++++++++---
- mcp-server/src/engines/CAMSpeedFeedBridgeEngine.ts |  58 +++-
- 2 files changed, 318 insertions(+), 38 deletions(-)

## Lessons surfaced in commit body
- til these were cleaned — fixed not weakened).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 76dc1b53cbea`
- Milestone envelope: `mcp-server/data/milestones/CAM-EXHAUST-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
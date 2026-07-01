# POST-BRIDGE-SYNERGY-MS0/U-HYPERMILL-ADDIN-RESOURCES — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-HYPERMILL-ADDIN-RESOURCES (slot:echo /loop iter34 /yolo): hyperMILL add-in resource-manifest substrate — parallel to iter33 Mastercam.

**Commit:** `d7bcd82d7005` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:31:30-05:00
**Tags:** post-bridge-synergy-ms0, u-hypermill-addin-resources, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-HYPERMILL-ADDIN-RESOURCES (slot:echo /loop iter34 /yolo): hyperMILL add-in resource-manifest substrate — parallel to iter33 Mastercam.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-HYPERMILL-ADDIN-RESOURCES (slot:echo /loop iter34 /yolo): hyperMILL add-in resource-manifest substrate — parallel to iter33 Mastercam.

Parallel to the iter33 Mastercam manifest with hyperMILL-specific
differences that prevent cross-bridge confusion + handle hyperMILL's unique
resource categories:

addinTarget = 'hypermill' (fail-loud refuse on cross-bridge load)

RESOURCE_CATEGORIES grows from Mastercam's 7 → 9:
  + strategy_template   — .hmsteel/.hmgear/.hmaero/.hmturn/.hmprobe
  + vendor_post_config  — per-controller post XML (7 controllers)

HYPERMILL_DIALECT_MAP carries Heidenhain TNC + Siemens 840D primary
tokens (hyperMILL's dominant post targets — not Fanuc):
  heidenhain_drill_cycle = 'CYCL DEF 200'
  heidenhain_peck_cycle  = 'CYCL DEF 203'
  siemens_drill_cycle    = 'CYCLE81'
  siemens_peck_cycle     = 'CYCLE83'
Canonical M-codes (M8/M9/M88/G81/G83) still present as fallback.

vendor_post_config resources without a controllerProfile rejected at
validateManifest() with hyperMILL-specific error. isStrategyTemplateFile()
is the file-discovery helper the add-in uses; case-insensitive ends-with,
refuses 'foo.hmsteel-bak' (ext NOT at end) to prevent backup ingestion.

14 exports. 51 concrete-value tests.

Closes bridge-enabler 2 of 3 in POST-BRIDGE-SYNERGY-MS0. Remaining:
U-INVENTOR-ADDIN-RESOURCES (iter35), U-BRIDGE-CONTRACT-VERIFY (iter36).
```

## Files touched (3)
- scripts/lib/hypermill-addin-resource-manifest.mjs  | 241 ++++++++++++++++
- .../lib/hypermill-addin-resource-manifest.test.mjs | 309 +++++++++++++++++++++
- 2 files changed, 550 insertions(+)

## Lessons surfaced in commit body
- till present as fallback.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d7bcd82d7005`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
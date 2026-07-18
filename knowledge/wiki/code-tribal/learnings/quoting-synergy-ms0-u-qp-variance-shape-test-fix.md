# QUOTING-SYNERGY-MS0/U-QP-VARIANCE-SHAPE-TEST-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-VARIANCE-SHAPE-TEST-FIX (slot:charlie): fix stale 4-key shape test → quoting suite 433/433 green

**Commit:** `be6703dcd608` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T03:45:16-05:00
**Tags:** quoting-synergy-ms0, u-qp-variance-shape-test-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-VARIANCE-SHAPE-TEST-FIX (slot:charlie): fix stale 4-key shape test → quoting suite 433/433 green

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-VARIANCE-SHAPE-TEST-FIX (slot:charlie): fix stale 4-key shape test → quoting suite 433/433 green

The quoting pipeline health check (scripts/quoting-pipeline-verify.mjs) surfaced
1 real failure: quoting-baseline-bootstrap.variance.test.mjs 28/29 —
'deriveRecordDefaults: stable 4-key return shape' expected 4 keys but got 5.

R9 root-cause (NOT a weaken-to-pass): the CODE is correct — deriveRecordDefaults
deliberately added material_iso in iter45 (U-QP-BOOTSTRAP-REAL-DEFAULTS, documented
at quoting-baseline-bootstrap.mjs:262-267: path-aware material spend derived from
ISO-group $/kg, aligning training defaults with runtime QuotingMaterialBridgeEngine.
DEFAULTS). The iter45 author updated the code but not this stale contract test.

FIX: update the shape assertion to the evolved 5-key contract (+ material_iso) AND
STRENGTHEN it — assert material_iso is null when the path names no material (the
iter45 semantic contract: null | 'P|M|K|N|S|H'). Verifies intent, not just shape.

VALIDATED: variance 29/29; full quoting suite now OK | 26 files | 433/433 passed |
0 failed | 0 skipped. The quoting galaxy's 'tested, validated' dimension is now
fully green. See reference_quoting_gaps_stale_overreport_2026_06_09.
```

## Files touched (2)
- scripts/quoting-baseline-bootstrap.variance.test.mjs | 6 +++++-
- 1 file changed, 5 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show be6703dcd608`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
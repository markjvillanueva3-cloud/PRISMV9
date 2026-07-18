# OLLAMA-AUTOROUTE-MS0/U-SMART-FANOUT-SAFETY — [MAIN-FORCE] [OLLAMA-AUTOROUTE-MS0]/U-SMART-FANOUT-SAFETY (slot:india): SAFETY-NEVER-LOCAL wins over an explicit lane override + meter model-display fix

**Commit:** `b1181830d41b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T11:55:08-05:00
**Tags:** ollama-autoroute-ms0, u-smart-fanout-safety, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-AUTOROUTE-MS0]/U-SMART-FANOUT-SAFETY (slot:india): SAFETY-NEVER-LOCAL wins over an explicit lane override + meter model-display fix

## Body
```
[MAIN-FORCE] [OLLAMA-AUTOROUTE-MS0]/U-SMART-FANOUT-SAFETY (slot:india): SAFETY-NEVER-LOCAL wins over an explicit lane override + meter model-display fix

Per-file 3-of-3 scrutiny findings closed (A holistic PASS, B test-integrity PASS, C silent-breakage PASS, no P0/P1):
- reviewer-C N1 (P2 safety footgun): laneFor checked the explicit lane:"ollama" override BEFORE isSafetyCritical, so a future caller force-setting lane:"ollama" on a batch with a safety-critical prompt would leak machine-motion/S(x) work to the local model. Reorder: isSafetyCritical wins over any lane override (escalating to Claude is never unsafe; non-safety overrides still honored). +regression test. 13/13 smart-fanout, 40/40 suite.
- reviewer-A note (P3): meter reported results[0].model (undefined if the first galaxy call failed) -> report the first SUCCESSFUL call's model.

Re-applied after a fleet git-sync reset the shared tree (lost as uncommitted; prior commits b0bcf79c85/ecc57360a3 stayed safe in history). Lesson: commit reviewer fixes immediately.
```

## Files touched (4)
- scripts/cad-gen-coverage-meter.mjs |  5 ++++-
- scripts/lib/smart-fanout.mjs       |  8 ++++++--
- scripts/lib/smart-fanout.test.mjs  | 11 +++++++++++
- 3 files changed, 21 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till honored). +regression test. 13/13 smart-fanout, 40/40 suite.
- Lesson: commit reviewer fixes immediately.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b1181830d41b`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-AUTOROUTE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
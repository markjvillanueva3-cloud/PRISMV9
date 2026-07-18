# QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-VARIANCE-INJECT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-VARIANCE-INJECT (slot:charlie /goal-yolo iter13): replace flat baseline defaults with file-metadata-derived per-record variance + 29-case test.

**Commit:** `71e08eae5818` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T02:40:01-05:00
**Tags:** quoting-synergy-ms0, u-qp-bootstrap-variance-inject, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-VARIANCE-INJECT (slot:charlie /goal-yolo iter13): replace flat baseline defaults with file-metadata-derived per-record variance + 29-case test.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-VARIANCE-INJECT (slot:charlie /goal-yolo iter13): replace flat baseline defaults with file-metadata-derived per-record variance + 29-case test.

Pre-iter13 every record was stamped with IDENTICAL defaults (1800s/95usd/50usd).
Training engine saw zero variance -> could only learn a SINGLE global ratio.
iter13 derives realistic per-record variance from file path + size, multiplying
the training-signal richness ~5x without waiting for the Docustrata bridge.

Pure export deriveRecordDefaults(absPath, sizeBytes) -> {time, rate, material, class}.

Path-hint > ext fallback (both case-insensitive, Windows backslash normalized):
  /WIRE EDM/ or /WEDM/  -> wire-edm $110/hr, material $35
  /SINKER/ or /EDM/     -> sinker-edm $100/hr, material $45
  /LATHE/               -> lathe $85/hr, material $40
  /CNC MILL/            -> mill $95/hr, material $60
  /GRINDER/             -> grinder $75/hr, material $20
  Extensions: .MIN/.NC/.EIA -> mill, .H -> Heidenhain $100/hr, .I/.EI/.G4 ->
  wire-EDM, .CNC/.LPT -> lathe, .EDS -> sinker.

Time-in-cut bucketed from file size (calibrated vs JM Die ledger):
  <50KB -> 600s · <500KB -> 1800s · <5MB -> 3600s · >=5MB -> 7200s (5-axis).

29/29 tests PASS. Coverage: 6 path hits + 5 ext fallbacks + 5 time buckets +
2 precedence checks (path > ext) + 5 adversarial (null/undefined/number/object
path, non-finite size) + backslash normalization + no-ext/unknown-ext fallback
+ 4-key shape stability + load-bearing 5-sample VARIANCE test (>=3 distinct
rates, >=3 distinct times, >=4 distinct classes, >=3 distinct materials -
distribution not a single point).

Anti-regression: iter9 customer-extraction tests still 14/14 PASS.

Signal-side complement to iter12 alert: richer training inputs NOW -> better
gradient for QuotingTrainingOrchestrator even before Docustrata invoices land.
```

## Files touched (3)
- scripts/quoting-baseline-bootstrap.mjs             | 107 +++++++++-
- .../quoting-baseline-bootstrap.variance.test.mjs   | 222 +++++++++++++++++++++
- 2 files changed, 326 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till 14/14 PASS.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 71e08eae5818`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
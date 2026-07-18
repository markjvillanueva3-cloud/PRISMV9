# HOTEL/U-VENDOR-PERFORMANCE-TRACKER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-VENDOR-PERFORMANCE-TRACKER (slot:hotel iter29 /goal /yolo): ISO 9001 §8.4 supplier evaluation with 4-component composite scorecard + 4-tier classification

**Commit:** `543715dff29c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T22:55:23-05:00
**Tags:** hotel, u-vendor-performance-tracker, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-VENDOR-PERFORMANCE-TRACKER (slot:hotel iter29 /goal /yolo): ISO 9001 §8.4 supplier evaluation with 4-component composite scorecard + 4-tier classification

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-VENDOR-PERFORMANCE-TRACKER (slot:hotel iter29 /goal /yolo): ISO 9001 §8.4 supplier evaluation with 4-component composite scorecard + 4-tier classification

— VendorPerformanceTrackerEngine: composite = 0.40·OTD + 0.30·QualAcceptance(1-ncrRate/0.10) + 0.15·Responsiveness(24h-norm) + 0.15·PriceCompetitiveness($500/PO-norm). 4-tier classify: preferred ≥0.85 · approved ≥0.70 · probation ≥0.55 · disqualified <0.55. recordPO captures po_id+vendor_id+promised+received+amount+ncr_count+turn_hours. computeScorecard over rolling window (default 180d). rankVendors returns descending composite list. R12 ≥3 POs/window for stable signal.

— Tests: 17/17 PASS. Variability: all 4 tiers exercised + 2 monotonicity invariants (quality drops as NCRs rise, responsiveness drops as turn-hours rise) + ≥3 R12 modes (bad date, negative amount, non-integer NCR count, <3 PO floor, out-of-range window, missing vendor_id). Hotel-soul: frozen, PII-free.

— businessDispatcher: +4 actions (vendor_record_po, vendor_compute_scorecard, vendor_list_all, vendor_rank).

— /system-viz synergy: classifier extended (vendor_ → business axis).

Bridges to iter23 NCR: supplier-source NCRs (via NonConformance.recordNC(source:'supplier')) degrade vendor's quality_acceptance component. Closes ISO 9001 §8.4 'evaluate, select, monitor, and re-evaluate external providers' requirement.
```

## Files touched (5)
- .../VendorPerformanceTrackerEngine.test.ts         | 197 +++++++++++++++++++
- .../src/engines/VendorPerformanceTrackerEngine.ts  | 212 +++++++++++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    |  26 +++
- scripts/generate-hotel-domain-features.mjs         |   1 +
- 4 files changed, 436 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 543715dff29c`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
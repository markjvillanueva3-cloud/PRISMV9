# POST-PROCESSOR/U-PP-CIMCO-KNOWN-BAD-NC — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-CIMCO-KNOWN-BAD-NC (slot:echo): known-bad over-travel NC fixture for the CIMCO baseline-sim collision-catch proof

**Commit:** `aa4f8c8b8457` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T13:19:04-05:00
**Tags:** post-processor, u-pp-cimco-known-bad-nc, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-CIMCO-KNOWN-BAD-NC (slot:echo): known-bad over-travel NC fixture for the CIMCO baseline-sim collision-catch proof

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-CIMCO-KNOWN-BAD-NC (slot:echo): known-bad over-travel NC fixture for the CIMCO baseline-sim collision-catch proof

Gross Z-2000/X+9999/Y+9999 vs the Haas VF-6/40 ~1626x813x762mm envelope -- a correct sim MUST
report over-travel/limit rows (verdict FAIL). The remaining fidelity wire (.mcfg machine-load)
must precede it: live drive this session proved frame-realized + sim open=fired;run=fired, but
report-grid-not-found because the sim ran CIMCO's DEFAULT machine (no travel limits to violate).
See memory reference_echo_cimco_baseline_live_2026_06_26.
```

## Files touched (2)
- state/shared/cimco/KNOWN-BAD-OVERTRAVEL-VMC03-HaasVF6.nc | 24 ++++++++++++++++++++++++
- 1 file changed, 24 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show aa4f8c8b8457`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
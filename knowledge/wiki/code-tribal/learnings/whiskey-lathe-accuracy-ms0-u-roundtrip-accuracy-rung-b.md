# WHISKEY-LATHE-ACCURACY-MS0/U-ROUNDTRIP-ACCURACY-RUNG-B — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WHISKEY-LATHE-ACCURACY-MS0]/U-ROUNDTRIP-ACCURACY-RUNG-B (slot:whiskey): TRUE print-to-program-to-post roundtrip accuracy harness — parse JM Okuma .MIN, regenerate via the now-bound lathe adapter, diff params vs master. HONEST 24-sample baseline: op-coverage 100pct, SFM-in-band 8.5pct, IPR-in-band 6.3pct, mean 41.6pct — a LOWER BOUND (forced 1018/ISO-P default; real JM parts run harder/slower). Localizes data-opt gap: PRISM textbook P-speeds ~2-4x JM conservative shop practice. 2-reviewer A PASS / B material-disclosure fixed (R12) + shim empirically justified. NOT 100pct (R12).

**Commit:** `3e9b3e86679d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T14:22:28-05:00
**Tags:** whiskey-lathe-accuracy-ms0, u-roundtrip-accuracy-rung-b, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WHISKEY-LATHE-ACCURACY-MS0]/U-ROUNDTRIP-ACCURACY-RUNG-B (slot:whiskey): TRUE print-to-program-to-post roundtrip accuracy harness — parse JM Okuma .MIN, regenerate via the now-bound lathe adapter, diff params vs master. HONEST 24-sample baseline: op-coverage 100pct, SFM-in-band 8.5pct, IPR-in-band 6.3pct, mean 41.6pct — a LOWER BOUND (forced 1018/ISO-P default; real JM parts run harder/slower). Localizes data-opt gap: PRISM textbook P-speeds ~2-4x JM conservative shop practice. 2-reviewer A PASS / B material-disclosure fixed (R12) + shim empirically justified. NOT 100pct (R12).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WHISKEY-LATHE-ACCURACY-MS0]/U-ROUNDTRIP-ACCURACY-RUNG-B (slot:whiskey): TRUE print-to-program-to-post roundtrip accuracy harness — parse JM Okuma .MIN, regenerate via the now-bound lathe adapter, diff params vs master. HONEST 24-sample baseline: op-coverage 100pct, SFM-in-band 8.5pct, IPR-in-band 6.3pct, mean 41.6pct — a LOWER BOUND (forced 1018/ISO-P default; real JM parts run harder/slower). Localizes data-opt gap: PRISM textbook P-speeds ~2-4x JM conservative shop practice. 2-reviewer A PASS / B material-disclosure fixed (R12) + shim empirically justified. NOT 100pct (R12).
```

## Files touched (4)
- mcp-server/scripts/lathe-print-to-program-roundtrip-accuracy.ts | 529 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/dashboards/lathe-roundtrip-accuracy.json           | 551 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/dashboards/lathe-roundtrip-accuracy.md             |  31 ++++
- 3 files changed, 1111 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3e9b3e86679d`
- Milestone envelope: `mcp-server/data/milestones/WHISKEY-LATHE-ACCURACY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
# BLUEPRINT-VISION-OCR/U-XRAY-P15-COMPARISON-FINDING — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-COMPARISON-FINDING (slot:xray): decide-by-the-number -- region routing UNDERPERFORMED full-page on 05850 (recall 0 / 1-of-3pp vs 0.4286 / 3-of-3pp), NOT safe to default-on; keep opt-in/rescue-only

**Commit:** `ca91dcb5d506` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T20:55:48-05:00
**Tags:** blueprint-vision-ocr, u-xray-p15-comparison-finding, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-COMPARISON-FINDING (slot:xray): decide-by-the-number -- region routing UNDERPERFORMED full-page on 05850 (recall 0 / 1-of-3pp vs 0.4286 / 3-of-3pp), NOT safe to default-on; keep opt-in/rescue-only

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-COMPARISON-FINDING (slot:xray): decide-by-the-number -- region routing UNDERPERFORMED full-page on 05850 (recall 0 / 1-of-3pp vs 0.4286 / 3-of-3pp), NOT safe to default-on; keep opt-in/rescue-only

First same-session validate-perfect-parts comparison (--limit 3, full-page vs
--region-route on the same parts; only 05850 scoreable). Region routing dropped
2 of 3 pages vs the single full-page pass and matched 0/7 callout-GT -> high
variance / a multi-page-scan per-page-failure mode, contradicting the prior
single-run 0.4286 parity. Per multi-seed doctrine one run isn't conclusive but
is a strong signal: region routing stays OPT-IN / dense-rescue-only (default-off
as shipped). Open: multi-seed + investigate the 2/3-page drop. Doc-only.
```

## Files touched (2)
- knowledge/wiki/architecture/blueprint-reading-improvement-backlog-2026-06-19.md | 2 ++
- 1 file changed, 2 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ca91dcb5d506`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
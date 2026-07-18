# SFC-FRONTEND/U-SFC-FE-TEST-OVERSTRICT — [MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-TEST-OVERSTRICT (slot:oscar): fix 2 over-strict getByText->getAllByText in CalculatorPage tests

**Commit:** `e1a5c57237b4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:49:34-05:00
**Tags:** sfc-frontend, u-sfc-fe-test-overstrict, auto-distilled

## Subject
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-TEST-OVERSTRICT (slot:oscar): fix 2 over-strict getByText->getAllByText in CalculatorPage tests

## Body
```
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-TEST-OVERSTRICT (slot:oscar): fix 2 over-strict getByText->getAllByText in CalculatorPage tests

Codex's frontend was 'mostly done just untested'. CalculatorPage.test.tsx had 7/24
failing. 2 were over-strict singular queries on strings the component legitimately
renders in 2+ valid places (Backend AI review panel title + posture echo; tool-crib
intake summary echoed in toast + panel) -> getByText/findByText threw 'Found multiple'.
Converted to getAllByText(...).length>0 / findAllByText(...).length>0 -- intent-preserving
presence checks (still fail if absent), matching the test author's own pattern at line 216.
TEST-ONLY, zero production-code change. File now 19 pass / 5 fail (was 17/7).
Remaining 5 (manual-lathe G71 surfacing, CAT40 Big+ option-gen, multi tool-diameter input,
2 split-text) triaged in reference_oscar_sfc_frontend_triage_2026_06_24.md.
Verified: vitest CalculatorPage tests #1 (copilot memory) + #2 (tool-crib intake) green.
```

## Files touched (2)
- mcp-server/web/src/__tests__/CalculatorPage.test.tsx | 19 +++++++++++++------
- 1 file changed, 13 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till fail if absent), matching the test author's own pattern at line 216.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e1a5c57237b4`
- Milestone envelope: `mcp-server/data/milestones/SFC-FRONTEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
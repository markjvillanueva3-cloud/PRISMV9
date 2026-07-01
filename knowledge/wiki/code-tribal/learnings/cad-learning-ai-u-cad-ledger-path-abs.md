# CAD-LEARNING-AI/U-CAD-LEDGER-PATH-ABS — [MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEDGER-PATH-ABS (slot:india): anchor CAD failure-ledger default to the module, not process.cwd() (closes the loop-split)

**Commit:** `b971e6d8abb2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T09:27:18-05:00
**Tags:** cad-learning-ai, u-cad-ledger-path-abs, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEDGER-PATH-ABS (slot:india): anchor CAD failure-ledger default to the module, not process.cwd() (closes the loop-split)

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-LEDGER-PATH-ABS (slot:india): anchor CAD failure-ledger default to the module, not process.cwd() (closes the loop-split)

CADTrialErrorLearningEngine DEFAULT_LEDGER_PATH was cwd-relative -> a repo-root script
(cwd=H:/prism) and the mcp-server dispatcher (cwd=mcp-server) wrote DIFFERENT ledgers,
so cad_learning_* recommendations never saw a script's ingested outcomes (silent
closed-loop split). New pure resolveDefaultLedgerPath(import.meta.url) anchors to
<mcp-server>/data/state via ../../ from {src,dist}/engines -> one shared ledger
regardless of launch cwd. Hardens U-CAD-TEXT-LEARN-LOOP + U-CAD-LEARN-TRIBAL-INJECT.

SAFE: ledger absent at both locations (no data to orphan); no test couples to this
engine default (XprocOutcomeLedgerDurability is a different engine); env override path
unchanged. TEST: 61/61 (+2 resolver tests). Vitest green.
```

## Files touched (3)
- mcp-server/src/__tests__/CADTrialErrorLearningEngine.test.ts | 24 ++++++++++++++++++++++++
- mcp-server/src/engines/CADTrialErrorLearningEngine.ts        | 23 +++++++++++++++++++++--
- 2 files changed, 45 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b971e6d8abb2`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
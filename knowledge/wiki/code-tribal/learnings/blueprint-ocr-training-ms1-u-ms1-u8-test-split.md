# BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8-TEST-SPLIT — [MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-MS1-U8-TEST-SPLIT: split combined test into per-engine files (Stop-hook naming convention)

**Commit:** `5ce24356be11` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T21:58:30-05:00
**Tags:** blueprint-ocr-training-ms1, u-ms1-u8-test-split, auto-distilled

## Subject
[MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-MS1-U8-TEST-SPLIT: split combined test into per-engine files (Stop-hook naming convention)

## Body
```
[MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-MS1-U8-TEST-SPLIT: split combined test into per-engine files (Stop-hook naming convention)

Stop hook flagged BlueprintLoRABridgeEngine + BlueprintCoverageAuditEngine as UNTESTED because the auto-discovery scanner expects __tests__/<EngineName>.test.ts naming. Combined file at BlueprintLoRABridgeAndCoverageAudit.test.ts didn't match either pattern. Split:
- mcp-server/src/__tests__/BlueprintLoRABridgeEngine.test.ts (22 cases — HARD RULE customer-name anonymization, staging-dir block, marker bypass, etc.)
- mcp-server/src/__tests__/BlueprintCoverageAuditEngine.test.ts (16 cases — audit + flagRetrain + report)
- Deleted combined file
38/38 PASS post-split.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/BlueprintCoverageAuditEngine.test.ts | 158 ++++++++
- .../BlueprintLoRABridgeAndCoverageAudit.test.ts    | 438 ---------------------
- .../__tests__/BlueprintLoRABridgeEngine.test.ts    | 205 ++++++++++
- 3 files changed, 363 insertions(+), 438 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5ce24356be11`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
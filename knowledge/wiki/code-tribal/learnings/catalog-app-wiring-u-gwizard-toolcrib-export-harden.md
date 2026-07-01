# CATALOG-APP-WIRING/U-GWIZARD-TOOLCRIB-EXPORT-HARDEN — [MAIN] [CATALOG-APP-WIRING]/U-GWIZARD-TOOLCRIB-EXPORT-HARDEN (slot:romeo): flatten CR/LF in CSV cells + 2 escaping edge tests

**Commit:** `df6bf7a4d1b9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T22:25:46-05:00
**Tags:** catalog-app-wiring, u-gwizard-toolcrib-export-harden, auto-distilled

## Subject
[MAIN] [CATALOG-APP-WIRING]/U-GWIZARD-TOOLCRIB-EXPORT-HARDEN (slot:romeo): flatten CR/LF in CSV cells + 2 escaping edge tests

## Body
```
[MAIN] [CATALOG-APP-WIRING]/U-GWIZARD-TOOLCRIB-EXPORT-HARDEN (slot:romeo): flatten CR/LF in CSV cells + 2 escaping edge tests

Latent corruption fix: _encodeCell quoted newlines, but gWizardAdapterEngine parses line-by-line (splits on \r?\n BEFORE field-splitting), so a newline inside a tool description silently split ONE tool across TWO crib rows. Now CR/LF collapse to a space first, then RFC-4180 quote. Adds tests for embedded double-quote (round-trips via "" escape) and embedded newline (1 tool not 2, CR/LF->space) — the newline test fails against the old code. 13/13 (was 11). Closes reviewer-B P2 escaping-coverage gap.
```

## Files touched (3)
- mcp-server/src/__tests__/GWizardToolCribExportEngine.test.ts | 18 ++++++++++++++++++
- mcp-server/src/engines/GWizardToolCribExportEngine.ts        | 14 ++++++++++----
- 2 files changed, 28 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show df6bf7a4d1b9`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
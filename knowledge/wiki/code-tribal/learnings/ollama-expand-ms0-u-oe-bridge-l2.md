# OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2 — [MAIN] [OLLAMA-EXPAND-MS0]/U-OE-BRIDGE-L2: harden WIKI_INDEX_REL regression oracle (3-of-3 arm-B P2)

**Commit:** `36f7bb42d674` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T22:43:50-05:00
**Tags:** ollama-expand-ms0, u-oe-bridge-l2, auto-distilled

## Subject
[MAIN] [OLLAMA-EXPAND-MS0]/U-OE-BRIDGE-L2: harden WIKI_INDEX_REL regression oracle (3-of-3 arm-B P2)

## Body
```
[MAIN] [OLLAMA-EXPAND-MS0]/U-OE-BRIDGE-L2: harden WIKI_INDEX_REL regression oracle (3-of-3 arm-B P2)

The named 'WIKI_INDEX_REL regression oracle' test gated its skip on WIKI_PRESENT, which derived from the same WIKI_INDEX_REL constant under test — a wrong path made the oracle skip itself instead of failing. Fix: WIKI_PRESENT now checks the literal expected path; added a skip-free direct-assertion oracle on the constant. 87 tests, 86 pass, 1 skip.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- scripts/__tests__/ollama-prism-bridge.test.mjs | 12 +++++++++++-
- 1 file changed, 11 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrong path made the oracle skip itself instead of failing. Fix: WIKI_PRESENT now checks the literal expected path; added a skip-free direct-assertion oracle on the constant. 87 tests, 86 pass, 1 skip.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 36f7bb42d674`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-EXPAND-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
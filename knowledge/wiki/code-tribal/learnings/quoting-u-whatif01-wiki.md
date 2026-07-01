# QUOTING/U-WHATIF01-WIKI — [MAIN-FORCE] [QUOTING]/U-WHATIF01-WIKI (slot:charlie): wiki lesson for the estimate-flow envelope+nested dead-path fix

**Commit:** `b628263cd5f5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T17:58:19-05:00
**Tags:** quoting, u-whatif01-wiki, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING]/U-WHATIF01-WIKI (slot:charlie): wiki lesson for the estimate-flow envelope+nested dead-path fix

## Body
```
[MAIN-FORCE] [QUOTING]/U-WHATIF01-WIKI (slot:charlie): wiki lesson for the estimate-flow envelope+nested dead-path fix

Companion to 17b445e69c (bug-finding -> wiki gate). Documents the two coupled
defects (MCP content envelope unparsed by callTool + nested-engine-shape vs
flat-page-type), why the flat-{result} mocks hid it (R9), and the lesson:
a FE route read is a 2-axis contract (wrapping + data shape), verify both
against a live probe.
```

## Files touched (2)
- ...oting-estimate-flow-envelope-nested-mismatch.md | 63 ++++++++++++++++++++++
- 1 file changed, 63 insertions(+)

## Lessons surfaced in commit body
- lesson for the estimate-flow envelope+nested dead-path fix
- lesson:

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b628263cd5f5`
- Milestone envelope: `mcp-server/data/milestones/QUOTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
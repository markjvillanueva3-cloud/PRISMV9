# VERIFIED-OFFLOAD/U-NAV-ADVISORY-HARDEN — [MAIN] [VERIFIED-OFFLOAD]/U-NAV-ADVISORY-HARDEN (slot:alpha): close the 3-of-3 P2 -- anchor parseFindCommand so a mention never fires + cut at shell operators

**Commit:** `4b299e313b15` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T09:56:20-05:00
**Tags:** verified-offload, u-nav-advisory-harden, auto-distilled

## Subject
[MAIN] [VERIFIED-OFFLOAD]/U-NAV-ADVISORY-HARDEN (slot:alpha): close the 3-of-3 P2 -- anchor parseFindCommand so a mention never fires + cut at shell operators

## Body
```
[MAIN] [VERIFIED-OFFLOAD]/U-NAV-ADVISORY-HARDEN (slot:alpha): close the 3-of-3 P2 -- anchor parseFindCommand so a mention never fires + cut at shell operators

Closes the deferred P2 from 0c641ef45a (reviewer B). The find regex was not start-anchored, so 'echo "...system-viz find x"' / 'grep system-viz find' emitted a spurious advisory, and a space-separated redirect ('find mill > out.txt') polluted the captured query.

Fix: (1) cut the command at the first shell control/redirect operator (|| && | & ; < > >>) and parse ONLY the first segment -> a redirect target or piped tail can no longer pollute the query (proven: 'find mill > out.txt' -> 'mill', 'find lathe | head' -> 'lathe'); (2) anchor the match to a REAL invocation -- Form A requires the 'system-viz-query[.mjs] find' script name, Form B allows bare 'system-viz find' only at the segment START -> a mention inside echo/grep/a quoted string never matches (proven live: echoed mention now silent).

21/21 tests (was 16; +5: mid-string mention, echoed mention, grep mention, redirect-tail, piped-tail). LIVE re-verify: real find still fires, echoed mention silent, redirect query=mill. Advisory-only + fail-soft unchanged. Serves the operator's restated 'enforce ollama nav across all galaxies' directive -- the cross-galaxy nav-offload advisory is now robust.
```

## Files touched (3)
- .claude/hooks/nav-rerank-advisory.mjs      | 26 ++++++++++++++++++++------
- .claude/hooks/nav-rerank-advisory.test.mjs | 36 ++++++++++++++++++++++++++++++++++--
- 2 files changed, 54 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till fires, echoed mention silent, redirect query=mill. Advisory-only + fail-soft unchanged. Serves the operator's restated 'enforce ollama nav across all galaxies' directive -- the cross-galaxy nav-offload advisory is now robust.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4b299e313b15`
- Milestone envelope: `mcp-server/data/milestones/VERIFIED-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
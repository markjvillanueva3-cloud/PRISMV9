# TOKEN-SAVINGS/U-OLLAMA-BRIDGE-EXEC-HONEST-LABEL — [MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-BRIDGE-EXEC-HONEST-LABEL (slot:alpha): 3-of-3 P1 -- 'tok measured' was an estimate; relabel + double-count caveat

**Commit:** `53923751cda7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T22:00:16-05:00
**Tags:** token-savings, u-ollama-bridge-exec-honest-label, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-BRIDGE-EXEC-HONEST-LABEL (slot:alpha): 3-of-3 P1 -- 'tok measured' was an estimate; relabel + double-count caveat

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-BRIDGE-EXEC-HONEST-LABEL (slot:alpha): 3-of-3 P1 -- 'tok measured' was an estimate; relabel + double-count caveat

3-of-3 arms A+B (both PASS) flagged R12: bridgeTokensSaved is labeled 'tok measured' but
ask-hermes's portion is estimateHermesSaved (an ESTIMATE), so the aggregate is mixed.
Relabel both output lines to 'tok off-Claude; ask-ollama measured + ask-hermes estimated'.
Arm A clarity: note bridgeExecutions already includes the ask-ollama runs that also appear
in the windowed executedOffloads -- do NOT sum them. Dashboard 31/31 green.
```

## Files touched (2)
- scripts/ollama-offload-dashboard.mjs | 6 +++---
- 1 file changed, 3 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 53923751cda7`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
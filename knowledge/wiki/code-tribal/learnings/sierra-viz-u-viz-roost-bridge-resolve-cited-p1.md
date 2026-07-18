# SIERRA-VIZ/U-VIZ-ROOST-BRIDGE-RESOLVE-CITED-P1 — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-ROOST-BRIDGE-RESOLVE-CITED-P1 (slot:sierra): add real-oracle integration test (per-file review P1)

**Commit:** `91b108041a50` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:11:01-05:00
**Tags:** sierra-viz, u-viz-roost-bridge-resolve-cited-p1, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-ROOST-BRIDGE-RESOLVE-CITED-P1 (slot:sierra): add real-oracle integration test (per-file review P1)

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-ROOST-BRIDGE-RESOLVE-CITED-P1 (slot:sierra): add real-oracle integration test (per-file review P1)

Per-file review arm B flagged a P1: the 3 resolution tests used a MOCK resolver, so the real
makeOracleResolver contract was unverified at the generator level (potential tautology). Added a 4th
test that calls the production makeOracleResolver() against the LIVE node-card oracle and asserts haas
bridge targets resolve to eng.* node-ids with 0 dropped -- end-to-end, no mock. 16/16.
```

## Files touched (2)
- scripts/generate-cited-tips-viz-features.test.mjs | 11 +++++++++++
- 1 file changed, 11 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 91b108041a50`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
# BRAND-CATALOG-APP-WIRING/U-SUPPRESS-COUNT — [MAIN-FORCE] [BRAND-CATALOG-APP-WIRING]/U-SUPPRESS-COUNT (slot:romeo): count only diameters actually dropped (3-of-3 arm-B P2)

**Commit:** `3696c4deb8f0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T23:33:41-05:00
**Tags:** brand-catalog-app-wiring, u-suppress-count, auto-distilled

## Subject
[MAIN-FORCE] [BRAND-CATALOG-APP-WIRING]/U-SUPPRESS-COUNT (slot:romeo): count only diameters actually dropped (3-of-3 arm-B P2)

## Body
```
[MAIN-FORCE] [BRAND-CATALOG-APP-WIRING]/U-SUPPRESS-COUNT (slot:romeo): count only diameters actually dropped (3-of-3 arm-B P2)

3-of-3 arm B flagged a cosmetic over-report: diameterSuppressed incremented on every
geometry_plausible:false record, including the ~17 name-only ones that had no diameter to drop.
Now counts only records with a real positive diameter that was suppressed -- honest to the
"implausible-diameter dropped" label. Telemetry-only; emitted data unchanged. Live: 838 -> 821
(matches arm A's "821 carrying a positive bogus diameter"). emitter 6/6 green.
```

## Files touched (2)
- scripts/emit-brand-catalog-registry-json.mjs | 7 ++++++-
- 1 file changed, 6 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3696c4deb8f0`
- Milestone envelope: `mcp-server/data/milestones/BRAND-CATALOG-APP-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
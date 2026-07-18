# FLEET-DOMAIN-FALLBACK/U-ANY-DOMAIN-9SLOTS-LIVE — [MAIN-FORCE] [FLEET-DOMAIN-FALLBACK]/U-ANY-DOMAIN-9SLOTS-LIVE (slot:zulu): close dormancy gap -- hook resolves canonical H:/prism so the any-domain notice fires fleet-wide (scrutiny arm-C P2)

**Commit:** `2a3b2c4cfbc8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T11:26:19-05:00
**Tags:** fleet-domain-fallback, u-any-domain-9slots-live, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-DOMAIN-FALLBACK]/U-ANY-DOMAIN-9SLOTS-LIVE (slot:zulu): close dormancy gap -- hook resolves canonical H:/prism so the any-domain notice fires fleet-wide (scrutiny arm-C P2)

## Body
```
[MAIN-FORCE] [FLEET-DOMAIN-FALLBACK]/U-ANY-DOMAIN-9SLOTS-LIVE (slot:zulu): close dormancy gap -- hook resolves canonical H:/prism so the any-domain notice fires fleet-wide (scrutiny arm-C P2)

Follow-up to cb5b39ac5b. 3-of-3 scrutiny arm-C found the feature DORMANT:
slot-domain-awareness-inject resolveRoot() preferred hardcoded H:/prism-slot-kilo,
whose CHAT-SLOT-DOMAINS.md lacks the ANY_DOMAIN_SLOTS marker -- so for any chat
without PRISM_ROOT (most of the fleet) the notice never fired. The same kilo-first
ordering left EVERY registry edit dormant fleet-wide until kilo synced.

Fix (root cause): resolveRoot prefers (1) PRISM_ROOT, (2) the tree THIS hook lives in
via dirname(fileURLToPath(import.meta.url))/../.. (= canonical H:/prism under the
absolute settings.json invocation), (3) H:/prism, (4) kilo LAST.
- export resolveRoot; LIVE test now reads through resolveRoot() (runtime-faithful) --
  closes arm-C false-confidence finding (test+runtime agree on which file is read).
- cosmetic: "=1 -> no-op"/"=1 -> include" spacing.

VALIDATED LIVE: NO PRISM_ROOT -> resolveRoot()=H:/prism, hook emits
"_ANY-DOMAIN slot: **zulu** may pick ANY domain's next..._" (was "(STILL DORMANT)").
Tests 11/11 + dedup 6/6, no regression.
```

## Files touched (3)
- .claude/hooks/__tests__/slot-domain-awareness-inject.test.mjs | 19 +++++++++++--------
- .claude/hooks/slot-domain-awareness-inject.mjs                | 18 ++++++++++++++----
- 2 files changed, 25 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- til kilo synced.
- TILL DORMANT)").

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2a3b2c4cfbc8`
- Milestone envelope: `mcp-server/data/milestones/FLEET-DOMAIN-FALLBACK.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
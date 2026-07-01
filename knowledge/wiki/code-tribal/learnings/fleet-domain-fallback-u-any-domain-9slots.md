# FLEET-DOMAIN-FALLBACK/U-ANY-DOMAIN-9SLOTS — [MAIN-FORCE] [FLEET-DOMAIN-FALLBACK]/U-ANY-DOMAIN-9SLOTS (slot:zulu): sanction 9 slots to work ANY domain when own queue dry + auto-surface fleet-wide

**Commit:** `cb5b39ac5b89` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T11:11:33-05:00
**Tags:** fleet-domain-fallback, u-any-domain-9slots, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-DOMAIN-FALLBACK]/U-ANY-DOMAIN-9SLOTS (slot:zulu): sanction 9 slots to work ANY domain when own queue dry + auto-surface fleet-wide

## Body
```
[MAIN-FORCE] [FLEET-DOMAIN-FALLBACK]/U-ANY-DOMAIN-9SLOTS (slot:zulu): sanction 9 slots to work ANY domain when own queue dry + auto-surface fleet-wide

Operator directive 2026-06-18: "make it so all chats fall back to roadmap work,
left over tasks and units relative to their domain. if they don't have domain
work, change alpha, bravo, golf, sierra, zulu, india, papa, romeo and xray to
work in any domain."

Part A (all-slots fall back to domain roadmap/leftover, never idle) was ALREADY
canonical doctrine -- feedback_loop_exhaustion_domain_fallback, re-affirmed
2026-06-17. Part B (the 9 named slots expand to ANY domain when own queue dry)
is the new sanction; it resolves the CHAT-SLOT-DOMAINS.md cross-slot conflict
(R7): "no work outside domain without explicit operator override" -- the
operator is now giving that override for these 9.

The fallback MECHANISM already exists (no resolver change): loop-state.mjs
cmdNext -> pickUnitTop resolves own-lane first (pick-unit --slot), then on empty
falls back fleet-wide (pick-unit, no --slot, peer-claim-filtered) = ANY domain's
next unit. The gap was GOVERNANCE + fleet-wide AWARENESS.

Changes:
- state/shared/CHAT-SLOT-DOMAINS.md: + "Any-domain fallback slots" section,
  machine-parseable ANY_DOMAIN_SLOTS: marker (9 slots), amended cross-slot
  doctrine line to cite the override. (H:/CHAT-SLOT-DOMAINS.md root copy +
  feedback_any_domain_fallback_slots.md C: memory updated out-of-band.)
- .claude/hooks/slot-domain-awareness-inject.mjs: parseAnyDomainSlots +
  formatAnyDomainNotice (pure, exported) surface a 1-line any-domain notice
  every prompt (personalized when this slot is one of the 9); folded into the
  deduped block. Added CLI-entry guard so the pure fns are importable for test.
  Cleaned pre-existing em-dashes/arrows to ASCII (ascii-guard latent landmine).
- .claude/hooks/__tests__/slot-domain-awareness-inject.test.mjs: 11 tests
  (happy + absent + malformed + prose-vs-marker adversarial + notice content +
  ASCII-only + LIVE registry parse). 11/11 pass; existing hook tests 17/17 (no
  regression). Live-validated: hook emits personalized notice for zulu.

Propagation note (R12): slot-domain-awareness-inject resolveRoot prefers
H:/prism-slot-kilo then H:/prism, so the marker goes live fleet-wide once it
syncs to the resolved root via normal git integration -- same path the table
itself uses. Not introduced here; pre-existing root-resolution behavior.
```

## Files touched (4)
- .claude/hooks/__tests__/slot-domain-awareness-inject.test.mjs | 96 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/slot-domain-awareness-inject.mjs                | 66 ++++++++++++++++++++++++++++++++++++++---------
- state/shared/CHAT-SLOT-DOMAINS.md                             | 14 ++++++++--
- 3 files changed, 162 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cb5b39ac5b89`
- Milestone envelope: `mcp-server/data/milestones/FLEET-DOMAIN-FALLBACK.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
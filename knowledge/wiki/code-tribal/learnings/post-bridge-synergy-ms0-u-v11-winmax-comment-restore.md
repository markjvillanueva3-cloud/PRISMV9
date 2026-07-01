# POST-BRIDGE-SYNERGY-MS0/U-V11-WINMAX-COMMENT-RESTORE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-V11-WINMAX-COMMENT-RESTORE (slot:echo /loop iter26 /yolo): restore .cps top-of-file post-identifier comment block dropped during v11 refactor — operator at WinMax control needs POST + CONTROL + MACHINE + POSTED identifiers to verify which post generated the program (v11 test.hnc lines 1-12 emit no identifier). PURE LIB: scripts/lib/v11-post-identifier-banner.mjs — BANNER_DELIMITER + UNKNOWN_PLACEHOLDER + sanitizeBannerValue (null/empty/non-printable/parens-strip safety, ASCII 32..126 only) + renderPostIdentifierBanner (6-line block) + renderV11HurcoBanner (shipping default: PRISM HURCO VM30i ENHANCED v11 / WinMax ISNC/BNC Compatible / HURCO VM30i 3-Axis VMC) + bannerLines + isValidBannerOutput round-trip self-check. Pure renderer ships now; .cps onOpen wire-up follow-up iter. TESTS: 33/33 concrete-value PASS (2 const + 9 sanitize + 7 line-by-line render + 3 default-arg + 5 shipping default + 7 round-trip incl broken-delimiter rejection). ENVELOPE: iter26, unit 5 of 135. Next: U-V11-AGGRESSIVENESS-RENAME-SHIM.

**Commit:** `c2cf533ef887` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T22:43:04-05:00
**Tags:** post-bridge-synergy-ms0, u-v11-winmax-comment-restore, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-V11-WINMAX-COMMENT-RESTORE (slot:echo /loop iter26 /yolo): restore .cps top-of-file post-identifier comment block dropped during v11 refactor — operator at WinMax control needs POST + CONTROL + MACHINE + POSTED identifiers to verify which post generated the program (v11 test.hnc lines 1-12 emit no identifier). PURE LIB: scripts/lib/v11-post-identifier-banner.mjs — BANNER_DELIMITER + UNKNOWN_PLACEHOLDER + sanitizeBannerValue (null/empty/non-printable/parens-strip safety, ASCII 32..126 only) + renderPostIdentifierBanner (6-line block) + renderV11HurcoBanner (shipping default: PRISM HURCO VM30i ENHANCED v11 / WinMax ISNC/BNC Compatible / HURCO VM30i 3-Axis VMC) + bannerLines + isValidBannerOutput round-trip self-check. Pure renderer ships now; .cps onOpen wire-up follow-up iter. TESTS: 33/33 concrete-value PASS (2 const + 9 sanitize + 7 line-by-line render + 3 default-arg + 5 shipping default + 7 round-trip incl broken-delimiter rejection). ENVELOPE: iter26, unit 5 of 135. Next: U-V11-AGGRESSIVENESS-RENAME-SHIM.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-V11-WINMAX-COMMENT-RESTORE (slot:echo /loop iter26 /yolo): restore .cps top-of-file post-identifier comment block dropped during v11 refactor — operator at WinMax control needs POST + CONTROL + MACHINE + POSTED identifiers to verify which post generated the program (v11 test.hnc lines 1-12 emit no identifier). PURE LIB: scripts/lib/v11-post-identifier-banner.mjs — BANNER_DELIMITER + UNKNOWN_PLACEHOLDER + sanitizeBannerValue (null/empty/non-printable/parens-strip safety, ASCII 32..126 only) + renderPostIdentifierBanner (6-line block) + renderV11HurcoBanner (shipping default: PRISM HURCO VM30i ENHANCED v11 / WinMax ISNC/BNC Compatible / HURCO VM30i 3-Axis VMC) + bannerLines + isValidBannerOutput round-trip self-check. Pure renderer ships now; .cps onOpen wire-up follow-up iter. TESTS: 33/33 concrete-value PASS (2 const + 9 sanitize + 7 line-by-line render + 3 default-arg + 5 shipping default + 7 round-trip incl broken-delimiter rejection). ENVELOPE: iter26, unit 5 of 135. Next: U-V11-AGGRESSIVENESS-RENAME-SHIM.
```

## Files touched (3)
- scripts/lib/v11-post-identifier-banner.mjs      |  88 ++++++++++++++
- scripts/lib/v11-post-identifier-banner.test.mjs | 154 ++++++++++++++++++++++++
- 2 files changed, 242 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c2cf533ef887`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
# TOOL-LIBRARIES/U-FUSION-INCH-GENERAL — [MAIN-FORCE] [TOOL-LIBRARIES]/U-FUSION-INCH-GENERAL (slot:romeo): general Fusion .tools mm->inch converter (geometry LB/SIG + feed v_c/f_z) -> last mm lib PRISM_UPSET_H13 now inches (Local/ 45 inches, 0 mm)

**Commit:** `aad757c366f4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T18:01:22-05:00
**Tags:** tool-libraries, u-fusion-inch-general, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-FUSION-INCH-GENERAL (slot:romeo): general Fusion .tools mm->inch converter (geometry LB/SIG + feed v_c/f_z) -> last mm lib PRISM_UPSET_H13 now inches (Local/ 45 inches, 0 mm)

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-FUSION-INCH-GENERAL (slot:romeo): general Fusion .tools mm->inch converter (geometry LB/SIG + feed v_c/f_z) -> last mm lib PRISM_UPSET_H13 now inches (Local/ 45 inches, 0 mm)

Closes the units initiative: PRISM_UPSET_H13 was the 1 remaining mm Fusion lib (5-tool H13 face-mill set, not built by me, with unclassified geometry keys + rich feeds). Verified every field unit corpus-wide (81 .tools) before converting -- a mis-classified field is a 25.4x scrap/tool-break risk.

Classification (verified vs the inch crib reference + machining identity v_f=n*f_z*NOF + repo PRISM.cps tool.bodyLength):
- geometry: LB=body length (/25.4); SIG=drill point angle 90-140deg (UNCHANGED, present in 26 libs); HAND=handedness bool (UNCHANGED); TP=0 corpus-wide -> UNVERIFIED, left unchanged + FAIL-LOUD guard if ever non-zero.
- feeds: f_n/f_z/v_f*/f_ramp/stepdown/stepover = length-rate (/25.4); v_c = SURFACE SPEED m/min->SFM (xFT_PER_M 3.280839895, NOT 1/25.4 -- 459 SFM/3.28=140 m/min, the /25.4 + x25.4 alts are physically absurd); n/n_ramp(rpm)/ramp-angle = unchanged.

- tool-unit-convert.mjs: +LB/SIG/HAND classification, UNVERIFIED_GEOMETRY_KEYS (TP) w/ non-zero fail-loud guard, convertPresetMmToInch general feed converter (fail-loud on any unclassified feed field). 31 tests.
- convert-fusion-tools-to-inch.mjs (NEW): general single-file converter; refuses any lib with an unclassified geometry/feed field; atomic write. 6 tests.

VALIDATED live: PRISM_UPSET_H13 5/5 tools -> inches, physically-sound (face mill v_c 412 SFM / f_z 0.0047in/tooth for carbide-in-H13; drill SIG=140 preserved). Fusion Local/ now 45 inches, 0 mm. 120 checks pass. Already-shipped brand/JM_Milling conversions unaffected (no SIG/LB/TP/HAND there).
```

## Files touched (5)
- scripts/convert-fusion-tools-to-inch.mjs      | 88 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/convert-fusion-tools-to-inch.test.mjs | 62 +++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/tool-unit-convert.mjs             | 73 ++++++++++++++++++++++++++++++++++++++++++++++++-------
- scripts/lib/tool-unit-convert.test.mjs        | 70 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 285 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show aad757c366f4`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
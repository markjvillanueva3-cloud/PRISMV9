# WEDM-PHASE-A/U-WMD-MODEL-NUM-REGEX-TIGHTEN — [MAIN] [WEDM-PHASE-A]/U-WMD-MODEL-NUM-REGEX-TIGHTEN (slot:charlie iter45): drop ambiguous single-letter prefix from MACHINE_MODEL_NUM_RE; binary garbage '|?Z)u8)K' on 0137471 no longer false-positives. Pre-fix regex: /(FA|MV|AQ|U|UPM|SX|SF|CX)[s-]?d{1,4}[A-Z]?/ matched the 'u8' substring in binary noise via the U+8 alternative. Post-fix: /(FA|MV|AQ|UPM|SX|SF|CX|ROBO|AC)[s-]?d{2,5}[A-Z]{0,2}/ - dropped single-letter U prefix (real Mitsubishi/Sodick/Fanuc model codes all have 2+ letters: FA10S, MV1200R, AQ400LS, etc), widened digit count 1-4 to 2-5 for full model nomenclature, allowed 0-2 trailing letter chars for suffix codes. Added ROBO (Fanuc Robocut) and AC (Agie Charmilles) prefixes for completeness. Re-run on 3 samples: model_nums went from {af102-05:0, 0137471:1, 12270_gage:0} to {0,0,0}. Now correctly shows 0 false positives across the zero-wmd sample, consistent with iter-44 structural finding that these 18 manifests are default-machine-def projects. Files: scripts/wedm-mcx-zero-wmd-investigate.mjs (regex line + comment) + state/shared/wedm-mcx-zero-wmd-investigation.json (regen). Memory: reference_phase_a_3iter_progression_2026_05_23.

**Commit:** `fe4af8d4a9b6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T03:00:17-05:00
**Tags:** wedm-phase-a, u-wmd-model-num-regex-tighten, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-WMD-MODEL-NUM-REGEX-TIGHTEN (slot:charlie iter45): drop ambiguous single-letter prefix from MACHINE_MODEL_NUM_RE; binary garbage '|?Z)u8)K' on 0137471 no longer false-positives. Pre-fix regex: /(FA|MV|AQ|U|UPM|SX|SF|CX)[s-]?d{1,4}[A-Z]?/ matched the 'u8' substring in binary noise via the U+8 alternative. Post-fix: /(FA|MV|AQ|UPM|SX|SF|CX|ROBO|AC)[s-]?d{2,5}[A-Z]{0,2}/ - dropped single-letter U prefix (real Mitsubishi/Sodick/Fanuc model codes all have 2+ letters: FA10S, MV1200R, AQ400LS, etc), widened digit count 1-4 to 2-5 for full model nomenclature, allowed 0-2 trailing letter chars for suffix codes. Added ROBO (Fanuc Robocut) and AC (Agie Charmilles) prefixes for completeness. Re-run on 3 samples: model_nums went from {af102-05:0, 0137471:1, 12270_gage:0} to {0,0,0}. Now correctly shows 0 false positives across the zero-wmd sample, consistent with iter-44 structural finding that these 18 manifests are default-machine-def projects. Files: scripts/wedm-mcx-zero-wmd-investigate.mjs (regex line + comment) + state/shared/wedm-mcx-zero-wmd-investigation.json (regen). Memory: reference_phase_a_3iter_progression_2026_05_23.

## Body
```
[MAIN] [WEDM-PHASE-A]/U-WMD-MODEL-NUM-REGEX-TIGHTEN (slot:charlie iter45): drop ambiguous single-letter prefix from MACHINE_MODEL_NUM_RE; binary garbage '|?Z)u8)K' on 0137471 no longer false-positives. Pre-fix regex: /(FA|MV|AQ|U|UPM|SX|SF|CX)[s-]?d{1,4}[A-Z]?/ matched the 'u8' substring in binary noise via the U+8 alternative. Post-fix: /(FA|MV|AQ|UPM|SX|SF|CX|ROBO|AC)[s-]?d{2,5}[A-Z]{0,2}/ - dropped single-letter U prefix (real Mitsubishi/Sodick/Fanuc model codes all have 2+ letters: FA10S, MV1200R, AQ400LS, etc), widened digit count 1-4 to 2-5 for full model nomenclature, allowed 0-2 trailing letter chars for suffix codes. Added ROBO (Fanuc Robocut) and AC (Agie Charmilles) prefixes for completeness. Re-run on 3 samples: model_nums went from {af102-05:0, 0137471:1, 12270_gage:0} to {0,0,0}. Now correctly shows 0 false positives across the zero-wmd sample, consistent with iter-44 structural finding that these 18 manifests are default-machine-def projects. Files: scripts/wedm-mcx-zero-wmd-investigate.mjs (regex line + comment) + state/shared/wedm-mcx-zero-wmd-investigation.json (regen). Memory: reference_phase_a_3iter_progression_2026_05_23.
```

## Files touched (3)
- scripts/wedm-mcx-zero-wmd-investigate.mjs         | 8 +++++++-
- state/shared/wedm-mcx-zero-wmd-investigation.json | 8 +++-----
- 2 files changed, 10 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fe4af8d4a9b6`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
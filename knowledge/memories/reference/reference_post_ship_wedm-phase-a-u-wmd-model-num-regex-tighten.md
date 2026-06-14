---
name: reference_post_ship_wedm-phase-a-u-wmd-model-num-regex-tighten
description: Auto-distilled learnings from shipping WEDM-PHASE-A/U-WMD-MODEL-NUM-REGEX-TIGHTEN (commit fe4af8d4a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.834Z
aliases: reference_post_ship_wedm-phase-a-u-wmd-model-num-regex-tighten
---


# WEDM-PHASE-A/U-WMD-MODEL-NUM-REGEX-TIGHTEN

[MAIN] [WEDM-PHASE-A]/U-WMD-MODEL-NUM-REGEX-TIGHTEN (slot:charlie iter45): drop ambiguous single-letter prefix from MACHINE_MODEL_NUM_RE; binary garbage '|?Z)u8)K' on 0137471 no longer false-positives. Pre-fix regex: /(FA|MV|AQ|U|UPM|SX|SF|CX)[s-]?d{1,4}[A-Z]?/ matched the 'u8' substring in binary noise via the U+8 alternative. Post-fix: /(FA|MV|AQ|UPM|SX|SF|CX|ROBO|AC)[s-]?d{2,5}[A-Z]{0,2}/ - dropped single-letter U prefix (real Mitsubishi/Sodick/Fanuc model codes all have 2+ letters: FA10S, MV1200R, AQ400LS, etc), widened digit count 1-4 to 2-5 for full model nomenclature, allowed 0-2 trailing letter chars for suffix codes. Added ROBO (Fanuc Robocut) and AC (Agie Charmilles) prefixes for completeness. Re-run on 3 samples: model_nums went from {af102-05:0, 0137471:1, 12270_gage:0} to {0,0,0}. Now correctly shows 0 false positives across the zero-wmd sample, consistent with iter-44 structural finding that these 18 manifests are default-machine-def projects. Files: scripts/wedm-mcx-zero-wmd-investigate.mjs (regex line + comment) + state/shared/wedm-mcx-zero-wmd-investigation.json (regen). Memory: reference_phase_a_3iter_progression_2026_05_23.

**Shipped:** 2026-05-23T03:00:17-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[wedm-phase-a-u-wmd-model-num-regex-tighten]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._
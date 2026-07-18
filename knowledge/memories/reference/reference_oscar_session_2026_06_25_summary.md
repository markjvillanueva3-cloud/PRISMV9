---
name: reference_oscar_session_2026_06_25_summary
description: "Oscar/SFC session summary (2026-06-25): 12 scrutinized [MAIN-FORCE] units + 8 verified findings across priorities 1-4. SFC Vc-cap accuracy/safety theme + JM-accuracy artifact (css+feed) + synthetic sweep validated + india ledger made fz-complete. Stopped at RED budget 0.91. Queued for fresh context: full-mode ~69K sweep (#16), summary-fz-by-mode split (#17), india training on the ledger."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.694Z
aliases: reference_oscar_session_2026_06_25_summary
---


**Oscar/SFC session 2026-06-25 -- one-read orientation.** 12 scrutinized `[MAIN-FORCE] slot:oscar` units +
8 verified findings; stopped at RED budget (0.91). Read the handoff
`HANDOFF-claude-efd1e0c2-oscar-sfc-vc-uncappe.md` for the live resume.

**Units (commits):** VC-CAP-NOT-A-BUG `e877a6956d` · VC-UNCAPPED-PARITY `56648c0fd1` ·
RIGIDITY-CAP-REAPPLY `511b9f89be` (safety: re-cap rpm after rigidity) · PARITY-VERDICT-UNCAPPED
`d405d1bb19` · PROVEN-SFM-DIAGNOSTIC `c0bdb0e423` · TEST15-ALU-COVERAGE `7de7f110e1` (pre-existing test
fixed) · JM-PROVEN-TRUST-POLICY `ad8dee9a93` · JM-PROVEN-FEED-SURFACE `ac6045a525` · FEED-VERDICT
`74abff859f` · FEED-VERDICT-AGG `bcd9a6e858` · JM-DATASET-EXPORT `2dea43bb33` · SWEEP-LEDGER-FZ
`3bd4ecc4ad`.

**Findings (memories):** the aluminum "3.5x under-prediction" is an RPM-cap artifact NOT a bug
([[reference_oscar_sfc_n_alu_rpm_cap_not_a_bug_2026_06_25]]); proven-css SFM is mitigated-not-dangerous
([[reference_oscar_proven_css_sfm_mitigated_not_dangerous_2026_06_25]]); JM units VERIFIED css=SFM(*0.3048)
feed=IPR(*25.4) from raw NC; JM trust = test-baseline-not-trusted (operator); JM accuracy = 100%
speed-conservative + feed-reasonable ([[reference_oscar_jm_accuracy_validation_result_2026_06_25]]);
synthetic sweep validated PRISM conservative-SAFE + fz +124.7% is a mode-aggregation artifact NOT a bug
([[reference_oscar_full_sweep_validated_2026_06_25]]).

**Priorities 1-4 covered (bounded):** (1) in-flight done; (2) optimize_for wired; (3a) PRISM vs ALL JM
parts validated (css+feed); (3b) synthetic full-sweep validated (prod 576 cells); (4) india ledger
fz-complete. **Queued (fresh context):** full-mode ~69K sweep (task #16), summary-fz-by-mode (task #17),
india trains on the ledger.

**Doctrine reinforced this session:** a clamp output is not a model output (don't call a capped value an
under-prediction); compare like-for-like in vendor/JM parity (capped-vs-uncapped, mode-vs-mode); units-first
= verify from source, never guess (css/feed verified from `JM DIE/CNC LATHE/*.MIN`); amateur shop data is the
GUIDELINE to test against, not a trusted recommendation input.

---
name: feedback_regex_token_direction_blindspot
description: "A token-matching regex catches only ONE direction (tr\\d not \\dtr) — and a wrong result at the HIGHEST trust tier is P0, not \"acceptable because a downstream verify-flag exists.\""
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.441Z
aliases: feedback_regex_token_direction_blindspot
---


# Two-part lesson: regex token direction + don't rationalize away a high-trust wrong result

**The bug (CIMCO machine-map, 2026-06-02).** `axisHints` classified 5-axis trunnion machines with `/...|tr\d|.../`. That matches `TR210` (digit-AFTER-tr) but NOT `VF-2TR` (digit-BEFORE-tr). So the Haas VF-2TR 5-axis trunnion was mis-classified as 3-axis, got the axis-match bonus, and **won the `native-cimco-match` (highest-trust) slot for the plain 3-axis Haas VF-2** — a 3-axis→5-axis wrong-kinematics map that would have the operator simulate a 3-axis program on a 5-axis trunnion. Fix: `\btr\d|\dtr\b` (both directions) + a 3↔5-axis class regression-lock test.

**Nugget 1 — regex token matching is directional.** When a token can appear as `X<digit>` OR `<digit>X` (suffixes, model codes, trunnion/rotary tags), match BOTH or you have a silent blind spot on half the inputs. The unit tests passed because they only used the matched direction.

**Nugget 2 (the bigger one) — a wrong result at the HIGHEST trust tier is a P0, NOT "acceptable because mustVerify/a-downstream-flag exists."** I *saw* this exact risk while building ("VF-2TR is a trunnion; my regex misses 2tr") and rationalized it away: "acceptable, mustVerifyKinematics flags it." An adversarial workflow reviewer correctly escalated it to P0. The whole point of a `native-match` / high-confidence tier is to REDUCE manual verification — so a wrong answer *at that tier* defeats the purpose and is maximally dangerous (the human trusts it most). A downstream "please verify" flag does not neutralize a confident wrong answer; people skip flags on high-confidence results.

**How to apply:**
1. Match both token directions; test the one your happy-path didn't.
2. When you catch yourself thinking "it's wrong but a flag/verify-step covers it" for a SAFETY or HIGH-TRUST output — that's a P0 to fix, not a P2 to defer. Surface it, don't average it (R7), don't rationalize it (R12).
3. Adversarial review (a skeptic told to FIND the wrong-result) catches what self-review rationalizes. Use it for any safety-tier classifier.

Caught by the `cimco-post-proof-fleet` Workflow. See [[reference_cimco_jm_machine_map_2026_06_02]] + [[feedback_port_gate_operator_byte_faithful]] (sibling fail-open lesson, same session).

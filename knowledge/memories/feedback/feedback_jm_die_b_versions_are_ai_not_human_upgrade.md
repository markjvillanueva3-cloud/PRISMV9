---
name: feedback-jm-die-b-versions-are-ai-not-human-upgrade
description: STANDING RULE — JM-Die A/B program pairs are NOT human-original-vs-human-upgraded. The B-versions in JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/<machine>/ are AI-generated from a prior PRISM JM-Die Lathe Upgrade v2.0.0 pass. This changes what AB-locator pairs MEAN.
type: feedback
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.431Z
aliases: feedback_jm_die_b_versions_are_ai_not_human_upgrade
---


# JM-Die B-versions are AI-upgraded, not human-upgraded

## What I observed (iter146)

Running the wizard validator on a real A/B pair from `JM DIE/CNC LATHE/ALCOA/`:
- A-version `A0137471.MIN`: 1081 chars / 93 lines (Mazak EIA dialect)
- B-version `PRISM_UPGRADED/Okuma_LB-3000EX/A0137471.nc`: 6115 chars / 205 lines

The B-version header explicitly says:
```
(=== PRISM JM-Die Lathe Upgrade v2.0.0 ===)
(  source: H:\PRISM\JM DIE\CNC LATHE\ALCOA\PRISM_UPGRADED\Okuma_Multus_B250II\A0137471.nc)
(  partNumber: A0137471)
(  machineId: LTH-04)
(  machineModel: Okuma_LB-3000EX)
```

These are **PRISM-AI-generated upgrades**, not human-operator upgrades.

## Why this matters

The iter109 AB-version-locator design memo assumed:
> A version = original amateur program; B version = human-improved version (the operator's earlier upgrade pass)

That assumption is **WRONG**. Reality:
- A-version = original program (machinist or older CAM-generated, may have amateur defects)
- B-version = PRISM v2.0.0 upgrade output (AI-generated, may have its own defects)

## How to apply

**Don't treat B-versions as ground-truth human-expert programs.** They're outputs of a prior wizard pass that may itself have flaws — possibly the same flaws the iter6 ALCOA baseline identified (0% insert-coverage etc.).

**The right training pipeline is now:**
```
A (real-production) → Stage 4 REASON → Stage 5 GENERATE → C (current-wizard output)
                                                              ↓
                                                          compare against B (v2.0.0 output)
                                                              ↓
                                                          delta tells us:
                                                          - Where current wizard agrees with v2.0.0 (likely both right)
                                                          - Where current wizard disagrees (one is wrong; operator decides)
                                                          - Where current wizard catches issues v2.0.0 missed (real improvement)
```

The B-version is a **prior baseline to beat**, not a **gold standard to imitate**.

## When this applies

Any time the AB-locator (iter136 implementation) emits a pair from `JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/`. The unpaired-singleton case (no B-version) is unchanged — those are A-only with no prior wizard pass.

## Implication for U-LATHE-AB-VERSION-LOCATOR design memo (iter109)

The design memo's "comparison vector" still holds, but rename:
- `quality_delta { a_score, b_score, delta, levers_engaged }` →
- `quality_delta { a_score, b_score_v2_0_0, c_score_current_wizard, levers_engaged_by_each, where_disagree }`

This adds the current-wizard "C" as a third comparison point, not just A vs B.

## Implication for the dependent units

- [[reference_lathe_training_loop_stages_1_5_design_2026_05_27]] — Stage 4 REASON should consult B-version output as "prior-wizard-recommendation" advisory input, not as the target
- [[reference_lathe_wizard_vendor_lookup_design_2026_05_27]] — selectInsert scoring should NOT use "B-version vendor choice" as a "human-expert chose this" signal; that's circular
- [[reference_lathe_program_quality_rubric_2026_05_27]] — when scoring a B-version program, don't grade it more leniently because "it's the upgrade"; score it on the same rubric

## Where this came from

Iter146 ran `parseBlocks + validateThreading` against both A-version `.MIN` and B-version `.nc` files. Both ran cleanly. The B-version's header comment revealed the v2.0.0 attribution; without reading those header lines, the assumption "B is human-upgraded" would have persisted.

R12 lesson: **always read the first 5 lines of any file you're about to grade as ground-truth**. Comments at the top of a generated file often disclose what generated it.

## Related

- [[reference_lathe_ab_version_locator_design_2026_05_27]] — design memo whose assumption this corrects
- [[reference_whiskey_lathe_session_close_iter143_2026_05_27]] — session-state where this was still assumed wrong
- [[feedback_verify_actual_contract_not_proxy]] — same doctrine, applied here

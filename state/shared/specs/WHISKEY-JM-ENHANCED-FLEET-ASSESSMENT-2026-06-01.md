# JM Die "enhanced" lathe programs — FLEET-SCALE assessment (workflow, 2026-06-01)

**Operator question (goal):** *"we also generated 'enhanced versions' of all current jm programs for lathe. use workflow to assess all the programs to determine if we really did generate proper programs."*

**Method (honors "use workflow"):** multi-agent `Workflow` `jm-lathe-enhanced-assessment` (run `wf_fbb1a317-df6`, 17 agents, 461s). Scout-inline → fan out **one agent per customer batch** (each runs the deterministic 8-gotcha A/B assessor `scripts/lathe-program-assessor.mjs --scan <customer> --upgraded-only --json` — bounded per-customer walk, NO 24k-file archive walk inside the workflow) → JS-deterministic fleet totals → synthesis. This is the fleet-scale successor to the earlier in-session 113-pair script run.

## Result — 5,341 A/B pairs, 118 customers (15/15 batches)

| Metric | Fleet value | Meaning |
|---|---|---|
| **PROPER (lint-clean, 0 ERROR gotchas)** | **5,287 / 5,341 = 99.0%** | safe to run at population level… |
| ERROR-carrying (must gate) | **54 (1.0%)** | …but NOT 100% — AKKO 96/100, ARCHER 98/100, CFC 17/19, CHOCTAW 54/56, HI-PERFORMANCE 14/16, ELITE 98/100, AGRATI 59/60, ATF 99/100, EJOT 98/100 carry residual ERROR gotchas → gate, do not run unreviewed |
| **annotation-passthrough** (B machining == A) | **4,307 = 80.6%** | "enhancement" is cosmetic (comments/headers only) |
| **machining genuinely changed** A→B | **1,034 = 19.4%** | real toolpath/parameter change |
| dominant defects | `feed-mode-undeclared` (all 15 batches, ~110/118 customers), `feed-mode-mixed`, `partoff-no-peck`, `css-no-rpm-cap` (6 batches) | |

## Key findings (R12)

1. **Corrects the earlier 113-pair finding.** The in-session sample (ALCOA/ACME/ITW) reported "100% proper, ~0% improved." At fleet scale it is **99.0% proper** (54 fail) and **19.4% genuinely re-machined** (not 0%). The earlier sample was biased toward passthrough-heavy customers.
2. **The improvement is COHORT-SPLIT, not uniform.** Early-alphabet customers (ACME, AEROTECH, AGRATI, AIR, AJ, AKKO, ALCOA, ALLFAST, ALLSTAR, AMGLO, ANDERSON, ARCHER, ARCONIC, ATF, BELVIDERE, BIRMINGHAM, BRAINARD RIVET — `passthru=0`) received **genuine machining changes**; BRICO-onward (~99 customers, `passthru≈pairCount`) received **annotation-only passthrough**. The transition falls mid-alphabet (around "B"), strongly implying **two different upgrade runs/methods** applied to different customer cohorts. ITW = 99% passthrough — matches the earlier sample exactly.
3. **The single dominant defect is `feed-mode-undeclared`** (turning programs that never declare G95 per-rev vs G94 per-min). The one highest-leverage fix: **emit an explicit feed-mode declaration at every program head + after every mode-changing block, plus a G50 spindle cap paired with every G96 CSS** (the `css-no-rpm-cap` defect, 6 batches).
4. **PRISM generation already fixes the #1 defect.** The U-CL5 (lightweight) and U-CL7 (production `LathePrintProgramEmitterEngine`) emitters bake in exactly `G95` + `G50 S<max>` before `G96` by construction — so PRISM-generated programs are **genuinely better than the historical "enhanced" programs** on the dominant fleet defect, not merely re-annotated. This closes the loop: the assessment names the defect, the generator removes it, the closed-loop test (U-CL4/U-CL6) proves the result PROPER.

## Caveats
- `--limit 100` per customer caps pairs assessed for the largest customers (AIR/AJ/ANDERSON/CSM/etc. show `pairs=100` = capped, not total). The 5,341 is a representative fleet sample, not the full 14,475-pair archive count; the rates are stable across 118 customers.
- Verdict prose + full per-customer table: workflow run `wf_fbb1a317-df6` result. Memory: [[reference_whiskey_jm_enhanced_program_assessment_2026_06_01]].

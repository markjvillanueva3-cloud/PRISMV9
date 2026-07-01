---
source: project
section: VERIFICATION PIPELINE — four tiers, never skip levels
slug: verification-pipeline-four-tiers-never-skip-levels
indexed_at: 2026-04-30T17:24:08.875Z
---

## VERIFICATION PIPELINE — four tiers, never skip levels

| Tier | Ω(x) | S(x) | Gate Action | Fires Before |
|------|------|------|-------------|--------------|
| **sim** | ≥0.50 | ≥0.70 | `prism_omega:auto_score` + `prism_toolpath:simulate` | Any new toolpath/post output |
| **proven_out** | ≥0.70 | ≥0.70 | `prism_proven_pipeline:proven_prove_out` | `git commit` of physics/CAM code |
| **production** | ≥0.85 | ≥0.90 | `prism_validate:prediction_validate` + Cpk≥1.33 | `dnc_send`, quote sign-off |
| **shop_floor** | ≥0.95 | ≥0.98 | `prism_quality:fai_run` (PASSED disposition) | First chip, customer ship |

**Promotion:** sim → proven_out (3 clean outcomes OR similarity≥0.85 to existing recipe) → production (Cpk gate + bias-corrected) → shop_floor (FAI + scrutiny ledger entry citing all prior tiers).

**S(x)<0.70 at any tier → BLOCKED**, drop to sim, fix, re-climb. Tiers expire 7 days OR on constants/registry edit (force re-score).

**Implementation status:** `omegaDispatcher.ts` currently inlines flat thresholds (RELEASE=0.70, ACCEPTABLE=0.65, WARNING=0.50, SAFETY_MIN=0.70); the 4-tier ladder above + `state/shared/omega-thresholds.json` are aspirational — tier-promotion actions (`tier_check`, `tier_promote`, `evidence_chain`) don't exist yet. Treat as the target shape; for live behavior, fall back to `auto_score` + `proven_record_outcome` + manual gate decisions.

**Auto-score triggers:** after engine/dispatcher edit, after toolpath generation, before `/handoff`, on user words "ship/release/deploy/production/customer".

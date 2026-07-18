## MASTER EQUATION — Ω(x) Quality Score
Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L

### Components
- R (Reliability, 25%): Anti-regression passing, error rate low, consistent results
- C (Completeness, 20%): No placeholders, all fields populated, all paths covered
- P (Performance, 15%): Response time acceptable, cache hit rate, diff efficiency
- S (Safety, 30%): S(x) score from validation gates, physics model accuracy
- L (Learnability, 10%): Pattern detection working, knowledge retained, errors learned

### Thresholds
| Score | Status | Action |
|-------|--------|--------|
| ≥0.70 | RELEASE | Ready for production use |
| 0.65-0.69 | ACCEPTABLE | Usable with known limitations |
| 0.50-0.64 | WARNING | Needs improvement before release |
| <0.40 | BLOCKED | Cannot proceed. Fix critical issues. |

### HARD CONSTRAINT: S(x) < 0.70 = BLOCKED regardless of Ω
Even if Ω=0.90, if the safety component fails, the output is blocked.

### How to Compute
```
prism_omega action=compute params={content: "description of what to score"}
```
Returns: Ω score, component breakdown, threshold status, recommendations.

### When to Use
- After Ralph loop completes (to get official release score)
- Before declaring a feature "done"
- During milestone reviews
- NOT for quick checks (use prism_validate→safety instead)

## Changelog
- 2026-02-10: v3.0 — Content-optimized. Added threshold table, usage guidance, hard constraint callout.
- 2026-02-10: v2.0 — File-based. Added component descriptions.

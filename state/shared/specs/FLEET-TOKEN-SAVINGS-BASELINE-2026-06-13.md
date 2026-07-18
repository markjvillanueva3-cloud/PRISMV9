# Fleet Token-Savings Baseline — 2026-06-13 (slot:alpha)

> **Completes the open alpha thread** flagged in `knowledge/memories/patterns/token-optimization_synthesis.md` §Open threads:
> *"the measurement script exists, a consolidated baseline across all 34 galaxies has not yet been published; operators need to aggregate results and identify outliers."*
> Source: `node scripts/measure-fleet-token-savings.mjs` (MEMORY-WIKI-OPTIMIZATION-MS0/U-MWO09) — a dormant build, activated 2026-06-13. Re-run any time to refresh.

## Measured eager-load surfaces (per-session, every turn)

| Surface | Baseline (pre-opt) | Current | Saved | % | ~Tokens |
|---------|-------------------:|--------:|------:|---:|--------:|
| **project-CLAUDE.md** | 74,500 | **103,330** | **-28,830** | **0.0%** | **-7,207** |
| user-CLAUDE.md | 25,800 | 24,920 | 880 | 3.4% | +220 |
| RTK.md | 4,400 | 993 | 3,407 | 77.4% | +852 |
| auto-memory MEMORY.md | 24,400 | 22,191 | 2,209 | 9.1% | +552 |
| **TOTAL** | **129,100** | **151,434** | **-22,334** | **0.0%** | **-5,583** |

Target ≥80% reduction — **NOT met (fleet is net-negative).**

## Outlier (actionable, alpha-owned)

**`H:/prism/CLAUDE.md` is the sole regression and the dominant cost.** It has grown **+38.7%** past its own pre-optimization baseline (74.5K → 103.3K chars), single-handedly flipping the fleet eager-load total negative. This contradicts CLAUDE.md's own stated rule (*"past ~200 lines total, CLAUDE.md compliance collapses"* — it is now ~1,000+ lines). Every session pays this every turn.

The other three surfaces are healthy: RTK.md (77% reduced), MEMORY.md (9%), user-CLAUDE.md (3%) — all positive. The optimization effort worked everywhere **except** the project CLAUDE.md, which has accreted milestone summaries faster than it has been pruned.

## Recommendation (follow-up — a careful, separate task)

Trim `H:/prism/CLAUDE.md` back toward the doctrine-pointer-index target it prescribes for itself: move shipped-milestone prose to `state/shared/CLAUDE-MD-COMMIT-LOG-ARCHIVE.md` / per-MS wiki entries (the pattern already used for the recent-commits log + recent-regressions archive), keeping only pointers in the live file. Estimated recoverable: ~30K chars (~7.5K tokens/turn). **Do this as a deliberate pass with per-section review** — CLAUDE.md is canonical doctrine; trimming the wrong section loses load-bearing rules. Re-run `measure-fleet-token-savings.mjs` after to confirm the surface goes positive.

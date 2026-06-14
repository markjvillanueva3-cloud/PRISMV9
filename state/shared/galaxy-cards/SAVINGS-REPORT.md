# 💰 Galaxy Context Federation — Savings Telemetry

> Capstone roll-up (GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-SAVINGS-TELEMETRY). Generated 2026-06-01T17:36:46.597Z.
> Three HONEST categories — structural per-inject potential, cumulative realized, one-time saveable. Estimated (bytes/4), not asserted.
> Regenerate: `node scripts/galaxy-savings.mjs build`. Disable: PRISM_GCF_SAVINGS_DISABLE=1.

## 1. Per-inject potential — UNREALIZED capacity (accrues only when a consumer injects the card/digest in place of the brain)
_card-vs-brain and digest-vs-all-brains are ALTERNATIVE strategies (both replace re-reading the same brains) — NOT additive._
- card-vs-brain: **~44770 tok** across 34 galaxies (inject a ≤1 KB card vs its full MEMORY.md)
- digest-vs-all-brains: **~51369 tok** (inject the one ranked MASTER-DIGEST vs re-reading all brains)
- **best single-strategy ceiling: ~51369 tok/inject** (the larger of the two — contingent on the inject path being wired)

## 2. Cumulative realized (recall-first nudge savings actually accrued)
- **~0 tok** over 0 nudges — _0: the recall-first PreToolUse hook is golf-pending (HOOK-PATCH-GCF-RECALL-FIRST.md); honestly reported as unrealized, not projected._

## 3. One-time saveable (cross-galaxy dedup, if the advisory is applied)
- **~0 tok** across 1 dup clusters

## Top per-inject card savings (galaxy)
| galaxy | brain tok | card tok | saved/inject |
|--------|----------:|---------:|-------------:|
| quoting | 22535 | 256 | 22279 |
| fleet-hygiene | 2897 | 256 | 2641 |
| database-expansion | 2417 | 256 | 2161 |
| system-viz | 2403 | 256 | 2147 |
| blueprint-vision | 2390 | 256 | 2134 |
| discovery | 2067 | 256 | 1811 |
| post-processor | 2027 | 256 | 1771 |
| ai-training | 1187 | 256 | 931 |

_Missing sidecars (contributed 0): recall — run the corresponding build CLI._

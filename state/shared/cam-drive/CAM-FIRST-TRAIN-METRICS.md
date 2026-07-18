# CAM First Train — proof-of-pipeline metrics (U-CAM-CORPUS-AND-FIRST-TRAIN)

**Date:** 2026-05-31 · **Slot:** kilo · **Status:** proof-of-pipeline (NOT production-grade)

The CAM regression-training pipeline ran end-to-end on a **real JM Die G-code sample** for the first time since the deleted Apr-21 8-sample proof. This is the "training has started" gate of the CAM closed-loop gap-fill.

## UPDATE 2026-05-31 — feed-extraction fix (U-CAM-FEED-EXTRACT-FIX) + the mm/rev finding

The first run's feed model was R²=−32 (garbage). Root cause found in `CAMFeatureExtractorEngine`: (1) the `\bF` regex dropped inline feeds (`Z-1.5F0.15` — no word boundary before F), and (2) **a ~1000× units error** — Okuma lathe feeds under **G95 are mm/REV**, but the raw F value was pushed into a field named `_mm_min`. Fixed: track G94/G95 (feed mode) + G96/G97 (spindle mode); emit mm/min only when determinable (G94 directly, or G95×rpm under G97); **skip — never mislabel — when ambiguous (G96 CSS / unknown mode)**; comment-stripped matching; surface skip counts (R12).

Post-fix metrics (real JM Die G-code): **feed R² flipped −32 → +0.46/+0.62** (units now correct) — but n stays **~6 even across 1,981 programs / 44 customers**. That is the load-bearing finding: **this shop's lathe work is overwhelmingly G96 constant-surface-speed, so `feed_mm_min` is a fundamentally sparse target.** The old model wasn't covering feed — it was inflating n with mislabeled mm/rev values.

**→ The correct feed target for this CSS turning shop is mm/REV, not mm/min.** Follow-up (schema): add `estimated_feed_range_mm_rev` to `FeatureVector` and train the lathe feed model on that (the native unit; densely present under G95/G96). Until then the mm/min feed model is correct-but-thin (n≈6) and must not feed recommendations.

Spindle R² is sample-dependent ≈0.19–0.50 (0.29 at 1,981 vectors) — weak-but-real signal; the current feature set (LOC, tool/op counts, materials, machine, cam_system) is a limited RPM predictor (RPM also depends on diameter + exact material, not all captured). Proof-of-pipeline holds; statistical robustness needs the full ~25K corpus (#10).

---

## UPDATE 2026-06-01 — the n≈6 was largely a BROKEN REGEX, not CSS-sparsity (U-CAM-FEED-PER-REV)

The 2026-05-31 conclusion ("feed n stays ~6 because the shop is G96 CSS, so mm/min is fundamentally sparse") was **incomplete** — a bigger cause was a silent feed-extraction bug. JM Okuma programs write feeds in **leading-dot (`F.002`) and trailing-dot (`F1.`) notation**, and the regex `F(\d+(?:\.\d+)?)` matched **neither** (it requires a leading digit and, if a dot is present, trailing digits). Measured A/B over a 77-file real corpus sample:

| regex | feed-lines captured | files with ≥1 feed |
|---|---|---|
| OLD `F(\d+(?:\.\d+)?)` | 91 | 43 / 77 |
| NEW `F(\d*\.\d+\|\d+\.?)` | **817** (9×) | **77 / 77** |

→ **+726 feed-lines (~9×), +34 files (44% of the sample had ZERO parseable feeds before).** The dominant Okuma feed notation was simply unparseable. Fix shipped in `CAMFeatureExtractorEngine` + 6 regression tests (synthetic G94/G95/G20/G21 + real-corpus coverage).

**Also added** `estimated_feed_range_per_rev` + `feed_per_rev_unit` (in/rev|mm/rev|unknown) — the native CSS-shop target, unit-tagged from G20/G21 so in/rev and mm/rev are never silently mixed (the 25.4× class). Per-rev populates for the explicit-G95 subset (7/77 here; G95 is modal — set once, persists). **Open follow-up (units-first, do NOT assume):** many JM Okuma programs omit G95 and rely on the machine's feed-per-rev default; confirming that default would let per-rev capture the remaining ~70 files. Until confirmed, those feeds are captured-but-skipped (never mislabeled).

---
### Original first-run record (sample 600, pre-feed-fix) — kept for history

## Reproduce
```
node scripts/cam-build-corpus-and-train.mjs --sample 600
# → mcp-server/data/state/{JM_DIE_FEATURE_VECTORS_SAMPLE.json, JM_DIE_ML_SPLITS.json, models/cam-baseline/*}
# (models/ + the data artifacts are gitignored runtime state — regenerate via this runner)
```

## Corpus (real, extracted — no fabrication)
- Source: `H:/PRISM/JM DIE` (34,989 `.MIN` Okuma programs available).
- Sampled 600 programs (evenly strided for diversity) → **593 parsed_ok** (98.8% parse rate via `CAMFeatureExtractorEngine`), 7 parse-skipped.
- **36 distinct customers.** Customer-disjoint split: train=415 / val=89 / test=89. **`no_leakage=true`** (leakage audit passed — no customer in >1 set).

## Held-out (val) metrics — HONEST
| Target | Model | n | MAE | RMSE | R² | Verdict |
|---|---|---|---|---|---|---|
| `spindle_rpm_midpoint` | bayesian_ridge | 89 | 123.2 rpm | 152.5 | **0.50** | ✅ real signal — explains ~half the variance |
| `spindle_rpm_midpoint` | gradient_boost | 89 | 143.6 | 177.2 | 0.32 | ✅ usable |
| `feed_mm_min_midpoint` | bayesian_ridge | 14 | 9.3 | 10.4 | **−32.5** | ❌ unusable — worse than predicting the mean |
| `feed_mm_min_midpoint` | gradient_boost | 14 | 7.7 | 25.2 | **−194** | ❌ unusable |

## Honest read (R12)
- **Spindle RPM is a legitimate proof-of-pipeline model** — R²=0.50 on 89 held-out programs, comfortably better than the Apr-21 8-sample proof (MAE 154). The pipeline (extract → split → train) works end-to-end on real data with proper leakage-safe ML hygiene.
- **The feed model is GARBAGE — do not trust or ship it.** Negative R² with only n=14 val samples: the feed-rate target is sparsely extractable from Okuma `.MIN` programs (most don't expose `feed_mm_min` in a parseable form at the program level). This is a **feature-extraction coverage gap**, not a pipeline bug.

## Next
1. **Feed-extraction fix** — improve `CAMFeatureExtractorEngine` feed-rate parsing for Okuma `.MIN` (F-word/G94-G95 context) so the feed target has real coverage; OR widen the sample so n grows. Until then the feed model must not feed any recommendation.
2. **U-CAM-ML-02 / #10** — scale to the full ~25K-program corpus once feed coverage is fixed.
3. **#4 — arm the live feed** so post-first-train shop-floor outcomes augment the corpus (dual-emit to CrossProcessOutcomeStore + `enableOutcomeObservation()` at bootstrap).

Memory: [[reference_cam_learn_loop_gap_fill_2026_05_31]]. Runner: `scripts/cam-build-corpus-and-train.mjs`.

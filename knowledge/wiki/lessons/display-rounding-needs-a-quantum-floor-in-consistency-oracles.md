# A consistency oracle that re-derives a value from a DISPLAY-ROUNDED field needs a rounding-quantum floor

**Tags:** sfc, oracle, display-rounding, silent-wrong, false-positive, quantum-floor, speed-feed
**Slot:** oscar · **Surfaced:** 2026-06-30 (SFC overnight exhaustive sweep) · **Commit:** `3d62664c69`

## Lesson

When a cross-check **re-derives** quantity B from a published quantity A (`B_expected = f(A_published)`) and compares it to the engine's published B, the published A is often **display-rounded** (e.g. `Math.round` to whole units). At **low absolute A** that rounding quantum is a large *fraction* of A, so `f(A_published)` diverges from the truly-consistent published B by a few percent — a **display-rounding artifact, not a math error**. A flat *relative* tolerance (e.g. 2%) then false-positives exactly on the smallest-magnitude cells.

**Fix:** require BOTH the relative band AND an **absolute rounding-quantum floor** before flagging:
`flag iff rel > tolPct && absDiff > absFloor`, where `absFloor` = the display quantum of A mapped through `f` (+ B's own rounding quantum). The relative band is unchanged, so real multiplicative bugs (2×, 1000×, ×π) still flag; only sub-quantum display rounding is forgiven. The floor is *magnitude-aware* — it shrinks where A is large (tight) and widens where A is small (forgiving), which is exactly the shape of the rounding error.

## Concrete instance (SFC)

The overnight sweep (89.6M cells, 0 real defects) emitted **245,760+ `rpm_inconsistent`** flags at a uniform ~3.13%, all on low-Vc cells (HSS-on-titanium/Inconel, small D). Root cause: `ProductEngine.ts:947-948` rounds published `cutting_speed_m_min` and `spindle_rpm` to integers **independently**; the oracle re-derived `rpm = Vc·1000/(π·D)` from the rounded Vc=7 (internal vc=7.22) → a 3.13% gap over the flat 2% tol. Internal vc↔rpm is exactly consistent. Added `absFloor = ((vcDisplayQuantum/2)·1000)/(π·D) + 0.5` to `checkRpmConsistency` (`scripts/lib/sfc-sweep-oracle.mjs`). Validated: 23/23 tests (incl. a genuine-bug-still-flags case), **4,000 live flagged records all suppressed, 0 false-negatives**, 2-arm scrutiny PASS.

## Sibling instances (same class — display rounding vs a consistency/clamp check)

- **MRR oracle** — `checkMrrConsistency` already had this guard (`absFloor`, one MRR display-quantum); the rpm check was the one per-cell oracle *missing* it. The fix mirrors it (clone-don't-fork).
- **`roundSig` worst-case FLIP** (`UltimateSpeedFeedEngine`, U-OSC-SFC-WORSTCASE-FLIP) — a util field display-rounded `94.67%→90` is NOT a clamp; assert on the un-rounded warning, not the rounded field.

## Generalization

Any oracle / invariant / parity check that consumes a *published* (rounded) value to validate another published value must model the publishing quantum. Prefer re-deriving from the **un-rounded** internal value if available; otherwise add the quantum floor. A flat relative tolerance over rounded low-magnitude data is a false-positive generator.

## Cross-references
- Memory: `reference_oscar_overnight_sweep_triage_2026_06_30`
- Commit: `git -C H:/prism show 3d62664c69`
- Oracle: `scripts/lib/sfc-sweep-oracle.mjs` (`checkRpmConsistency`, `checkMrrConsistency`)
- Related vendor-parity cap-artifact lesson: `aluminum-capped-vendor-surface-speed-is-not-a-physics-bug` (U-OSC-VC-CAP-NOT-A-BUG) — a sibling "looks-wrong-but-isn't" diagnostic on the same overnight data.

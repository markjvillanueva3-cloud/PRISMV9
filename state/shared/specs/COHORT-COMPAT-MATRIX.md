# Cohort Compatibility Matrix (Stage 2 of lego-stacking plan)

**Generated:** 2026-05-25T03:51:26.528Z
**Source:** `state\shared\specs\PRISM-COHORTS.json` — 12 cohorts, 3,501 engines
**Scoring:** {"domain":0.4,"shape":0.3,"importStyle":0.15,"vintage":0.15} weights · 77 domain tokens · 25 shape suffixes

> **Advisory only.** Heuristic scores; every bridge candidate must be human-verified before Stage 3 shim implementation.

## Cohort profiles

| Cohort | Engines | Era | Top domain | Top shape | Import style |
|---|---:|---|---|---|---|
| esm-js (current — NodeNext convention) | 1396 | currentESM | Agent(4) | Engine(28) | esm-js |
| mtime-q1 (no header signals) | 749 | earlyESM | Spindle(1) | Engine(30) | unknown |
| esm-plain (pre-NodeNext .js suffix) | 476 | earlyESM | Cam(2) | Engine(29) | esm-plain |
| mtime-q2 (no header signals) | 312 | earlyESM | Cam(8) | Engine(23) | unknown |
| mtime-q3 (no header signals) | 307 | earlyESM | Cad(17) | Engine(28) | unknown |
| mtime-q4 (no header signals) | 200 | earlyESM | Cad(17) | Engine(29) | unknown |
| iter19-23 (JM-Die-page era, 2026-05-24) | 20 | currentESM | Material(2) | Engine(20) | unknown |
| iter<12 (pre-slot-worktree, early 2026-05) | 18 | earlyESM | Shop(2) | Engine(18) | unknown |
| deprecated | 8 | deprecated | Cost(2) | Engine(8) | unknown |
| iter12-18 (slot-worktree+SLOT-RECLAIM, mid-2026-05) | 7 | currentESM | Mill(1) | Engine(7) | unknown |
| cjs-era (pre-ESM migration) | 7 | preESM | Cost(2) | Engine(6) | cjs |
| iter24+ (generic-bridge era, 2026-05-24) | 1 | currentESM | Knowledge(1) | Engine(1) | esm-js |

## Compatibility heat-map (12×12, total score)

Rows = source cohort, columns = target cohort. Cell = `score (cost-class)`.
Cost classes: **LOW** = drop-in · **MED** = shim worth shipping · **HIGH** = full rewrite.

| from \ to | esm | mtime | esm | mtime | mtime | mtime | iter19 | iter<12 | deprecat | iter12 | cjs | iter24+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **esm** | — | 0.47 HI | 0.58 MD | 0.47 HI | 0.51 HI | 0.50 HI | 0.49 HI | 0.41 HI | 0.23 HI | 0.31 HI | 0.24 HI | 0.31 HI |
| **mtime** | 0.47 HI | — | 0.52 HI | 0.49 HI | 0.53 HI | 0.54 HI | 0.44 HI | 0.44 HI | 0.21 HI | 0.32 HI | 0.20 HI | 0.20 HI |
| **esm** | 0.58 MD | 0.52 HI | — | 0.55 MD | 0.59 MD | 0.58 MD | 0.41 HI | 0.45 HI | 0.21 HI | 0.28 HI | 0.25 HI | 0.24 HI |
| **mtime** | 0.47 HI | 0.49 HI | 0.55 MD | — | 0.54 HI | 0.52 HI | 0.47 HI | 0.53 HI | 0.24 HI | 0.29 HI | 0.26 HI | 0.20 HI |
| **mtime** | 0.51 HI | 0.53 HI | 0.59 MD | 0.54 HI | — | 0.79 MD | 0.41 HI | 0.46 HI | 0.22 HI | 0.27 HI | 0.25 HI | 0.20 HI |
| **mtime** | 0.50 HI | 0.54 HI | 0.58 MD | 0.52 HI | 0.79 MD | — | 0.40 HI | 0.45 HI | 0.21 HI | 0.27 HI | 0.22 HI | 0.20 HI |
| **iter19** | 0.49 HI | 0.44 HI | 0.41 HI | 0.47 HI | 0.41 HI | 0.40 HI | — | 0.51 HI | 0.28 HI | 0.34 HI | 0.22 HI | 0.25 HI |
| **iter<12** | 0.41 HI | 0.44 HI | 0.45 HI | 0.53 HI | 0.46 HI | 0.45 HI | 0.51 HI | — | 0.31 HI | 0.31 HI | 0.27 HI | 0.20 HI |
| **deprecat** | 0.23 HI | 0.21 HI | 0.21 HI | 0.24 HI | 0.22 HI | 0.21 HI | 0.28 HI | 0.31 HI | — | 0.38 HI | 0.43 HI | 0.14 HI |
| **iter12** | 0.31 HI | 0.32 HI | 0.28 HI | 0.29 HI | 0.27 HI | 0.27 HI | 0.34 HI | 0.31 HI | 0.38 HI | — | 0.35 HI | 0.28 HI |
| **cjs** | 0.24 HI | 0.20 HI | 0.25 HI | 0.26 HI | 0.25 HI | 0.22 HI | 0.22 HI | 0.27 HI | 0.43 HI | 0.35 HI | — | 0.14 HI |
| **iter24+** | 0.31 HI | 0.20 HI | 0.24 HI | 0.20 HI | 0.20 HI | 0.20 HI | 0.25 HI | 0.20 HI | 0.14 HI | 0.28 HI | 0.14 HI | — |

## Top recommended MEDIUM-cost bridges (Stage 3 shim targets)

Highest-leverage candidates for adapter-shim implementation. Each shim potentially unlocks `combinedEngineCount` engines for cross-cohort re-use.

| Rank | From → To | Score | Domain | Shape | Combined engines |
|---:|---|---:|---:|---:|---:|
| 1 | esm → esm | 0.584 | 0.154 | 0.966 | 1872 |
| 2 | esm → esm | 0.584 | 0.154 | 0.966 | 1872 |
| 3 | esm → mtime | 0.553 | 0.207 | 0.793 | 788 |
| 4 | mtime → esm | 0.553 | 0.207 | 0.793 | 788 |
| 5 | esm → mtime | 0.595 | 0.206 | 0.933 | 783 |
| 6 | mtime → esm | 0.595 | 0.206 | 0.933 | 783 |
| 7 | esm → mtime | 0.58 | 0.143 | 0.967 | 676 |
| 8 | mtime → esm | 0.58 | 0.143 | 0.967 | 676 |
| 9 | mtime → mtime | 0.787 | 0.69 | 0.903 | 507 |
| 10 | mtime → mtime | 0.787 | 0.69 | 0.903 | 507 |

## Top LOW-cost bridges (drop-in re-use, no shim needed)

| Rank | From → To | Score | Combined engines |
|---:|---|---:|---:|
| — | _no low-cost bridges found_ | — | — |

## How to use this

1. **For Stage 3** (lego adapter shim library): pick the top MEDIUM bridges. Each shim's API surface = intersection of the top shapes from both cohort profiles.
2. **For Stage 4** (bridge-auto-wire --shims): the JSON `topMediumCostBridges[]` is the input. Each entry becomes a synthetic edge `oldNode → shim → newNode` in the graph.
3. **For Stage 5** (cohort-drift-watch): the JSON `cohortOrder[]` is the baseline. Any new cohort appearing in a later Stage 1 run that isn't in this list = drift event.

## Re-run

```bash
node H:/prism/scripts/cohort-detector.mjs              # refresh Stage 1
node H:/prism/scripts/batch-compat-scorer.mjs           # refresh this artifact
node H:/prism/scripts/batch-compat-scorer.mjs --top 20  # more bridge candidates
```
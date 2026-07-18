---
name: reference_cimco_dialect_allowlists_2026_06_03
description: "CIMCO dialect G/M allowlists (U-CIMCO-DIALECT-ALLOWLISTS) — static post-proving lint mined from JM's own goldens; unobserved≠invalid"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.516Z
aliases: reference_cimco_dialect_allowlists_2026_06_03
---


# CIMCO dialect G/M allowlists — U-CIMCO-DIALECT-ALLOWLISTS (slot:echo, 2026-06-03)

**What shipped** (`cad-fusion-live-ms0`, CIMCO-INTEGRATION-MS0): the STATIC arm of post-proving that works OFFLINE today (no live CIMCO app) — lint a generated post's G/M-code vocabulary against the codes JM actually used in its proven goldens for that controller dialect.

- **Data:** `state/shared/cimco/dialect-allowlists.json` (schemaVersion 1.0.0). **Builder/lint:** `scripts/cimco-dialect-allowlist.mjs` (CLI `build|summary|families|lint <file> [family]`, 10 tests, fail-loud loader). **Wired:** `CimcoVerificationBridgeEngine.dialectAllowlist()` + `dialectLint()` → `prism_cimco` actions `cimco_dialect_allowlist` + `cimco_dialect_lint` (dispatcher 9→11).

**First build:** 706 goldens scanned → 5 families: `okuma-osp` 224f/33G/23M · `prism` 388f/33G/23M (PRISM's own emitted posts already live in the corpus) · `hurco` 35f/28G/25M · `mastercam` 6f/24G/9M · `mitsubishi-edm` 2f/9G/14M. Files bucketed by the **same** content-based `detectDialect()` the lint uses → a candidate is checked against the family it would itself classify into (builder/lint consistency).

**Honest framing (R12) — the key design call:** this is a WHITELIST OF OBSERVED codes, NOT a controller spec. A code absent from JM goldens is `unobserved-in-JM-goldens (review)`, NOT "invalid" — JM may simply never have used it. The lint SURFACES novel codes for a human / live-sim to confirm and NEVER fails a post on its own. Comment-stripped extraction (`G99` inside `(...)` is not counted); leading-zero normalized (`G01→G1`, `M03→M3`).

**Fail-loud:** loader throws on missing/corrupt JSON; `dialectLint` on an unknown family (or one with no allowlist) returns `hasAllowlist:false` + explicit "NOT a pass" note — never a silent green. Engine TS methods (`_detectDialect`, `_extractCodes`, lint) are faithful ports of the `.mjs` canonical, parity-asserted in the engine test.

**Tests:** `cimco-dialect-allowlist.test.mjs` 10/10 (comment-safe extract, fixture build, lint REVIEW + pass + fail-loud-unknown-family, real-corpus integration) + bridge engine 38/38. tsc-clean.

**Why this matters for the goal:** completes the offline static proving path — byte-equivalence-vs-golden (drift audit, now honest) + dialect-allowlist lint. A PRISM post emitting a G-code no JM golden ever used for that controller is now flagged before it reaches the machine. The live collision verdict still needs `U-CIMCO-UIA-REPORT-READER` (operator-gated, running licensed app).

Wiki: [[cimco-verification-simulation-integration]]. Siblings: [[reference_cimco_navmap_2026_06_03]] · [[reference_cimco_launch_probe_2026_06_03]] · [[reference_cimco_drift_grouping_bug_2026_06_03]].

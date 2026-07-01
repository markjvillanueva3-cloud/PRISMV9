---
name: reference_oscar_lathe_master_post_gate_disabled_2026_05_29
description: FINDING — .claude/hooks/lathe-master-post-quality-gate.mjs is short-circuited dead (DISABLED_TOKEN_REDUX_2026_04_23); a lathe master-post output gate (grep-indicated to include G96/G50 CSS-cap checks) is not firing. Whiskey/golf decide re-enable.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.691Z
aliases: reference_oscar_lathe_master_post_gate_disabled_2026_05_29
---


# lathe-master-post-quality-gate is DISABLED on disk (found 2026-05-29, slot:oscar)

While building oscar's SFC quality-gate awareness map (`scripts/sfc-awareness-snapshot.mjs` → `discoverQualityGates`), the enabled-state detector surfaced that **`.claude/hooks/lathe-master-post-quality-gate.mjs` is short-circuited dead**: its head carries `// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited…` followed by an unconditional `process.stdout.write({continue:true}); process.exit(0);` BEFORE any hook logic. It was disabled in the **2026-04-23 token-reduction sweep** (the `TOKEN_REDUX` idiom), not because it was broken.

## Why it matters
The gate is named + git-grep-indicated to validate **lathe master-post output incl. the G96/G50 CSS max-RPM cap** — a safety-adjacent check ([[feedback_oscar_css_g50_cap_mandatory]], soul refuse #5: css-rewrite-without-g50-rpm-cap). With the gate dead, that **post-output** validation isn't firing.

**Not a critical exposure (defense-in-depth holds):** the CSS/G50 RPM cap is ALSO enforced at **calc-time** in the 9-axis orchestrator (clamp step 5, per the oscar tribal tip + whiskey's `u-okuma-lathe-g50-check`). So a missing G50 would still be caught upstream of the post. The disabled gate removes the *post-output lint* layer, not the only layer.

## Action
- **Surfaced** (not fixed): the SFC awareness surface (`SFC-AWARENESS.md` → "Quality gates protecting this domain") now renders it `⚠ disabled` + a "Present but DISABLED (re-enable, do NOT rebuild)" line; the wiki [[sfc-awareness-and-gates]] notes it.
- **Decision belongs to whiskey (lathe) + golf (hygiene/settings):** re-enabling was a deliberate token-reduction call — do NOT unilaterally re-enable or rebuild. If re-enabled, verify it still passes the token-budget rationale that disabled it.
- This is one of MANY hooks disabled in the 2026-04-23 TOKEN_REDUX sweep — a fleet-wide audit of safety-adjacent disabled hooks may be worth a golf unit.

Cross-refs: [[reference_oscar_sfc_quality_gate_ecosystem_2026_05_29]] · [[feedback_oscar_css_g50_cap_mandatory]] · [[reference_whiskey_lathe_soul_designation_2026_05_27]].
